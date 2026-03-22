# Doisr Deploy - Sincronização Ágil FTP/SFTP

Bem-vindo ao **Doisr Deploy**, a sua extensão oficial e definitiva para sincronização ágil de arquivos diretamente do seu editor (Antigravity, Windsurf ou VS Code) para servidores remotos!

Desenvolvida com o propósito de acelerar o desenvolvimento de sites PHP, WordPress e sistemas legado que dependem de FTP/SFTP, a extensão trabalha silenciosamente e de forma inteligente para que você se preocupe apenas com seu código.

---

## 🚀 Principais Funcionalidades

### 🔁 Upload On Save & Watcher Nativo
Ative o modo automático e a extensão fará o upload instantâneo do seu arquivo para o servidor a cada `Ctrl + S`. Mais do que isso: o modo `watch: true` permite que arquivos gerados por compiladores em background (como Webpack, SCSS ou Babel) sejam detectados e enviados automaticamente, mesmo que você não abra o arquivo!

### 🗑️ Deleção Remota Sincronizada
Com `"deleteRemote": true`, ao deletar um arquivo local (mover para a lixeira), a extensão conecta no FTP/SFTP e **remove o arquivo correspondente no servidor automaticamente**. Seu servidor nunca mais acumula lixo de arquivos antigos.

### ⚙️ Build Pré-Sync
Configure `"build": "npm run build"` e `"buildOutputDir": "dist"` para que o botão **Sincronizar Workspace** execute o comando de build antes do envio. Após a compilação, **apenas a pasta de saída** é sincronizada com o servidor — automatização real de deploy para projetos Vue, React, Vite, Webpack e SCSS.

### 🔒 FTP & Explicit SFTP Integrados
Suporte a servidores legados (FTP puro na porta 21), FTPS seguro com `"secure": true` (padrão) que ignora certificados autoassinados comuns em painéis como cPanel/WHM, e moderno protocolo SSH-SFTP na porta 22 com suporte nativo a Private Keys.

### 🌳 Explorador de Servidores (Painel Dedicado)
Não abra mais o FileZilla! A extensão possui um painel próprio na **Activity Bar** lateral do seu editor. Clique no ícone da nuvem e expanda seus servidores para explorar pastas e arquivos remotos em tempo real.

### ⚡ Botões Inline de Sincronização
No painel lateral, passe o mouse sobre o nome do servidor para acessar comandos rápidos:
- **[ 🔄 ] Sincronizar Workspace**: Varre todos os arquivos do seu repositório local e envia tudo para o FTP numa tacada só (respeitando o que está no seu ignore). Se `build` estiver configurado, compila antes.
- **[ ⚙️ ] Editar Configuração**: Atalho rápido para configurar novos ambientes de homologação ou produção.

### 📁 Upload de Pastas Inteiras
Com a estrutura local aberta via explorador padrão, clique com o botão direito numa pasta cheia de arquivos e escolha **"Doisr Deploy (Sincronizar) > Fazer Upload"**. A varredura recursiva enfileira tudo e envia sem dor de cabeça.

### 🖥️ Multi-Servidor
Configure quantos servidores quiser no mesmo arquivo. Cada chave raiz é um ambiente separado (produção, homologação, cliente X). Se vários tiverem `upload_on_save: true`, o arquivo é enviado para **todos** ao salvar.

---

## 🛠️ Configuração Rápida (Getting Started)

1. Abra seu projeto no VS Code / Windsurf.
2. Pressione `Ctrl + Shift + P` (Command + Shift + P no Mac).
3. Digite e selecione: **`Doisr Deploy: Adicionar Configuração`**.
4. O arquivo `doisr_deploy.jsonc` nascerá no seu projeto. Ajuste com os seus dados:

```jsonc
{
  "producao": {
    "type": "ftp",                // ou "sftp"
    "host": "ftp.seusite.com.br",
    "port": 21,
    "username": "usuario@site",
    "password": "senha",
    "secure": true,               // Mude para "implicit" se der erro ECONNRESET, ou false para sem TLS
    "remotePath": "/public_html",

    "upload_on_save": true,       // Upload instantâneo ao salvar
    "watch": false,               // Ignorado quando upload_on_save=true
    "deleteRemote": true,         // Ao deletar local, deleta no servidor também
    "default": true,              // Config padrão para menu de contexto

    // Build Pré-Sync (opcional) — usado pelo botão "Sincronizar Workspace"
    // "build": "npm run build",       // Comando de build antes do sync
    // "buildOutputDir": "dist",       // Pasta gerada que será enviada ao FTP

    "excludePath": [
      ".git",
      "node_modules",
      "doisr_deploy.jsonc"
    ]
  }
}
```

### Múltiplos Servidores

Basta adicionar outra chave ao JSON:

```jsonc
{
  "producao": {
    "type": "ftp",
    "host": "servidor-producao.com.br",
    // ...
    "default": true
  },
  "homologacao": {
    "type": "sftp",
    "host": "servidor-homolog.com.br",
    // ...
    "default": false
  }
}
```

---

## 📋 Referência de Configuração

| Chave | Tipo | Padrão | Descrição |
|---|---|---|---|
| `type` | `"ftp"` \| `"sftp"` | — | Protocolo de conexão |
| `host` | `string` | — | Endereço do servidor |
| `port` | `number` | — | Porta (21 para FTP, 22 para SFTP) |
| `username` | `string` | — | Usuário de acesso |
| `password` | `string` | — | Senha de acesso |
| `privateKeyPath` | `string` | — | Caminho da chave privada (SFTP) |
| `secure` | `boolean` \| `"implicit"` | `true` | Conexão TLS/SSL |
| `remotePath` | `string` | — | Pasta raiz no servidor |
| `upload_on_save` | `boolean` | `true` | Upload automático ao salvar |
| `watch` | `boolean` | `false` | Detectar modificações de terceiros |
| `deleteRemote` | `boolean` | `true` | Deletar no servidor ao deletar local |
| `default` | `boolean` | — | Config padrão para menu de contexto |
| `build` | `string` | — | Comando de build pré-sync |
| `buildOutputDir` | `string` | — | Pasta de saída do build |
| `excludePath` | `string[]` | — | Caminhos a ignorar |

---

## 🤝 Logs e Resolução de Problemas

Você pode acompanhar todos os eventos silenciosos! Clique no botão de upload na barra de rodapé (Status Bar) para abrir a aba dedicada **Output > Doisr Deploy**.

*Todo o status da fila de envio, erros de conexão SSL e reconexões (máximo de 3 tentativas para evitar timeouts de hospedagem) são minuciosamente documentados lá.*

### Problemas Comuns

| Problema | Solução |
|---|---|
| `ECONNRESET` ao conectar | Troque `"secure"` para `"implicit"` ou `false` |
| Arquivo não sobe ao salvar | Verifique se `upload_on_save` está `true` e o arquivo não está no `excludePath` |
| Build falha no sync | Verifique se o comando em `"build"` funciona no terminal |
| Pasta de build não encontrada | Confirme que `"buildOutputDir"` aponta para a pasta correta |

---

**Autor:** Rafael Dias - [doisr.com.br](https://doisr.com.br)
*Documentado em Março de 2026.*
