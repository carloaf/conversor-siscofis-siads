# Instalação do Conversor SISCOFIS-SIADS no Servidor do CTA

**Data:** 12/05/2026  
**Servidor:** VM-7CTA-11CGCFEX-APP-CONVERSOR-SISCOFIS-SIADS-PRODUCAO  
**IP:** 10.166.68.89  
**Acesso:** via Teleport (tsh)

---

## Ambiente do Servidor

| Item | Detalhe |
|---|---|
| Hostname | VM-7CTA-11CGCFEX-APP-CONVERSOR-SISCOFIS-SIADS-PRODUCAO |
| IP | 10.166.68.89 |
| SO | Linux (Ubuntu/Debian) |
| Docker | v29.4.3 |
| Docker Compose | v5.1.3 (plugin) |
| Git | `/usr/bin/git` |
| Aplicação | `/opt/conversor-siscofis-siads/` |
| Container | `conversor-siscofis-siads` |
| Porta | 3000/TCP |

## Situação Validada em 13/05/2026

- O servidor já possui Git instalado em `/usr/bin/git`; não é necessário instalar o pacote.
- O deploy em produção foi convertido para clone Git em `/opt/conversor-siscofis-siads/`.
- O comando `git pull --ff-only origin dev` já funciona no servidor.
- A aplicação Docker roda a partir de `/opt/conversor-siscofis-siads/conversor-siscofis-siads/`.
- O repositório é público em HTTPS; para leitura, o servidor não depende de credencial adicional.
- No servidor, a porta `22/TCP` para `github.com` está bloqueada, mas SSH para `ssh.github.com:443` funciona caso a deploy key precise ser usada no futuro.

## Habilitar Deploy por Git

### 1. Chave de deploy criada no servidor

Foi criada uma chave dedicada para o usuário `suporte` em:

```bash
/home/suporte/.ssh/id_ed25519_github_deploy
```

Fingerprint da chave pública:

```bash
SHA256:xFL1nlZxShAd75LUuCr+1drXyJowrmykHAfdFVUxWzU
```

Para copiar a chave pública e cadastrá-la no GitHub:

```bash
tsh ssh --insecure suporte@VM-7CTA-11CGCFEX-APP-CONVERSOR-SISCOFIS-SIADS-PRODUCAO \
    'cat ~/.ssh/id_ed25519_github_deploy.pub'
```

Cadastrar em `Settings > Deploy keys` do repositório `carloaf/conversor-siscofis-siads`.
Usar permissão somente leitura se o servidor apenas fizer `pull`.

### 2. Configuração SSH do servidor para usar porta 443

O usuário `suporte` foi configurado para acessar o GitHub por `ssh.github.com:443`:

```sshconfig
Host github.com
    HostName ssh.github.com
    Port 443
    User git
    IdentityFile ~/.ssh/id_ed25519_github_deploy
    IdentitiesOnly yes
```

### 3. Converter a pasta atual em um clone Git

Como o repositório é público em HTTPS, o servidor consegue fazer `git pull` sem credencial adicional. A deploy key acima continua válida como opção de endurecimento, mas não é obrigatória para leitura.

Substituir a cópia extraída por um clone real do repositório, preservando os dados persistentes:

```bash
tsh ssh --insecure root@VM-7CTA-11CGCFEX-APP-CONVERSOR-SISCOFIS-SIADS-PRODUCAO bash << 'EOF'
set -e

cd /opt
backup_dir="conversor-siscofis-siads.backup-$(date +%Y%m%d-%H%M%S)"
mv conversor-siscofis-siads "$backup_dir"

git clone -b dev https://github.com/carloaf/conversor-siscofis-siads.git \
    /opt/conversor-siscofis-siads

rm -rf /opt/conversor-siscofis-siads/conversor-siscofis-siads/data \
       /opt/conversor-siscofis-siads/conversor-siscofis-siads/output \
       /opt/conversor-siscofis-siads/conversor-siscofis-siads/uploads

cp -a "/opt/$backup_dir/data" /opt/conversor-siscofis-siads/conversor-siscofis-siads/
cp -a "/opt/$backup_dir/output" /opt/conversor-siscofis-siads/conversor-siscofis-siads/
cp -a "/opt/$backup_dir/uploads" /opt/conversor-siscofis-siads/conversor-siscofis-siads/

chown -R suporte:suporte /opt/conversor-siscofis-siads
EOF
```

### 4. Atualizar por git pull

