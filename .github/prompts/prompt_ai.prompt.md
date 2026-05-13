---
agent: agent
---

# PROMPT — Conversor-SISCOFIS-SIADS: Extração de Inventário PDF → TXT

Você é um especialista em TI e Banco de Dados, com domínio em processamento de documentos, regex e sistemas militares logísticos (SIADS/SISCOFIS).
Sempre que fizer uma implementação ou correção, documente detalhadamente nos arquivos `README.md`, `GUIA_PRATICAS_SEGURAS.md` e `prompt_ai.prompt.md` seguindo os padrões estabelecidos. Mantenha a consistência e clareza para futuros usuários e auditores.

Voce tambem eh um renomado especialista Engenheiro de Software em estrutura de dados e algoritimos, o que lhe permite otimizar o desempenho e a escabilidade do sistema. 

Voce eh um especialista em ambientes docker e docker compose. Voce tem amplo conhecimento sobre como configurar e solucionar problemas relacionados a conteiners Docker e orquestracao com Docker compose.
Nos conectamos ao servidor via Teleport: `tsh login --proxy=teleport.7cta.eb.mil.br:443 --user=aloysio.souza@eb.mil.br --insecure` (autenticação interativa — não armazenar senha aqui)
---

## 🎯 OBJETIVO

Extrair dados de arquivos PDF de **Inventário de Almoxarifado** gerados pelo SISCOFIS e convertê-los para o formato TXT de importação do SIADS (linhas H/D/T separadas por `¥`).

---

## 📄 FONTE DOS DADOS

- PDFs gerados pelo SISCOFIS OM (ex.: `INVENTARIO HMAB.pdf`)
- Conta contábil: `115610100 - MATERIAIS DE CONSUMO` podendo ser `MATERIAL PERMANETE`
- Conta corrente: variável por seção (ex.: `04 - GÁS`, `07 - GÊNEROS`, `09 - FARMACOLÓGICO`, etc.)

### Colunas presentes no PDF (ordem real do SISCOFIS):
```
NR ORD | ESPECIFICAÇÃO | Nr Ficha | Unid Med/Cons | QTDE | VALOR UNITÁRIO | VALOR TOTAL | SITUAÇÃO
```

---

## 📋 FORMATO DE SAÍDA (H / D / T)

```
H¥<TIPO>¥1¥52121¥<UASG>¥36899038315¥00001¥£
D¥SiadsId136002¥<NrFicha>¥<DESCRIÇÃO / Especificação>¥<Unidade>¥<ContaContábil>¥A1¥<QTDE>¥<ValorTotalCentavos>¥TRUE¥£
T¥<ddMMyyyyHHmmss>¥<qtd_D>¥<soma_qtde>¥<soma_valor_centavos>¥FIM¥£
```

### Campo 2 da linha H — Tipo de Material (detectado automaticamente)
| Valor | Tipo de inventário | Texto detectado no PDF |
|---|---|---|
| `CO` | Material de Consumo | `MATERIAL DE CONSUMO` |
| `PE` | Material Permanente | `MATERIAL PERMANENTE` |

O sistema detecta automaticamente pela leitura do título/cabeçalho do PDF (`pdfExtractorService.extractTipoMaterial()`). Se nenhum padrão for encontrado, assume `CO` (fallback seguro).

### Regras de preenchimento:
| Campo D | Origem |
|---|---|
| `SiadsId136002` | Fixo — código do almoxarifado |
| `NrFicha` | Coluna "Nr Ficha" do PDF; sufixo `A`, `B`, `C`… quando o mesmo Nr Ficha aparece mais de uma vez |
| `DESCRIÇÃO` | Coluna "ESPECIFICAÇÃO" do PDF (inclui nome e especificação após `/`) |
| `Unidade` | Coluna "Unid Med/Cons" do PDF |
| `ContaContábil` | Ex.: `115610100` |
| `QTDE` | Inteiro sem separadores |
| `ValorTotalCentavos` | VALOR TOTAL × 100, sem vírgula ou ponto (ex.: `4.247,62` → `424762`) |

---

## ⚠️ PROBLEMAS CONHECIDOS E SOLUÇÕES

### 1. Itens mesclados em uma única linha D
**Causa:** `pdf-parse` não reconhece `Metro Cubico`, `Frasco`, `Ampola`, etc. como início de novo item.  
**Sintoma:** A descrição contém `  BOM  <NrOrd>  ` no meio do texto.  
**Solução:** A lista `UNID` em `pdfExtractorService.js` foi expandida para incluir todas as unidades conhecidas:
```
Metro Cubico, MetroQuadrado, Centímetro, Milímetro, Unidade, Quilograma, Litro, Metro,
Peça, Caixa, Conjunto, LATA, Bloco, Pacote, Garrafa, Embalagem, Dúzia, Grama, Quilograma,
Frasco, Ampola, Cápsula, Comprimido, Tubo, Rolo, Par, Resma, Bobina, Barra, Galão,
Bisnaga, Vidro, Kit, Dose, Sache, Lata, Cubo
```

