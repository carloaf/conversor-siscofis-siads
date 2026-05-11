# Conversor-SISCOFIS-SIADS

Sistema de extração e conversão de relatórios de inventário gerados pelo **SISCOFIS** para o formato de importação do **SIADS** (arquivo TXT H/D/T).

---

## 📁 Estrutura do Projeto

```
SIADS/
├── conversor-siscofis-siads/          # Aplicação Node.js (Docker) — upload PDF → TXT
│   ├── src/services/
│   │   ├── pdfExtractorService.js   # Extração de itens do PDF
│   │   └── txtFormatterService.js   # Geração das linhas H/D/T
│   ├── output/                      # Arquivos TXT gerados (bind-mount)
│   └── uploads/                     # PDFs temporários (bind-mount)
├── .github/prompts/
│   └── prompt_ai.prompt.md     # Prompt e documentação para IA
├── INVENTARIO HMAB.pdf         # PDF fonte — Inventário HMAB 06/05/2026
├── OM_115610100_todas_06-05-2026.txt  # TXT gerado (corrigido)
├── OM_115610100_todas_07-05-2026.txt  # TXT gerado (corrigido — 2829 itens)
├── orientacoes-gerais-geracao-dos-arquivos-v6-21.pdf  # Manual SIADS oficial
└── FORMATO_SAIDA.md / IMPLEMENTACAO_FINAL.md          # Documentação técnica
```

---

## 🚀 Como Usar

### 1. Iniciar o container

```bash
cd conversor-siscofis-siads
docker compose up -d
```

Acesse: **http://localhost:3000**

### 2. Fazer upload do PDF

- Acesse a interface web
- Faça upload do PDF gerado pelo SISCOFIS (ex.: `INVENTARIO HMAB.pdf`)
- O sistema extrai os itens e gera o arquivo TXT em `output/`

### 3. Verificar e corrigir itens mesclados

Após gerar o TXT, verificar se há linhas com `BOM` na descrição (indica itens fundidos):

```bash
python3 -c "
import re
with open('OM_115610100_todas_07-05-2026.txt') as f:
    lines = f.readlines()
bad = [i+1 for i,l in enumerate(lines)
       if l.startswith('D¥') and re.search(r'\s+BOM\s+\d+\s+', l.split('¥')[3] if len(l.split('¥'))>3 else '')]
print(f'Linhas mescladas: {len(bad)}', bad[:10])
"
```

Se encontrado, aplicar o script de correção (ver `prompt_ai.prompt.md`).

### 4. Rebuild após alterar código

```bash
docker compose down && docker compose up --build -d
```

---

## 📋 Formato de Saída (H/D/T)

```
H¥CO¥1¥52121¥<UASG>¥36899038315¥00001¥£
D¥SiadsId136002¥<NrFicha>¥<Descrição>¥<Unidade>¥115610100¥A1¥<Qtde>¥<ValorCentavos>¥TRUE¥£
T¥<ddMMyyyyHHmmss>¥<qtd_D>¥<soma_qtde>¥<soma_valor_centavos>¥FIM¥£
```

- **Separador:** `¥`
- **Terminador:** `¥£`
- **Valor total:** em centavos, inteiro (ex.: `4.247,62` → `424762`)
- **NrFicha duplicado:** sufixo `A`, `B`, `C`… (ex.: `04006A`, `04006B`)

---

## ⚠️ Problemas Conhecidos

| Problema | Causa | Solução |
|---|---|---|
| Itens mesclados numa linha D | Unidade não reconhecida pelo regex | Lista `UNID` expandida em `pdfExtractorService.js` |
| NrFicha incorreto (GLP) | Layout de 2 colunas do PDF confunde extrator | Corrigido manualmente / via script Python |
| Metro Cubico / Frasco / Ampola não reconhecidos | Faltavam na lista UNID | Corrigido em 07/05/2026 + rebuild do container |

---

## 📦 Arquivos TXT Gerados

| Arquivo | Data | Itens (D) | Status |
|---|---|---|---|
| `OM_115610100_todas_06-05-2026.txt` | 06/05/2026 | 2766 | ✅ Corrigido |
| `OM_115610100_todas_07-05-2026.txt` | 07/05/2026 | 2829 | ✅ Corrigido |

---

## 📎 Referências

- [Manual SIADS v6.21](orientacoes-gerais-geracao-dos-arquivos-v6-21.pdf)
- [Prompt / Documentação IA](.github/prompts/prompt_ai.prompt.md)
- [Formato de Saída](conversor-siscofis-siads/FORMATO_SAIDA.md)

