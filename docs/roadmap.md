# Roadmap: Doisr Deploy Extension

Este roadmap define o planejamento de desenvolvimento da extensão para VS Code, Antigravity e Windsurf, focada em sincronização FTP/SFTP.

## Visão Geral
**Objetivo:** Criar uma extensão que facilite o deploy de arquivos diretamente da IDE para servidores FTP/SFTP, com suporte a upload automático ao salvar (\`upload_on_save\`), interface no painel e geração de logs.

## Fases de Desenvolvimento

### Fase 1: Fundação e FTP (Em andamento)
- [x] Configuração inicial do projeto (\`package.json\`, \`tsconfig.json\`)
- [x] Instalação de dependências (\`npm install\`)
- [ ] Criação dos comandos básicos de ativação
- [ ] Configuração do Output Channel para exibição de logs
- [ ] Leitura e validação do arquivo \`doisr_deploy.jsonc\`
- [ ] Cliente FTP utilizando \`basic-ftp\`
- [ ] Implementação de upload manual e \`upload_on_save\`
- [ ] Tratamento básico de exceções e ignorar arquivos (\`.gitignore\` e \`excludePath\`)

### Fase 2: Expansão (SFTP e Watcher)
- [ ] Adição de cliente SFTP protegido com \`ssh2-sftp-client\`
- [ ] Suporte a chaves SSH
- [ ] Implementar modo \`watch\` para arquivos que mudam fora do editor (ex: compilação de assets)

### Fase 3: Interface Gráfica (TreeView)
- [ ] Adicionar aba lateral dedicada "Doisr Deploy"
- [ ] Mostrar status dos servidores e fila de upload
- [ ] Navegação visual dos arquivos remotos e locais

### Fase 4: Polimento, Otimização e Distribuição
- [ ] Refatoração de código para máxima performance
- [ ] Otimização de envio (compressão, envios paralelos parciais)
- [ ] Ajuste no cache e gerenciamento de sessões para evitar timeouts
- [ ] Empacotamento final com \`vsce package\`
- [ ] Testes finais de estresse

---
*Documento gerado e mantido em conformidade com as boas práticas de desenvolvimento.*
*Autor e Data de Atualização: Rafael Dias - doisr.com.br (2026-03-21)*
