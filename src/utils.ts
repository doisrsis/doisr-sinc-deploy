import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import { minimatch } from 'minimatch';
import { SyncConfigItem } from './types/config';

// Guarda o contexto global para acesso em utils
let globalContext: vscode.ExtensionContext;
export function setContext(context: vscode.ExtensionContext) {
  globalContext = context;
}
export function getContext() {
  return globalContext;
}

export function getRootPath(file: string = ""): string {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    if (file && workspaceFolders.length > 1) {
      // Tenta achar a qual workspace o arquivo pertence
      const folder = workspaceFolders.find(f => file.startsWith(f.uri.fsPath));
      return folder ? folder.uri.fsPath : workspaceFolders[0].uri.fsPath;
    }
    return workspaceFolders[0].uri.fsPath;
  }
  return "";
}

export function getNormalPath(p: string): string {
  return p.replace(/\\/g, '/');
}

export function debounce(func: Function, wait: number, immediate: boolean = false) {
  let timeout: NodeJS.Timeout | null;
  return function (this: any, ...args: any[]) {
    const context = this;
    const later = function () {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    const callNow = immediate && !timeout;
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Verifica se um arquivo deve ser ignorado com base na configuração da extensão (+ gitignore)
export async function isIgnore(config: SyncConfigItem, filePath: string): Promise<boolean> {
  const rootPath = getRootPath(filePath);
  const relativePath = getNormalPath(path.relative(rootPath, filePath));
  
  let ignoreRules: string[] = [];

  // 1. Regras do excludePath nativo (da config da extensão)
  if (config.excludePath && Array.isArray(config.excludePath)) {
    ignoreRules = [...ignoreRules, ...config.excludePath];
  }

  // 2. Lê o .gitignore da raiz do projeto, se existir
  const gitignorePath = path.join(rootPath, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const data = fs.readFileSync(gitignorePath, 'utf-8');
    const rules = data
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
    ignoreRules = [...ignoreRules, ...rules];
  }

  // Adiciona regras com /** no final para suportar pastas corretamente
  let finalRules: string[] = [];
  ignoreRules.forEach(rule => {
    finalRules.push(rule);
    finalRules.push(path.join(rule, '**'));
    finalRules.push(path.join('**', rule));
    finalRules.push(path.join('**', rule, '**'));
  });

  // Unique rules
  finalRules = [...new Set(finalRules)];

  // NUNCA ignora nossa própria config
  if (relativePath === 'doisr_deploy.jsonc') return true; 

  const isMatched = finalRules.some(rule => {
    let normalizedRule = getNormalPath(rule);
    if (normalizedRule.startsWith('!')) {
       return false; // lidar melhor com ignore de ignore
    }
    return minimatch(relativePath, normalizedRule, { dot: true });
  });

  return isMatched;
}
