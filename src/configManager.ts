import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
// @ts-ignore
import { parse } from 'jsonc-parser';
import { SyncConfigItem } from './types/config';
import { getRootPath } from './utils';
import { outputChannel } from './output';

export async function getConfigManager(): Promise<{ [key: string]: SyncConfigItem } | null> {
  const rootPath = getRootPath();
  if (!rootPath) return null;

  const configPath = path.join(rootPath, 'doisr_deploy.jsonc');

  // Se o config não existe, cria um config base (wizard básico)
  if (!fs.existsSync(configPath)) {
    return createDefaultConfig(configPath);
  }

  try {
    const data = fs.readFileSync(configPath, 'utf-8');
    const parsedData = parse(data) as { [key: string]: SyncConfigItem };

    // Tratamento para garantir defaults
    for (const key in parsedData) {
      if (parsedData.hasOwnProperty(key)) {
        parsedData[key] = {
          secure: true,
          upload_on_save: true,
          watch: false,
          deleteRemote: true,
          confirm: false,
          excludePath: ['.git', 'node_modules', '*.log'],
          ...parsedData[key]
        };
      }
    }

    return parsedData;

  } catch (error) {
    vscode.window.showErrorMessage('Formato inválido no arquivo doisr_deploy.jsonc');
    outputChannel.logError('Erro de parse no jsonc da configuração', error);
    return null;
  }
}

async function createDefaultConfig(configPath: string): Promise<null> {
  const initialConfig = `{
  // Arquivo de configuração - doisr-deploy
  // Configure aqui seus ambientes de desenvolvimento/produção

  "producao": {
    "type": "ftp", // ou "sftp"
    "host": "ftp.seusite.com.br",
    "port": 21,
    "username": "seu_usuario",
    "password": "sua_senha",
    "secure": true, // Mude para "implicit" se der erro ECONNRESET, ou false para conexão sem TLS
    "remotePath": "/",  // Pasta no servidor onde os arquivos serão salvos

    "upload_on_save": true, // Sobe tudo que você salvar na hora
    "watch": false,         // Ignorado quando upload_on_save=true
    "deleteRemote": true,   // Ao deletar arquivo local, deleta no FTP também
    "confirm": false,       // Se true, pede confirmação antes de cada operação
    "default": true,        // Considerado como config padrão para menu de contexto

    // Build Pré-Sync (opcional) — usado pelo botão "Sincronizar Workspace"
    // "build": "npm run build",       // Comando de build a executar antes do sync
    // "buildOutputDir": "dist",       // Pasta gerada pelo build que será enviada ao FTP

    "excludePath": [
      ".git",
      "node_modules",
      "doisr_deploy.jsonc"
    ]
  }
}`;

  fs.writeFileSync(configPath, initialConfig, 'utf-8');

  const document = await vscode.workspace.openTextDocument(configPath);
  await vscode.window.showTextDocument(document);

  vscode.window.showInformationMessage('Arquivo de configuração doisr_deploy.jsonc criado. Preencha seus dados!');

  return null;
}

export async function getDefaultConfig(): Promise<{ name: string, config: SyncConfigItem } | null> {
  const configs = await getConfigManager();
  if (!configs) return null;

  let defaultName = '';
  let defaultConf: SyncConfigItem | null = null;

  for (const [name, conf] of Object.entries(configs)) {
    if (conf.default) {
      defaultName = name;
      defaultConf = conf;
      break;
    }
  }

  // Se não tem um "default: true", pega a primeira que existir
  if (!defaultConf) {
    const keys = Object.keys(configs);
    if (keys.length > 0) {
      defaultName = keys[0];
      defaultConf = configs[keys[0]];
    }
  }

  if (!defaultConf) {
    vscode.window.showErrorMessage('Nenhuma configuração encontrada no doisr_deploy.jsonc!');
    return null;
  }

  return { name: defaultName, config: defaultConf };
}
