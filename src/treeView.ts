import * as vscode from 'vscode';
import * as path from 'path';
import { SyncConfigItem } from './types/config';
// @ts-ignore
import { getConfigManager } from './configManager';

import { FtpClient } from './ftpClient';
import { SftpClient } from './sftpClient';
import { outputChannel } from './output';

export class ServerItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly config?: SyncConfigItem,
    public readonly remotePath?: string,
    public readonly isServerRoot: boolean = false
  ) {
    super(label, collapsibleState);
    
    if (isServerRoot && config) {
      this.tooltip = `${config.type.toUpperCase()} - ${config.host}`;
      this.iconPath = new vscode.ThemeIcon(config.type === 'sftp' ? 'lock' : 'server-environment');
      this.description = config.host;
      this.contextValue = 'serverRoot';
    } else if (remotePath) {
      this.tooltip = remotePath;
      this.iconPath = new vscode.ThemeIcon(collapsibleState === vscode.TreeItemCollapsibleState.None ? 'file' : 'folder');
      this.contextValue = collapsibleState === vscode.TreeItemCollapsibleState.None ? 'remoteFile' : 'remoteFolder';
    }
  }
}

export class DoisrDeployTreeDataProvider implements vscode.TreeDataProvider<ServerItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ServerItem | undefined | void> = new vscode.EventEmitter<ServerItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<ServerItem | undefined | void> = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ServerItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ServerItem): Promise<ServerItem[]> {
    if (element) {
      // Estamos requisitando arquivos de um diretório remoto ou a raiz do servidor
      if (!element.config) return [];
      
      const currentPath = element.remotePath || element.config.remotePath || '/';
      let client: FtpClient | SftpClient | null = null;
      
      try {
        if (element.config.type === 'ftp') client = new FtpClient(element.config);
        else client = new SftpClient(element.config);

        await client.connect();
        const items = await client.listDir(currentPath);
        await client.close();

        // Ordena: Pastas primeiro
        items.sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        });

        return items.map(i => new ServerItem(
          i.name,
          i.isDirectory ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
          element.config, // Passa a config de forma "herdada" para os filhos
          i.path,
          false
        ));
        
      } catch (err: any) {
        if (client) { try { await client.close(); } catch(e){} }
        outputChannel.logError('Erro ao listar diretório remoto', err.message);
        vscode.window.showErrorMessage(`Falha ao ler o diretório remoto. Erro: ${err.message}`);
        return [];
      }

    } else {
      // Raiz: Lê o arquivo doisr_deploy.jsonc e lista as chaves
      const configs = await getConfigManager();
      if (!configs) {
         return Promise.resolve([
           new ServerItem('Nenhuma configuração encontrada', vscode.TreeItemCollapsibleState.None)
         ]);
      }

      const servers: ServerItem[] = [];
      for (const [name, config] of Object.entries(configs)) {
        // Agora os servidores são fechados por padrão (Collapsed) para permitir explorar pastas
        servers.push(new ServerItem(name, vscode.TreeItemCollapsibleState.Collapsed, config, undefined, true));
      }

      return Promise.resolve(servers);
    }
  }
}

