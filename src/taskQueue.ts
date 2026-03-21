import * as async from 'async';
import * as vscode from 'vscode';
import { Task, SyncConfigItem } from './types/config';
import { FtpClient } from './ftpClient';
import { outputChannel } from './output';
import { statusBar } from './statusBar';

export class TaskQueue {
  private static queues: { [key: string]: async.QueueObject<Task> } = {};
  
  // Limites por configuração
  private static CONCURRENCY = 2; // Para FTP não sobrecarregar
  private static MAX_RETRIES = 3;

  public static addTask(task: Task) {
    const configName = task.configName;
    
    if (!this.queues[configName]) {
      this.queues[configName] = async.queue(this.processTask.bind(this), this.CONCURRENCY);

      this.queues[configName].drain(() => {
        outputChannel.logSuccess(`[${configName}] Todas as tarefas concluídas!`);
        statusBar.idle();
        vscode.window.showInformationMessage('Doisr Deploy: Sincronização concluída com sucesso!');
      });
    }

    statusBar.addPending();
    this.queues[configName].push(task, (err) => {
      statusBar.removePending();
      if (err) {
        outputChannel.logError(`A tarefa ${task.operationType} para ${task.localPath} falhou definitivamente.`, err);
      }
    });
  }

  private static async processTask(task: Task) {
    let client: FtpClient | null = null;
    const execute = async (t: Task) => {
      try {
        if (t.config.type === 'ftp') {
          client = new FtpClient(t.config);
          await client.connect();
          
          if (t.operationType === 'upload') {
             outputChannel.logInfo(`[${t.configName}] Subindo: ${t.localPath}`);
             await client.uploadFile(t);
          } else if (t.operationType === 'delete') {
             outputChannel.logInfo(`[${t.configName}] Removendo: ${t.remotePath}`);
             await client.remove(t);
          }
          
          await client.close();
        }
        
      } catch (error: any) {
        if (client) {
          try { await client.close(); } catch(e){}
        }

        task.retries = (task.retries || 0) + 1;
        if (task.retries < this.MAX_RETRIES) {
          outputChannel.logError(`[${task.configName}] Erro na tarefa. Tentando de novo (${task.retries}/${this.MAX_RETRIES})...`, error.message);
          // throw para forçar o async.queue a chamar a função de erro, mas aqui vamos lidar manualmente 
          // ou re-colocar na fila
          await new Promise(r => setTimeout(r, 2000));
          await execute(task); 
        } else {
          outputChannel.logError(`[${task.configName}] Falha permanente na tarefa após ${this.MAX_RETRIES} tentativas.`, error.message);
          throw error;
        }
      }
    };

    await execute(task);
  }
}
