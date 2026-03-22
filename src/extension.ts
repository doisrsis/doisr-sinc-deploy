import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import { exec } from 'child_process';
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

    const rootPath = getRootPath();
    if (!rootPath) return;

    // ── Confirmação de segurança ────────────────────────────────────────
    if (config.confirm) {
      const answer = await vscode.window.showWarningMessage(
        `Doisr Deploy: Sincronizar workspace inteiro com "${name}" (${config.host})?`,
        { modal: true },
        'Sim, sincronizar'
      );
      if (answer !== 'Sim, sincronizar') {
        outputChannel.logInfo(`[${name}] Sincronização cancelada pelo usuário.`);
        return;
      }
    }

    outputChannel.show();

    // ── Build Pré-Sync ──────────────────────────────────────────────────
    if (config.build) {
      outputChannel.logInfo(`[${name}] Executando build: ${config.build}`);
      statusBar.working('Build em andamento...');

      const buildSuccess = await new Promise<boolean>((resolve) => {
        exec(config.build!, { cwd: rootPath, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
          if (stdout) { outputChannel.logInfo(`[${name}] Build stdout:\n${stdout.slice(-2000)}`); }
          if (stderr) { outputChannel.logInfo(`[${name}] Build stderr:\n${stderr.slice(-2000)}`); }
          if (error) {
            outputChannel.logError(`[${name}] Build falhou! Sync cancelado.`, error.message);
            statusBar.error('Build falhou');
            vscode.window.showErrorMessage(`Doisr Deploy: Build falhou — ${error.message}`);
            resolve(false);
          } else {
            outputChannel.logSuccess(`[${name}] Build concluído com sucesso!`);
            resolve(true);
          }
        });
      });

      if (!buildSuccess) { return; }
    }

    // ── Determinar pasta-fonte do sync ───────────────────────────────────
    let syncRoot = rootPath;
    if (config.build && config.buildOutputDir) {
      syncRoot = path.join(rootPath, config.buildOutputDir);
      if (!fs.existsSync(syncRoot)) {
        outputChannel.logError(`[${name}] Pasta de saída do build não encontrada: ${config.buildOutputDir}`);
        vscode.window.showErrorMessage(`Doisr Deploy: Pasta ${config.buildOutputDir} não existe após o build.`);
        return;
      }
      outputChannel.logInfo(`[${name}] Sincronizando apenas a pasta de build: ${config.buildOutputDir}`);
    }

    outputChannel.logInfo(`[${name}] Iniciando Sincronização COMPLETA${config.build ? ' (pós-build)' : ''}...`);

    const scanDir = async (dir: string) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        if (await isIgnore(config, fullPath)) { continue; }

        if (fs.statSync(fullPath).isDirectory()) {
          await scanDir(fullPath);
        } else {
          const relativePath = path.relative(syncRoot, fullPath);
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

    await scanDir(syncRoot);
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

    // Confirmação de segurança para upload via menu de contexto
    if (config.confirm) {
      const answer = await vscode.window.showWarningMessage(
        `Doisr Deploy: Enviar para "${name}" (${config.host})?`,
        'Sim', 'Não'
      );
      if (answer !== 'Sim') {
        outputChannel.logInfo(`[${name}] Upload cancelado pelo usuário.`);
        return;
      }
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

        // Confirmação de segurança para uploads automáticos
        if (config.confirm) {
          const answer = await vscode.window.showWarningMessage(
            `Doisr Deploy: Enviar "${relativePath}" para "${name}" (${config.host})?`,
            'Sim', 'Não'
          );
          if (answer !== 'Sim') {
            outputChannel.logInfo(`[${name}] Upload cancelado pelo usuário: ${relativePath}`);
            continue;
          }
        }

        outputChannel.logInfo(`[${name}] ${source === 'watch' ? 'Modificação detectada (Watcher)' : 'Salvamento detectado'}: ${relativePath}`);
        statusBar.working(`↑ ${name}: ${relativePath}`);

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

  // ── Handler: Deleção Remota Sincronizada ──────────────────────────────
  const handleFileDelete = async (filePath: string) => {
    if (filePath.includes('.git') || filePath.includes('node_modules') || filePath.includes('.vscode')) { return; }

    const configs = await getConfigManager();
    if (!configs) { return; }

    for (const [name, config] of Object.entries(configs)) {
      if (!config.deleteRemote) { continue; }

      const ignored = await isIgnore(config, filePath);
      if (ignored) { continue; }

      const rootPath = getRootPath(filePath);
      if (!filePath.startsWith(rootPath)) { continue; }

      const relativePath = path.relative(rootPath, filePath);
      const remotePath = path.posix.join(config.remotePath || '/', getNormalPath(relativePath));

      // Confirmação de segurança para deleção remota
      if (config.confirm) {
        const answer = await vscode.window.showWarningMessage(
          `Doisr Deploy: Deletar "${relativePath}" do servidor "${name}" (${config.host})?`,
          { modal: true },
          'Sim, deletar'
        );
        if (answer !== 'Sim, deletar') {
          outputChannel.logInfo(`[${name}] Deleção remota cancelada pelo usuário: ${relativePath}`);
          continue;
        }
      }

      outputChannel.logInfo(`[${name}] Deleção detectada — removendo do servidor: ${relativePath}`);

      TaskQueue.addTask({
        config,
        configName: name,
        localPath: filePath,
        remotePath: remotePath,
        operationType: 'delete',
        isDirectory: false
      });
    }
  };

  // ── Comando: Adicionar Servidor ──────────────────────────────────────
  let disposableAddServer = vscode.commands.registerCommand('doisr.addServer', async () => {
    const rootPath = getRootPath();
    if (!rootPath) return;

    const configPath = path.join(rootPath, 'doisr_deploy.jsonc');

    const serverName = await vscode.window.showInputBox({
      prompt: 'Nome do servidor (ex: homologacao, producao, cliente_x)',
      placeHolder: 'homologacao',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) { return 'O nome não pode ser vazio'; }
        if (/\s/.test(value)) { return 'Use underscores ao invés de espaços'; }
        return null;
      }
    });
    if (!serverName) { return; }

    const newServerBlock = `
  ,
  "${serverName}": {
    "type": "ftp",
    "host": "ftp.seusite.com.br",
    "port": 21,
    "username": "seu_usuario",
    "password": "sua_senha",
    "secure": true,
    "remotePath": "/",

    "upload_on_save": false,
    "watch": false,
    "deleteRemote": false,
    "confirm": true,
    "default": false,

    "excludePath": [
      ".git",
      "node_modules",
      "doisr_deploy.jsonc"
    ]
  }`;

    if (!fs.existsSync(configPath)) {
      await getConfigManager();
      return;
    }

    const content = fs.readFileSync(configPath, 'utf-8');
    const lastBrace = content.lastIndexOf('}');
    if (lastBrace === -1) { return; }

    const secondLastBrace = content.lastIndexOf('}', lastBrace - 1);
    if (secondLastBrace === -1) { return; }

    const newContent = content.slice(0, secondLastBrace + 1) + newServerBlock + '\n' + content.slice(lastBrace);
    fs.writeFileSync(configPath, newContent, 'utf-8');

    const document = await vscode.workspace.openTextDocument(configPath);
    await vscode.window.showTextDocument(document);
    treeDataProvider.refresh();

    vscode.window.showInformationMessage(`Servidor "${serverName}" adicionado! Preencha os dados de conexão.`);
  });
  context.subscriptions.push(disposableAddServer);

  // Listener: File System Watcher
  const watcher = vscode.workspace.createFileSystemWatcher('**/*');

  watcher.onDidChange(uri => {
    if (uri.scheme === 'file') { handleFileChange(uri.fsPath, 'watch'); }
  });
  watcher.onDidCreate(uri => {
    if (uri.scheme === 'file') { handleFileChange(uri.fsPath, 'watch'); }
  });
  watcher.onDidDelete(uri => {
    if (uri.scheme === 'file') { handleFileDelete(uri.fsPath); }
  });

  context.subscriptions.push(watcher);
}

export function deactivate() {
  statusBar.dispose();
  outputChannel.clear();
}
