import Client from 'ssh2-sftp-client';
import * as fs from 'fs-extra';
import * as path from 'path';
import { SyncConfigItem, Task } from './types/config';
import { outputChannel } from './output';
import { getNormalPath } from './utils';
import { statusBar } from './statusBar';

export class SftpClient {
  private client: Client;
  private config: SyncConfigItem;

  constructor(config: SyncConfigItem) {
    this.client = new Client();
    this.config = config;
  }

  public async connect() {
    try {
      if (this.config.host) {
        outputChannel.logInfo(`Conectando ao SFTP: ${this.config.host}:${this.config.port || 22}`);
        
        await this.client.connect({
          host: this.config.host,
          port: this.config.port || 22,
          username: this.config.username,
          password: this.config.password,
          privateKey: this.config.privateKeyPath ? fs.readFileSync(this.config.privateKeyPath) : undefined
        });
      }
    } catch (err: any) {
      throw new Error(`Falha ao conectar SFTP: ${err.message}`);
    }
  }

  public async uploadFile(task: Task) {
    statusBar.working('Upload SFTP...');
    let { localPath, remotePath } = task;
    
    remotePath = getNormalPath(remotePath);
    const remoteDirPath = path.posix.dirname(remotePath);

    try {
      // Garante que o diretório remoto exista
      const dirExists = await this.client.exists(remoteDirPath);
      if (!dirExists) {
        await this.client.mkdir(remoteDirPath, true);
      }

      const fileStat = fs.statSync(localPath);
      task.fileSize = fileStat.size;

      // Realiza o upload (fastPut costuma ser mais rápido e lida bem com arquivos grandes no sfpt)
      await this.client.fastPut(localPath, remotePath, {
        step: (total_transferred: number, chunk: number, total: number) => {
           if (total > 0) {
             const percent = Math.min(((total_transferred / total) * 100), 100).toFixed(1);
             statusBar.working(`Upload SFTP: ${percent}%`);
           }
        }
      });

      statusBar.idle();
    } catch (err) {
      statusBar.idle();
      throw err;
    }
  }

  public async remove(task: Task) {
    statusBar.working('Removendo SFTP...');
    const remotePath = getNormalPath(task.remotePath);
    try {
      const exists = await this.client.exists(remotePath);
      if (exists === '-') {
        await this.client.delete(remotePath);
      } else if (exists === 'd') {
        await this.client.rmdir(remotePath, true);
      }
      statusBar.idle();
    } catch (err) {
      statusBar.idle();
      throw err;
    }
  }

  public async close() {
    try {
      await this.client.end();
    } catch (e) {
      // Ignora erro silenciando o close
    }
  }
}
