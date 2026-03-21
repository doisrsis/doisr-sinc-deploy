import { Client } from 'basic-ftp';
import * as fs from 'fs-extra';
import * as path from 'path';
import { SyncConfigItem, Task } from './types/config';
import { outputChannel } from './output';
import { getNormalPath } from './utils';
import { statusBar } from './statusBar';
import * as dayjs from 'dayjs';

export class FtpClient {
  private client: Client;
  private config: SyncConfigItem;

  constructor(config: SyncConfigItem) {
    this.client = new Client();
    this.config = config;
  }

  public async connect() {
    try {
      if (this.config.host) {
        outputChannel.logInfo(`Conectando ao FTP: ${this.config.host}:${this.config.port || 21}`);
        await this.client.access({
          host: this.config.host,
          port: this.config.port || 21,
          user: this.config.username,
          password: this.config.password,
          secure: false // Ajustável no futuro
        });
      }
    } catch (err) {
      throw err;
    }
  }

  public async uploadFile(task: Task) {
    statusBar.working('Upload FTP...');
    let { localPath, remotePath } = task;
    
    // Remote path deve usar barras normais
    remotePath = getNormalPath(remotePath);
    const remoteDirPath = path.posix.dirname(remotePath);

    try {
      // Garante que o diretório remoto exista
      await this.client.ensureDir(remoteDirPath);
      
      const fileStat = fs.statSync(localPath);
      task.fileSize = fileStat.size;

      // Monitora o progresso
      this.client.trackProgress(info => {
        if (info.type === 'upload') {
           const percent = Math.min(((info.bytes / fileStat.size) * 100), 100).toFixed(1);
           statusBar.working(`Upload: ${percent}%`);
        }
      });

      await this.client.uploadFrom(localPath, remotePath);
      this.client.trackProgress(); // Desliga o tracking

      statusBar.idle();
    } catch (err) {
      this.client.trackProgress();
      statusBar.idle();
      throw err;
    }
  }

  public async remove(task: Task) {
    statusBar.working('Removendo FTP...');
    const remotePath = getNormalPath(task.remotePath);
    try {
      // Tentar remover como arquivo. Se for pasta, não vai func. (Por ora, focaremos em arquivos)
      await this.client.remove(remotePath);
      statusBar.idle();
    } catch (err) {
      statusBar.idle();
      throw err;
    }
  }

  public async close() {
    this.client.close();
  }
}
