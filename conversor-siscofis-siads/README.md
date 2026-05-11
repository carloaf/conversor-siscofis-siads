# Conversor-SISCOFIS-SIADS

Aplicação Node.js (Docker) para upload e extração de informações de arquivos PDF de **Inventário de Almoxarifado** (SISCOFIS), convertendo-os para o formato TXT de importação do **SIADS** (linhas H/D/T).

## 📋 Descrição

Processa PDFs gerados pelo SISCOFIS OM e gera arquivos `.txt` prontos para importação no SIADS, no formato Mat Consumo (H/D/T separados por `¥`).

## 🚀 Tecnologias

- **Node.js 14** — Runtime
- **Express** — Framework web
- **Multer** — Upload de arquivos
- **pdf-parse** — Extração de texto de PDF
- **Docker / Docker Compose** — Containerização

## 📦 Estrutura do Projeto

```
conversor-siscofis-siads/
├── src/
│   ├── app.js                          # Servidor Express principal
│   ├── controllers/
│   │   └── uploadController.js         # Controlador de upload e processamento
│   ├── services/
│   │   ├── pdfExtractorService.js      # Extração de itens do PDF (regex UNID)
│   │   └── txtFormatterService.js      # Formatação H/D/T + sufixos NrFicha
│   ├── middlewares/
│   │   └── uploadMiddleware.js         # Multer config
│   ├── routes/
│   │   └── uploadRoutes.js             # Rotas da API
│   └── utils/
│       └── fileHandler.js              # Manipulação de arquivos
├── config/
│   └── app.config.js                   # Configurações da aplicação
├── public/
│   └── index.html                      # Interface web
├── output/                             # TXTs gerados (bind-mount ↔ host)
├── uploads/                            # PDFs temporários (bind-mount ↔ host)
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## 🔧 Instalação e Uso

### Com Docker (recomendado)

```bash
# Primeira vez ou após alterar código-fonte
docker compose up --build -d

# Nas próximas vezes
docker compose up -d
```

Acesse: **http://localhost:3000**

### Local (sem Docker)

```bash
npm install
npm start
```

## 📖 Como Usar

### Interface Web

1. Acesse `http://localhost:3000`
2. Faça upload do PDF de inventário (SISCOFIS)
3. Clique em **Processar PDF**
4. O arquivo `.txt` é gerado em `output/`

### API REST

```bash
# Upload e processamento
curl -X POST http://localhost:3000/api/upload -F "pdf=@INVENTARIO_HMAB.pdf"

# Listar arquivos gerados
curl http://localhost:3000/api/upload/files

# Health check
curl http://localhost:3000/health
```

## 📝 Formato de Saída (H/D/T)

```
H¥CO¥1¥52121¥<UASG>¥36899038315¥00001¥£
D¥SiadsId136002¥<NrFicha>¥<Descrição>¥<Unidade>¥115610100¥A1¥<Qtde>¥<ValorCentavos>¥TRUE¥£
T¥<ddMMyyyyHHmmss>¥<qtd_D>¥<soma_qtde>¥<soma_valor_centavos>¥FIM¥£
```

| Campo D | Origem |
|---|---|
| `SiadsId136002` | Fixo — código do almoxarifado |
| `NrFicha` | Coluna "Nr Ficha" do PDF; sufixo A/B/C se duplicado |
| `Descrição` | Coluna "ESPECIFICAÇÃO" do PDF |
| `Unidade` | Coluna "Unid Med/Cons" do PDF |
| `ValorCentavos` | VALOR TOTAL × 100 sem separadores |

## ⚠️ Problemas Conhecidos e Soluções

### Itens mesclados (linha D com "BOM" na descrição)

**Causa:** unidade de medida não reconhecida pelo regex `UNID`, fazendo o extrator concatenar múltiplos itens em uma linha.