Com a pasta já clonada:

```bash
tsh ssh --insecure suporte@VM-7CTA-11CGCFEX-APP-CONVERSOR-SISCOFIS-SIADS-PRODUCAO \
    'cd /opt/conversor-siscofis-siads && git pull --ff-only origin dev && cd conversor-siscofis-siads && docker compose up --build -d'
```

Se o `pull` falhar com `Permission denied (publickey)`, a deploy key ainda não foi cadastrada no GitHub ou foi cadastrada no repositório errado.

### 4.1 Fluxo recomendado: commit local, push e atualização no servidor

Fluxo operacional para futuras alterações:

```bash
# 1. Na máquina local, revisar alterações
cd /home/augusto/workspace/SIADS
git status

# 2. Commitar e enviar para o GitHub
git add conversor-siscofis-siads/Dockerfile \
        conversor-siscofis-siads/docker-compose.yml \
        README.md \
        GUIA_PRATICAS_SEGURAS.md \
        .github/prompts/prompt_ai.prompt.md \
        INSTALACAO_SERVIDOR_CTA.md
git commit -m "Corrige deploy Docker no CTA"
git push origin dev

# 3. No servidor, atualizar código e aplicar deploy
tsh ssh --insecure suporte@VM-7CTA-11CGCFEX-APP-CONVERSOR-SISCOFIS-SIADS-PRODUCAO \
    'cd /opt/conversor-siscofis-siads && git pull --ff-only origin dev && cd conversor-siscofis-siads && docker compose up --build -d'
```

Validação após o `pull`:

```bash
tsh ssh --insecure suporte@VM-7CTA-11CGCFEX-APP-CONVERSOR-SISCOFIS-SIADS-PRODUCAO \
    'docker ps --filter name=conversor-siscofis-siads --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" && curl -I -s http://localhost:3000 | head -n 8'
```

### 5. Recuperar build e publicação da porta 3000

No servidor CTA, o `Dockerfile` não deve instalar pacotes Alpine extras para esse projeto e o `docker-compose.yml` precisa usar `build.network: host`, pois o build padrão do Docker não resolve `registry.npmjs.org` nesse ambiente.

Se a aplicação subir, mas a porta `3000` não aparecer em `docker ps`, o daemon Docker perdeu as chains de NAT do `iptables`. Recuperação:

```bash
tsh ssh --insecure root@VM-7CTA-11CGCFEX-APP-CONVERSOR-SISCOFIS-SIADS-PRODUCAO \
    'systemctl restart docker'

tsh ssh --insecure suporte@VM-7CTA-11CGCFEX-APP-CONVERSOR-SISCOFIS-SIADS-PRODUCAO \
    'cd /opt/conversor-siscofis-siads/conversor-siscofis-siads && docker compose down && docker compose up -d --force-recreate'
```

Validação esperada:

```bash
tsh ssh --insecure suporte@VM-7CTA-11CGCFEX-APP-CONVERSOR-SISCOFIS-SIADS-PRODUCAO \
    'docker ps --filter name=conversor-siscofis-siads --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" && curl -I -s http://10.166.68.89:3000 | head -n 8'
```

---

## Pré-requisitos (máquina local)

- Cabo de rede conectado (rede `10.133.x.x`) — necessário para acessar o proxy Teleport
- `tsh` (cliente Teleport) v14.3.20 instalado em `/usr/local/bin/tsh`
- Entrada no `/etc/hosts`: `10.166.65.239 teleport.7cta.eb.mil.br`

---

## Passo a Passo Realizado

### 1. Instalar o cliente Teleport (tsh)

A versão do tsh deve ser compatível com o servidor Teleport (v14.3.20).

```bash
curl -fsSL -o /tmp/teleport-v14.tar.gz \
  https://cdn.teleport.dev/teleport-v14.3.20-linux-amd64-bin.tar.gz
tar -xzf /tmp/teleport-v14.tar.gz -C /tmp/
sudo cp /tmp/teleport/tsh /usr/local/bin/tsh
```

### 2. Adicionar o proxy Teleport ao /etc/hosts

Como o DNS interno não resolve fora do cabo, adicionar manualmente:

```bash
echo "10.166.65.239 teleport.7cta.eb.mil.br" | sudo tee -a /etc/hosts
```

### 3. Fazer login no Teleport

Com o cabo conectado:

```bash
tsh login --proxy=teleport.7cta.eb.mil.br:443 --user=aloysio.souza@eb.mil.br --insecure
```

