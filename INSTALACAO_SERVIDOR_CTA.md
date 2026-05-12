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
| Aplicação | `/opt/conversor-siscofis-siads/` |
| Container | `conversor-siscofis-siads` |
| Porta | 3000/TCP |

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
cd /home/sonnote/Documents/SIADS

# 1. Empacotar
tar -czf /tmp/conversor-siscofis-siads.tar.gz \
    --exclude="node_modules" --exclude=".git" --exclude="uploads/*" \
    conversor-siscofis-siads/

# 2. Copiar para o servidor
tsh scp --insecure /tmp/conversor-siscofis-siads.tar.gz \
    suporte@VM-7CTA-11CGCFEX-APP-CONVERSOR-SISCOFIS-SIADS-PRODUCAO:/tmp/

# 3. Reinstalar no servidor
tsh ssh --insecure root@VM-7CTA-11CGCFEX-APP-CONVERSOR-SISCOFIS-SIADS-PRODUCAO << 'EOF'
cd /opt/conversor-siscofis-siads
docker compose down
tar -xzf /tmp/conversor-siscofis-siads.tar.gz -C /opt/
docker compose up --build -d
EOF
```

---

## Estrutura no Servidor

```
/opt/conversor-siscofis-siads/
├── src/                    # Código-fonte Node.js
├── public/                 # Interface web (HTML)
├── config/                 # Configurações da app
├── templates/              # Template de saída TXT
├── uploads/                # PDFs enviados (bind-mount)
├── output/                 # TXTs gerados (bind-mount)
├── data/
│   └── users.json          # Usuários cadastrados (bind-mount)
├── Dockerfile
└── docker-compose.yml
```
