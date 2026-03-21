import * as vscode from 'vscode';
import dayjs from 'dayjs';

class OutputManager {
  private channel: vscode.OutputChannel;

  constructor() {
    this.channel = vscode.window.createOutputChannel('Doisr Deploy');
  }

  public show(preserveFocus: boolean = true) {
    this.channel.show(preserveFocus);
  }

  public appendLine(message: string) {
    const time = dayjs().format('HH:mm:ss');
    this.channel.appendLine(`[${time}] ${message}`);
  }

  public logSuccess(message: string) {
    this.appendLine(`✅ ${message}`);
  }

  public logError(message: string, error?: any) {
    this.appendLine(`❌ ${message}`);
    if (error) {
       this.channel.appendLine(`   Detalhes: ${error.toString()}`);
    }
  }

  public logInfo(message: string) {
    this.appendLine(`ℹ️ ${message}`);
  }

  public clear() {
    this.channel.clear();
  }
}

export const outputChannel = new OutputManager();
