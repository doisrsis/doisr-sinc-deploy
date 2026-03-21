import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
// @ts-ignore
import { getConfigManager, getDefaultConfig } from './configManager';
import { outputChannel } from './output';
import { setContext, getRootPath, isIgnore, debounce, getNormalPath } from './utils';
import { statusBar } from './statusBar';
import { TaskQueue } from './taskQueue';
import { DoisrDeployTreeDataProvider, ServerItem } from './treeView';

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

  let disposableClearCache = vscode.commands.registerCommand('doisr.clearCache', () => {
    outputChannel.clear();
    statusBar.idle();
    vscode.window.showInformationMessage('Cache e logs do Doisr Deploy limpos.');
  });
  context.subscriptions.push(disposableClearCache);

  // Registro da TreeView (Aba Lateral)
  const treeDataProvider = new DoisrDeployTreeDataProvider();
  vscode.window.registerTreeDataProvider('doisrDeployServers', treeDataProvider);

  let disposableRefresh = vscode.commands.registerCommand('doisr.refreshServers', () => {
    treeDataProvider.refresh();
  });
  context.subscriptions.push(disposableRefresh);

  let disposableEditConfig = vscode.commands.registerCommand('doisr.editConfig', async () => {
    const rootPath = getRootPath();
    if (rootPath) {
      const configPath = path.join(rootPath, 'doisr_deploy.jsonc');
      if (fs.existsSync(configPath)) {
        const document = await vscode.workspace.openTextDocument(configPath);
        await vscode.window.showTextDocument(document);
      }
    }
  });
  context.subscriptions.push(disposableEditConfig);

  let disposableSyncServer = vscode.commands.registerCommand('doisr.syncServer', async (item: ServerItem) => {
    if (!item.config) return;
    const { label: name, config } = item;
    
    // Varredura de todo o workspace enviando apenas os que não estiverem no isIgnore
    const rootPath = getRootPath();
    if (!rootPath) return;

    outputChannel.show();
    outputChannel.logInfo(`[${name}] Iniciando Sincronização COMPLETA do Workspace...`);

    const scanDir = async (dir: string) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        if (await isIgnore(config, fullPath)) continue;

        if (fs.statSync(fullPath).isDirectory()) {
          await scanDir(fullPath);
        } else {
          const relativePath = path.relative(rootPath, fullPath);
          const remotePath = path.posix.join(config.remotePath || '/', getNormalPath(relativePath));

          TaskQueue.addTask({
            config,
            configName: name,
            localPath: fullPath,
            remotePath: remotePath,
            operationType: 'upload',
            isDirectory: false
          });
        }
      }
    };

    await scanDir(rootPath);
  });
  context.subscriptions.push(disposableSyncServer);

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
    
    // Função para enfileirar arquivos
    const queueFile = (filePath: string) => {
      const rootPath = getRootPath(filePath);
      const relativePath = path.relative(rootPath, filePath);
      const remotePath = path.posix.join(config.remotePath || '/', getNormalPath(relativePath));

      TaskQueue.addTask({
        config,
        configName: name,
        localPath: filePath,
        remotePath: remotePath,
        operationType: 'upload',
        isDirectory: false
      });
    };

    if (stat.isDirectory()) {
      // Varredura recursiva de diretório
      outputChannel.logInfo(`[${name}] Preparando upload do diretório: ${fsPath}`);
      
      const scanDir = (dir: string) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          if (fs.statSync(fullPath).isDirectory()) {
            scanDir(fullPath);
          } else {
            queueFile(fullPath);
          }
        }
      };
      
      scanDir(fsPath);
      return;
    }

    // Se for arquivo único
    queueFile(fsPath);
  });
  context.subscriptions.push(disposableUploadFile);

  // Anti-duplicação e throttling por arquivo
  const filePending = new Set<string>();
  const handleFileChange = async (filePath: string, source: 'save' | 'watch') => {
    // Escapa arquivos virtuais ou de lixo muito rápido
    if (filePath.includes('.git') || filePath.includes('node_modules') || filePath.includes('.vscode')) return;

    if (filePending.has(filePath)) return;
    filePending.add(filePath);
    
    setTimeout(async () => {
      filePending.delete(filePath);
      
      try {
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) return; // Por ora, ignorar subida de pastas isoladas
      } catch (e) {
        return; // Arquivo deletado não deve subir
      }

      const configs = await getConfigManager();
      if (!configs) return;

      for (const [name, config] of Object.entries(configs)) {
        if (source === 'save' && !config.upload_on_save && !config.watch) continue;
        if (source === 'watch' && !config.watch) continue;

        const ignored = await isIgnore(config, filePath);
        if (ignored) continue;

        const rootPath = getRootPath(filePath);
        if (!filePath.startsWith(rootPath)) continue; 

        const relativePath = path.relative(rootPath, filePath);
        const remotePath = path.posix.join(config.remotePath || '/', getNormalPath(relativePath));

        outputChannel.logInfo(`[${name}] ${source === 'watch' ? 'Modificação detectada (Watcher)' : 'Salvamento detectado'}: ${relativePath}`);

        TaskQueue.addTask({
          config,
          configName: name,
          localPath: filePath,
          remotePath: remotePath,
          operationType: 'upload',
          isDirectory: false
        });
      }
    }, 500); // 500ms debounce
  };

  // Listener: On Save Document
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document) => {
       if (document.uri.scheme !== 'file') return;
       handleFileChange(document.uri.fsPath, 'save');
    })
  );

  // Listener: File System Watcher
  const watcher = vscode.workspace.createFileSystemWatcher('**/*');
  
  watcher.onDidChange(uri => {
    if (uri.scheme === 'file') handleFileChange(uri.fsPath, 'watch');
  });
  watcher.onDidCreate(uri => {
    if (uri.scheme === 'file') handleFileChange(uri.fsPath, 'watch');
  });
  
  context.subscriptions.push(watcher);
}

export function deactivate() {
  statusBar.dispose();
  outputChannel.clear();
}
