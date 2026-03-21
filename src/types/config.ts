export type TargetType = 'ftp' | 'sftp';

export interface SyncConfigItem {
  // Configuração de Conexão
  type: TargetType;
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKeyPath?: string;
  remotePath: string;

  // Comportamento
  upload_on_save?: boolean;
  watch?: boolean;
  default?: boolean;
  excludePath?: string[];
}

export type OperationType = 'upload' | 'download' | 'delete' | 'rename';

export interface Task {
  config: SyncConfigItem;
  configName: string; // Nome da config no jsonc (ex: "producao")
  localPath: string;
  remotePath: string;
  operationType: OperationType;
  isDirectory: boolean;
  
  // Status da Tarefa
  progress?: number;
  error?: string;
  start?: string;
  end?: string;
  useTime?: string;
  fileSize?: number;
  fileSizeText?: string;
  retries?: number;
}
