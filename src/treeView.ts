import * as vscode from 'vscode';
import * as path from 'path';
import { SyncConfigItem } from './types/config';
// @ts-ignore
import { getConfigManager } from './configManager';

export class ServerItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly config?: SyncConfigItem
  ) {
    super(label, collapsibleState);
    this.tooltip = config ? `${config.type.toUpperCase()} - ${config.host}` : this.label;
    
    // Define o ícone dependendo se é FTP ou SFTP
    if (config) {
      this.iconPath = new vscode.ThemeIcon(config.type === 'sftp' ? 'lock' : 'server-environment');
      this.description = config.host;
    } else {
      this.iconPath = new vscode.ThemeIcon('folder');
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
      // Se tivermos clicado num servidor, poderíamos listar os arquivos
      // No momento, apenas os servidores (raiz) são mostrados
      return Promise.resolve([]);
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
        servers.push(new ServerItem(name, vscode.TreeItemCollapsibleState.None, config));
      }

      return Promise.resolve(servers);
    }
  }
}
