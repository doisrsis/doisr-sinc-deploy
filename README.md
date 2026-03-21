# Doisr Deploy - Sincronização Ágil FTP/SFTP

Bem-vindo ao **Doisr Deploy**, a sua extensão oficial e definitiva para sincronização ágil de arquivos diretamente do seu editor (Antigravity, Windsurf ou VS Code) para servidores remotos!

Desenvolvida com o propósito de acelerar o desenvolvimento de sites PHP, WordPress e sistemas legado que dependem de FTP/SFTP, a extensão trabalha silenciosamente e de forma inteligente para que você se preocupe apenas com seu código.

---

## 🚀 Principais Funcionalidades

### 🔁 Upload On Save & Watcher Nativo
Ative o modo automático e a extensão fará o upload instanteâneo do seu arquivo para o servidor a cada `Ctrl + S`. Mais do que isso: o modo `watch: true` permite que arquivos gerados por compiladores em background (como Webpack, SCSS ou Babel) sejam detectados e enviados automaticamente, mesmo que você não abra o arquivo!

### 🔒 FTP & Explicit SFTP Integrados
Suporte a servidores legados (FTP puro na porta 21), FTPS seguro que ignora certificados autoassinados comuns em painéis como cPanel/WHM (`"secure": true`) e moderno protocolo SSH-SFTP na porta 22 com suporte nativo a Private Keys.

### 🌳 Explorador de Servidores (Painel Dedicado)
Não abra mais o FileZilla! A extensão possui um painel próprio na **Activity Bar** lateral do seu editor. Clique no ícone da nuvem e expanda seus servidores para explorar pastas e arquivos remotos em tempo real.

### ⚡ Botões Inline de Sincronização
No painel lateral, passe o mouse sobre o nome do servidor para acessar comandos rápidos:
- **[ 🔄 ] Sincronizar Workspace**: Varre todos os arquivos do seu repositório local e envia tudo para o FTP numa tacada só (respeitando o que está no seu ignore).
- **[ ⚙️ ] Editar Configuração**: Atalho rápido para configurar novos ambientes de homologação ou produção.

### 📁 Upload de Pastas Inteiras
Com a estrutura local aberta via explorador padrão, clique com o botão direito numa pasta cheia de arquivos e escolha **"Doisr Deploy (Sincronizar) > Fazer Upload"**. A varredura recursiva enfileira tudo e envia sem dor de cabeça.

---

## 🛠️ Configuração Rápida (Getting Started)

1. Abra seu projeto no VS Code.
2. Pressione `Ctrl + Shift + P` (Command + Shift + P no Mac).
3. Digite e selecione: **`Doisr Deploy: Adicionar Configuração`**.
4. O arquivo global `doisr_deploy.jsonc` nascerá no seu projeto. Ajuste com os seus dados:

```jsonc
{
  "producao": {
    "type": "ftp",
    "host": "ftp.seusite.com.br",
    "port": 21,
    "username": "usuario@site",
    "password": "senha",
    "secure": false, // Troque para true se o host exigir FTPS/TLS
    "remotePath": "/public_html", 

    "upload_on_save": true, // Liga o upload instantâneo
    "watch": true,          // Detecta modificações de terceiros no diretório inteiro
    "default": true,
    
    // Suporte total a ignorar git e node modules - super rápido!
    "excludePath": [
      ".git",
      "node_modules",
      "doisr_deploy.jsonc"
    ]
  }
}
```

---

## 🤝 Logs e Resolução de Problemas
Você pode acompanhar todos os eventos silenciosos! Clique no botão de upload na barra de rodapé (Status Bar) para abrir a aba dedicada **Output > Doisr Deploy**. 

*Todo o status da fila de envio, erros de conexão SSL e reconexões (máximo de 3 tentativas para evitar timeouts de hospedagem) são minuciosamente documentados lá.*

---

**Autor:** Rafael Dias - [doisr.com.br](https://doisr.com.br)
*Documentado em Março de 2026.*