**Verificação:**
```bash
python3 -c "
import re
with open('output/arquivo.txt') as f: lines = f.readlines()
bad = [i+1 for i,l in enumerate(lines)
       if l.startswith('D¥') and re.search(r'\s+BOM\s+\d+\s+', l.split('¥')[3] if len(l.split('¥'))>3 else '')]
print(f'Linhas mescladas: {len(bad)}', bad)
"
```

**Solução:** lista `UNID` em `pdfExtractorService.js` inclui agora:
`Metro Cubico, MetroQuadrado, Centímetro, Milímetro, Frasco, Ampola, Cápsula, Comprimido, Rolo, Par, Resma, Bobina, Barra, Galão, Bisnaga, Vidro, Kit, Dose, Sache, Lata, Cubo, ...`

Após alterar o código, rebuild obrigatório:
```bash
docker compose down && docker compose up --build -d
```

### NrFicha duplicados
Quando o mesmo Nr Ficha aparece em múltiplos itens, o formatador adiciona sufixo automático: `04006A`, `04006B`, etc.

## ⚙️ Configuração

```env
PORT=3000
UPLOADS_DIR=./uploads
OUTPUTS_DIR=./output
```

- **Tamanho máximo de arquivo:** 10 MB
- **Tipos aceitos:** PDF apenas

## 🐛 Troubleshooting

| Erro | Causa | Solução |
|---|---|---|
| "Apenas arquivos PDF são permitidos" | MIME type inválido | Verificar extensão e tipo do arquivo |
| "Erro ao extrair dados do PDF" | PDF corrompido ou apenas imagem | Usar PDF com texto seleccionável |
| Permissão negada em `uploads/` ou `output/` | Permissões de diretório | `chmod -R 755 uploads output` |
| Itens com "BOM" na descrição | Unidade não reconhecida | Ver seção "Itens mesclados" acima |

---

**Projeto:** Conversor-SISCOFIS-SIADS | **Versão:** 1.1.0 — Última atualização: 11/05/2026


## 📋 Descrição

Esta aplicação permite fazer upload de arquivos PDF contendo relatórios de Material de Consumo do Almoxarifado e extrair automaticamente as informações para um arquivo .txt formatado.

## 🚀 Tecnologias Utilizadas

- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **Multer** - Middleware para upload de arquivos
- **pdf-parse** - Biblioteca para extração de dados de PDF
- **Docker** - Containerização da aplicação

## 📦 Estrutura do Projeto

```
conversor-siscofis-siads/
├── src/
│   ├── app.js                          # Aplicação principal
│   ├── controllers/
│   │   └── uploadController.js         # Controlador de upload
│   ├── services/
│   │   ├── pdfExtractorService.js      # Serviço de extração de PDF
│   │   └── txtFormatterService.js      # Serviço de formatação TXT
│   ├── middlewares/
│   │   └── uploadMiddleware.js         # Middleware de upload
│   ├── routes/
│   │   └── uploadRoutes.js             # Rotas da API
│   └── utils/
│       └── fileHandler.js              # Utilitários de arquivo
├── config/
│   └── app.config.js                   # Configurações da aplicação
├── public/
│   └── index.html                      # Interface web
├── templates/
│   └── output-format.txt               # Template de formato de saída
├── uploads/                            # Diretório temporário de uploads
├── output/                             # Diretório de arquivos processados
├── tests/                              # Testes automatizados
├── Dockerfile                          # Dockerfile para build
├── docker-compose.yml                  # Configuração Docker Compose
├── package.json                        # Dependências do projeto
└── README.md                           # Este arquivo
```

## 🔧 Instalação

### Pré-requisitos

- Node.js 14+ 
- npm ou yarn
- Docker e Docker Compose (opcional)

### Instalação Local

1. Clone o repositório:
```bash
cd conversor-siscofis-siads
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente (opcional):
```bash
cp .env.example .env
```

4. Inicie a aplicação:
```bash
npm start
```

Ou em modo de desenvolvimento:
```bash
npm run dev
```

A aplicação estará disponível em: `http://localhost:3000`

