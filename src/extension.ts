import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
// @ts-ignore
import { getConfigManager, getDefaultConfig } from './configManager';
import { outputChannel } from './output';
import { setContext, getRootPath, isIgnore, debounce, getNormalPath } from './utils';
import { statusBar } from './statusBar';
import { TaskQueue } from './taskQueue';

export function activate(context: vscode.ExtensionContext) {
  setContext(context);
  outputChannel.logInfo('Doisr Deploy (Fase 1) ativado com sucesso!');

  // Comando: Adicionar / Editar Config
  let disposableAddConfig = vscode.commands.registerCommand('doisr.addConfig', async () => {
    outputChannel.show();
    await getConfigManager(); // Cria o jsonc se não existir e avisa o usuário
  });
  context.subscriptions.push(disposableAddConfig);

  // Comando: Mostrar Logs
  let disposableShowOutput = vscode.commands.registerCommand('doisr.showOutput', () => {
    outputChannel.show(true);
  });
  context.subscriptions.push(disposableShowOutput);

  // Comando: Limpar Logs/Cache
  let disposableClearCache = vscode.commands.registerCommand('doisr.clearCache', () => {
    outputChannel.clear();
    statusBar.idle();
    vscode.window.showInformationMessage('Cache e logs do Doisr Deploy limpos.');
  });
  context.subscriptions.push(disposableClearCache);

  // Comando: Upload via Menu de Contexto
  let disposableUploadFile = vscode.commands.registerCommand('doisr.uploadFile', async (uri: vscode.Uri) => {
    if (!uri) return;
    
    outputChannel.show();
    const defaultConfig = await getDefaultConfig();
    if (!defaultConfig) return;

    const { name, config } = defaultConfig;
    if (config.type !== 'ftp') {
      outputChannel.logError(`[${name}] A Fase 1 suporta apenas FTP.`);
      return;
    }

    const fsPath = uri.fsPath;
    const stat = fs.statSync(fsPath);
    
    if (stat.isDirectory()) {
      // Implementação futura de upload de diretório
      vscode.window.showWarningMessage('Upload de diretório será implementado em breve. Selecione arquivos.');
      return;
    }

    // Gerar caminho remoto (ex: /public_html/src/index.html)
    const rootPath = getRootPath(fsPath);
    const relativePath = path.relative(rootPath, fsPath);
    const remotePath = path.posix.join(config.remotePath || '/', getNormalPath(relativePath));

    TaskQueue.addTask({
      config,
      configName: name,
      localPath: fsPath,
      remotePath: remotePath,
      operationType: 'upload',
      isDirectory: false
    });
  });
  context.subscriptions.push(disposableUploadFile);

  // Listener: On Save Document
  const onSave = debounce(async (document: vscode.TextDocument) => {
    const filePath = document.uri.fsPath;
    const configs = await getConfigManager();
    if (!configs) return;

    for (const [name, config] of Object.entries(configs)) {
      if (!config.upload_on_save) continue; // Ignora se não é on-save
      if (config.type !== 'ftp') continue;  // Fase 1 só lida com ftp

      // Checa ignorados (.gitignore + excludePath)
      const ignored = await isIgnore(config, filePath);
      if (ignored) {
         outputChannel.logInfo(`Arquivo ignorado (não subirá automaticamente): ${filePath}`);
         continue;
      }

      const rootPath = getRootPath(filePath);
      if (!filePath.startsWith(rootPath)) continue; // Fora do workspace

      const relativePath = path.relative(rootPath, filePath);
      const remotePath = path.posix.join(config.remotePath || '/', getNormalPath(relativePath));

      outputChannel.logInfo(`[${name}] Detectado salvamento em: ${relativePath}`);

      TaskQueue.addTask({
        config,
        configName: name,
        localPath: filePath,
        remotePath: remotePath,
        operationType: 'upload',
        isDirectory: false
      });
    }
  }, 800);

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document) => {
       // Evita arquivos virtuais (output, git, etc)
       if (document.uri.scheme !== 'file') return;
       onSave(document);
    })
  );
}

export function deactivate() {
  statusBar.dispose();
  outputChannel.clear();
}
