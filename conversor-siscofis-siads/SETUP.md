# Guia de Instalação - PDF Extractor App

## Passo 1: Instalar Node.js e npm

### Opção A: Usando apt (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install nodejs npm -y
```

Verificar instalação:
```bash
node --version   # deve mostrar v14.x ou superior
npm --version    # deve mostrar 6.x ou superior
```

### Opção B: Usando nvm (Recomendado para desenvolvimento)

```bash
# Instalar nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Recarregar o shell
source ~/.bashrc

# Instalar Node.js versão 18 (LTS)
nvm install 18
nvm use 18
nvm alias default 18
```

Verificar instalação:
```bash
node --version   # deve mostrar v18.x
npm --version    # deve mostrar 9.x ou superior
```

## Passo 2: Instalar Dependências do Projeto

```bash
cd /home/augusto/workspace/SIADS/conversor-siscofis-siads

# Usar o script de instalação
./install.sh

# OU instalar manualmente
npm install
```

## Passo 3: Executar a Aplicação

### Modo de Produção

```bash
npm start
```

### Modo de Desenvolvimento (com hot-reload)

```bash
npm run dev
```

A aplicação estará disponível em: **http://localhost:3000**

## Passo 4: Testar a Aplicação

### Via Interface Web

1. Abra o navegador em `http://localhost:3000`
2. Faça upload de um arquivo PDF
3. Aguarde o processamento
4. Baixe o arquivo TXT gerado

### Via cURL (linha de comando)

```bash
# Fazer upload de um PDF
curl -X POST http://localhost:3000/api/upload \
  -F "pdf=@/caminho/para/seu/arquivo.pdf"

# Verificar health check
curl http://localhost:3000/health

# Listar arquivos processados
curl http://localhost:3000/api/upload/files
```

## Opção Alternativa: Docker

Se preferir usar Docker (não requer Node.js instalado):

```bash
# Build da imagem
docker-compose build

# Iniciar containers
docker-compose up

# Ou em background
docker-compose up -d
```

Para parar:
```bash
docker-compose down
```

## Estrutura de Diretórios Criados

Ao executar a aplicação, os seguintes diretórios serão criados automaticamente:

```
conversor-siscofis-siads/
├── uploads/    # PDFs temporários (são deletados após processamento)
└── output/     # Arquivos TXT gerados
```

## Comandos Úteis

```bash
# Ver logs em tempo real (Docker)
docker-compose logs -f

# Parar a aplicação (Ctrl+C no terminal)

# Limpar arquivos temporários
rm -rf uploads/* output/*

# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install
```

## Troubleshooting

### Erro: "EADDRINUSE: address already in use"

A porta 3000 já está em uso. Opções:

1. Parar o processo que está usando a porta:
```bash
lsof -i :3000
kill -9 <PID>
```

2. Ou mudar a porta no arquivo `config/app.config.js`:
```javascript
PORT: process.env.PORT || 3001,
```

### Erro: "Cannot find module"

Reinstale as dependências:
```bash
rm -rf node_modules
npm install
```

### Erro de permissão

```bash
chmod -R 755 uploads output
```

## Próximos Passos

1. ✅ Instalar Node.js
2. ✅ Instalar dependências
3. ✅ Executar aplicação
4. ✅ Testar upload de PDF
5. ✅ Verificar arquivo TXT gerado

## Suporte

Para problemas ou dúvidas, verifique:
- Os logs da aplicação
- O arquivo README.md
- Os exemplos de uso na documentação