### Instalação com Docker

1. Build da imagem:
```bash
docker-compose build
```

2. Inicie os containers:
```bash
docker-compose up
```

A aplicação estará disponível em: `http://localhost:3000`

## 📖 Como Usar

### Interface Web

1. Acesse `http://localhost:3000` no navegador
2. Clique na área de upload ou arraste um arquivo PDF
3. Clique em "Processar PDF"
4. Aguarde o processamento
5. Faça o download do arquivo TXT gerado

### API REST

#### Upload e Processamento de PDF

**Endpoint:** `POST /api/upload`

**Content-Type:** `multipart/form-data`

**Parâmetros:**
- `pdf` - Arquivo PDF (campo do formulário)

**Exemplo com curl:**
```bash
curl -X POST http://localhost:3000/api/upload \
  -F "pdf=@/caminho/para/seu/arquivo.pdf"
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "message": "Arquivo processado com sucesso",
  "data": {
    "outputFile": "relatorio-2025-11-04-1699123456789.txt",
    "outputPath": "/output/relatorio-2025-11-04-1699123456789.txt",
    "itemsCount": 150,
    "extractedData": {
      "title": "MAPA DE EXISTÊNCIA - MATERIAL DE CONSUMO",
      "date": "27/10/2025",
      "deposito": "DEP",
      "itemsCount": 150
    }
  }
}
```

#### Listar Arquivos Processados

**Endpoint:** `GET /api/upload/files`

**Exemplo:**
```bash
curl http://localhost:3000/api/upload/files
```

#### Health Check

**Endpoint:** `GET /health`

**Exemplo:**
```bash
curl http://localhost:3000/health
```

## 🧪 Testes

Execute os testes:
```bash
npm test
```

## 📝 Formato de Saída

O arquivo TXT gerado segue o seguinte formato:

```
                    MINISTÉRIO DA DEFESA
                    EXÉRCITO BRASILEIRO
                11ª DEPÓSITO DE SUPRIMENTO
         DEPOSITO MARECHAL MÁRIO TRAVASSOS

      MAPA DE EXISTÊNCIA - MATERIAL DE CONSUMO

Data de emissão: 27/10/2025
Depósito: ALMOXARIFADO DEP

================================================================================

Nr Ficha   Cód Mat      Nome do Material                           Documento                            Qtde Exist Qtde Disp  Vlr Unit   
--------------------------------------------------------------------------------
178246176  840          OCULOS INDUSTRIAL / Aplica��o: Portada...  DIEx Nr 588, de 14/2/2025                   168        168      0,01
...
--------------------------------------------------------------------------------

Total de itens: 150

Relatório gerado em: 04/11/2025 10:30:45
```

## ⚙️ Configuração

### Variáveis de Ambiente (.env)

```env
PORT=3000
UPLOADS_DIR=./uploads
OUTPUTS_DIR=./output
TEMPLATE_FILE=./templates/output-format.txt
```

### Limites

- **Tamanho máximo de arquivo:** 10MB
- **Tipos de arquivo aceitos:** PDF apenas
- **Tempo de processamento:** Varia conforme tamanho do arquivo

## 🐛 Troubleshooting

### Erro: "Apenas arquivos PDF são permitidos"
- Verifique se o arquivo tem extensão .pdf
- Verifique o MIME type do arquivo

### Erro: "Erro ao extrair dados do PDF"
- Verifique se o PDF não está corrompido
- Verifique se o PDF contém texto (não é apenas imagem)

### Erro de permissão nos diretórios
```bash
chmod -R 755 uploads output
```

## 📄 Licença

MIT

## 👥 Autor

Desenvolvido para SIADS - Sistema Integrado de Almoxarifado e Depósito de Suprimento

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 📞 Suporte

Para suporte, abra uma issue no repositório do projeto.

---

**Versão:** 1.0.0  
**Última atualização:** Novembro 2025