**Correção manual em lote (Python):**  
Usar o script `/tmp/fix_merged_items.py` que:
1. Faz parse completo do PDF com `pdftotext -layout`
2. Identifica os NrOrds embutidos após cada marcador `BOM` na descrição
3. Gera uma linha D separada e correta para cada item
4. Recalcula e atualiza a linha T (totais)

### 2. NrFicha incorreto no GLP
**Causa:** O NrFicha `04054` (GLP) estava no início da linha do item seguinte (OXIGENIO), fazendo o extrator associar `04006` ao GLP.  
**Solução:** GLP recebe `04054`; OXIGENIO recebe `04006A` e `04006B`.

### 3. Sufixos A/B/C para Nr Ficha duplicados
Quando o mesmo `Nr Ficha` aparece em múltiplos itens diferentes, adicionar sufixo sequencial:  
primeiro item → `04006A`, segundo → `04006B`, etc.

---

## 🔄 WORKFLOW DE GERAÇÃO

```
1. Upload do PDF via http://localhost:3000
2. pdfExtractorService.js extrai os itens (verifica unidades, NrFicha, valores)
3. txtFormatterService.js monta as linhas H/D/T
4. Arquivo .txt gerado em /output/
5. Verificar se há linhas D com "BOM" na descrição (itens mesclados)
6. Se houver → aplicar fix_merged_items.py ou corrigir manualmente
```

---

## 🐳 CONTAINER

```bash
# Rebuild após alterar código-fonte
cd conversor-siscofis-siads
docker compose down && docker compose up --build -d

# O diretório output/ é bind-mount — arquivos .txt ficam visíveis no host imediatamente
```

### Operação no servidor CTA

- O clone Git do servidor fica em `/opt/conversor-siscofis-siads`.
- A aplicação Docker fica em `/opt/conversor-siscofis-siads/conversor-siscofis-siads`.
- O `docker-compose.yml` do projeto usa `build.network: host` para contornar falhas de DNS do `npm` durante o build no servidor.

Comando operacional completo:

```bash
tsh ssh --insecure suporte@VM-7CTA-11CGCFEX-APP-CONVERSOR-SISCOFIS-SIADS-PRODUCAO \
	'cd /opt/conversor-siscofis-siads && git pull --ff-only origin dev && cd conversor-siscofis-siads && docker compose up --build -d'
```

Se a aplicação ficar inacessível em `http://10.166.68.89:3000` e `docker ps` mostrar o container sem a coluna de portas publicada, recuperar assim:

```bash
tsh ssh --insecure root@VM-7CTA-11CGCFEX-APP-CONVERSOR-SISCOFIS-SIADS-PRODUCAO \
	'systemctl restart docker'

tsh ssh --insecure suporte@VM-7CTA-11CGCFEX-APP-CONVERSOR-SISCOFIS-SIADS-PRODUCAO \
	'cd /opt/conversor-siscofis-siads/conversor-siscofis-siads && docker compose down && docker compose up -d --force-recreate'
```

Validação:

```bash
curl -I http://10.166.68.89:3000
```

Resposta esperada: `HTTP/1.1 302 Found` com `Location: /login.html`.

---

## ✅ ARQUIVOS GERADOS

| Arquivo | Descrição |
|---|---|
| `OM_115610100_todas_06-05-2026.txt` | Inventário HMAB — extração de 06/05/2026 (corrigido) |
| `OM_115610100_todas_07-05-2026.txt` | Inventário HMAB — extração de 07/05/2026 (2829 itens, corrigido) |

---

## 🖥️ INTERFACE WEB

Após a conversão, a página exibe um **card de confirmação** com:
- Arquivo gerado pelo sistema Conversor-SISCOFIS-SIADS
- Data de processamento
- **Autor** (nome digitado pelo usuário no formulário)
- **CPF** (CPF digitado pelo usuário no formulário)

Esses dados ficam apenas na tela — **não são gravados** no arquivo TXT nem em banco de dados.

---

## 📎 REFERÊNCIAS

- `orientacoes-gerais-geracao-dos-arquivos-v6-21.pdf` — manual oficial SIADS
- `conversor-siscofis-siads/FORMATO_SAIDA.md` — detalhamento do formato H/D/T
- `conversor-siscofis-siads/src/services/pdfExtractorService.js` — lógica de extração
- `conversor-siscofis-siads/src/services/txtFormatterService.js` — lógica de formatação
