import * as vscode from 'vscode';

class StatusBarManager {
  private statusBarItem: vscode.StatusBarItem;
  private pendingCount: number = 0;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.statusBarItem.command = 'doisr.showOutput';
    this.idle();
  }

  public idle() {
    this.pendingCount = 0;
    this.statusBarItem.text = '$(cloud) Doisr Deploy';
    this.statusBarItem.tooltip = 'Pronto (Clique para ver os logs)';
    this.statusBarItem.backgroundColor = undefined;
    this.statusBarItem.show();
  }

  public working(message: string) {
    this.statusBarItem.text = `$(sync~spin) Doisr: ${message}`;
    this.statusBarItem.tooltip = 'Operação em andamento...';
    this.statusBarItem.backgroundColor = undefined;
  }

  public error(message: string) {
    this.statusBarItem.text = `$(error) Doisr: ${message}`;
    this.statusBarItem.tooltip = 'Ocorreu um erro nas transferências';
    this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
  }

  public addPending() {
    this.pendingCount++;
    this.updatePendingStatus();
  }

  public removePending() {
    if (this.pendingCount > 0) {
      this.pendingCount--;
    }
    this.updatePendingStatus();
  }

  private updatePendingStatus() {
    if (this.pendingCount > 0) {
      this.statusBarItem.text = `$(cloud-upload) Doisr: ${this.pendingCount} pendente(s)`;
    } else {
      this.idle();
    }
  }

  public dispose() {
    this.statusBarItem.dispose();
  }
}

export const statusBar = new StatusBarManager();
