# Doisr Deploy - Extensão de Sincronização

Bem-vindo à extensão **doisr-deploy**! 
Sincronize arquivos automaticamente com o servidor via FTP, direto do seu editor (Antigravity/Windsurf/VS Code).

## Instalação e Uso Inicial

1. Abra um projeto na sua IDE.
2. Pressione \`Ctrl + Shift + P\` (Command + Shift + P no Mac) e digite **\`Doisr Deploy: Adicionar Configuração\`**.
3. O arquivo \`doisr_deploy.jsonc\` será gerado na raiz do projeto. Preencha seus dados:

\`\`\`jsonc
{
  "producao": {
    "type": "ftp",
    "host": "ftp.seusite.com.br",
    "port": 21,
    "username": "usuario",
    "password": "senha",
    "remotePath": "/public_html", // Onde deve subir no servidor
    
    // Comportamento
    "upload_on_save": true,       // Salva e Sobe automaticamente!
    "watch": false,               // Desabilitado (Fase 1 usa on-save)
    "default": true,              // Usado pelo clique com o botão direito
    "excludePath": [
      ".git", "node_modules", "doisr_deploy.jsonc"
    ]
  }
}
\`\`\`

---

## 🚀 Funcionalidades 

### 1️⃣ Upload Automático (Magic Mode)
Deixe \`"upload_on_save": true\`.
Toda vez que você der \`Ctrl + S\` num arquivo, a extensão conecta silenciosamente, exibe o status no rodapé **(Doisr: Upload FTP...)** e envia para o servidor.

### 2️⃣ Ignorando arquivos
Você não quer subir \`node_modules\` via FTP!
A extensão respeita o seu \`.gitignore\` de forma automática.
Além dele, você pode colocar pastas que a extensão não deve subir direto no array \`"excludePath"\`. NUNCA deixe de ignorar a própria configuração (\`doisr_deploy.jsonc\`).

### 3️⃣ Upload Manual
- Vá na **Explorer lateral**.
- Clique com o botão direito num arquivo.
- Selecione **"Doisr Deploy (Sincronizar) > Fazer Upload"**.

### 4️⃣ Visualizando o que está acontecendo
No rodapé (Status Bar), você verá o andamento atual.
Para ver os Logs detalhados em caso de erro, clique no ícone \`$(cloud)\` ou aperte \`Ctrl+Shift+P\` > **"Doisr Deploy: Mostrar Logs"**.
O Output será focado num canal limpo e em pt-BR chamado "Doisr Deploy".

---
*Criado por Rafael Dias - doisr.com.br*