Autenticação interativa via browser ou OTP. Sessão válida por ~12 horas.

### 4. Empacotar o projeto

```bash
cd /home/sonnote/Documents/SIADS
tar -czf /tmp/conversor-siscofis-siads.tar.gz \
    --exclude="node_modules" --exclude=".git" --exclude="uploads/*" \
    conversor-siscofis-siads/
```

### 5. Copiar arquivos para o servidor

A cópia via SCP foi feita com o usuário `suporte` (usuário `root` não tinha permissão de escrita em `/tmp` via tsh):

```bash
tsh scp --insecure /tmp/conversor-siscofis-siads.tar.gz \
    suporte@VM-7CTA-11CGCFEX-APP-CONVERSOR-SISCOFIS-SIADS-PRODUCAO:/tmp/
```

### 6. Executar deploy no servidor como root

```bash
tsh ssh --insecure root@VM-7CTA-11CGCFEX-APP-CONVERSOR-SISCOFIS-SIADS-PRODUCAO bash << 'EOF'
set -e

# Instalar Docker
curl -fsSL https://get.docker.com | bash
systemctl enable docker
systemctl start docker

# Extrair projeto
mkdir -p /opt
tar -xzf /tmp/conversor-siscofis-siads.tar.gz -C /opt/
cd /opt/conversor-siscofis-siads

# Criar diretórios e arquivo de usuários
mkdir -p uploads output data
[ -f data/users.json ] || echo '[]' > data/users.json

# Build e start do container
docker compose up --build -d
EOF
```

### 7. Abrir porta no firewall do servidor

```bash
tsh ssh --insecure root@VM-7CTA-11CGCFEX-APP-CONVERSOR-SISCOFIS-SIADS-PRODUCAO \
    "ufw allow 3000/tcp && ufw status | grep 3000"
```

### 8. Verificar container em execução

```bash
tsh ssh --insecure suporte@VM-7CTA-11CGCFEX-APP-CONVERSOR-SISCOFIS-SIADS-PRODUCAO \
    "docker ps && curl -s http://localhost:3000 | head -2"
```

Resposta esperada: `Found. Redirecting to /login.html`

---

## Acesso à Aplicação

### Via túnel Teleport (único método disponível — firewall de rede bloqueia acesso direto)

O firewall corporativo bloqueia conexões da rede `10.133.x.x` para `10.166.68.89` em todas as portas TCP. O acesso é feito via túnel SSH pelo Teleport:

```bash
tsh ssh --insecure -L 3000:localhost:3000 \
    suporte@VM-7CTA-11CGCFEX-APP-CONVERSOR-SISCOFIS-SIADS-PRODUCAO -N &
```

Acesse: **http://localhost:3000**

### Acesso direto (pendente)

Foi solicitado ao TI a liberação da porta `3000/TCP` de `10.133.0.0/22` para `10.166.68.89`.  
Quando liberada, o acesso será direto em: **http://10.166.68.89:3000**

---

## Renovar Sessão Teleport (após expirar)

```bash
tsh login --proxy=teleport.7cta.eb.mil.br:443 --user=aloysio.souza@eb.mil.br --insecure
```

---

## Re-deploy (atualizações futuras)

Para atualizar a aplicação no servidor:

```bash
tsh ssh --insecure suporte@VM-7CTA-11CGCFEX-APP-CONVERSOR-SISCOFIS-SIADS-PRODUCAO \
    'cd /opt/conversor-siscofis-siads && git pull --ff-only origin dev && cd conversor-siscofis-siads && docker compose up --build -d'
```

Se houver mudanças apenas de infraestrutura Docker e o container ficar sem portas publicadas, usar a recuperação da seção 5 antes de repetir o `docker compose up -d`.

---

## Estrutura no Servidor

```
/opt/conversor-siscofis-siads/
├── .git/                   # Clone Git para git pull
├── conversor-siscofis-siads/
│   ├── src/                # Código-fonte Node.js
│   ├── public/             # Interface web (HTML)
│   ├── config/             # Configurações da app
│   ├── templates/          # Template de saída TXT
│   ├── uploads/            # PDFs enviados (bind-mount)
│   ├── output/             # TXTs gerados (bind-mount)
│   ├── data/
│   │   └── users.json      # Usuários cadastrados (bind-mount)
│   ├── Dockerfile
│   └── docker-compose.yml
└── INSTALACAO_SERVIDOR_CTA.md
```
