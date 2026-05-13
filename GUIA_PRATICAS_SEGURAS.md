# 🛡️ GUIA DE MELHORES PRÁTICAS — Conversor-SISCOFIS-SIADS

Documento de referência para operação segura, rastreável e consistente do sistema de extração de inventário de almoxarifado (SISCOFIS → SIADS).

---

## 1. GERAÇÃO DO ARQUIVO TXT

### ✅ Faça sempre
- Utilize o PDF **original gerado pelo SISCOFIS** (não utilize impressões em PDF ou cópias escaneadas — não possuem texto seleccionável).
- Nomeie o arquivo de saída com a convenção: `OM_<ContaContábil>_todas_<DD-MM-AAAA>.txt`.
- Após gerar o TXT, **verifique se há itens mesclados** antes de importar no SIADS:
  ```bash
  python3 -c "
  import re
  with open('OM_115610100_todas_07-05-2026.txt') as f: lines = f.readlines()
  bad = [i+1 for i,l in enumerate(lines)
         if l.startswith('D¥') and re.search(r'\s+BOM\s+\d+\s+', l.split('¥')[3] if len(l.split('¥'))>3 else '')]
  print(f'Linhas mescladas: {len(bad)}', bad[:10] if bad else '— nenhuma')
  "
  ```
- Confirme que a linha `T` bate com os totais reais:
  ```bash
  python3 -c "
  with open('OM_115610100_todas_07-05-2026.txt') as f: lines = f.readlines()
  d = [l for l in lines if l.startswith('D¥')]
  qty = sum(int(l.rstrip().split('¥')[7]) for l in d if len(l.split('¥'))>8)
  val = sum(int(l.rstrip().split('¥')[8]) for l in d if len(l.split('¥'))>9)
  t = [l for l in lines if l.startswith('T¥')][0].rstrip().split('¥')
  ok = t[2]==str(len(d)) and t[3]==str(qty) and t[4]==str(val)
  print('T OK:', ok, '| D:', len(d), 'Qty:', qty, 'Val:', val)
  "
  ```

### ❌ Evite
- Editar manualmente campos de valor em centavos sem recalcular a linha T.
- Importar um TXT com itens mesclados — causará erros silenciosos no SIADS.
- Reutilizar um arquivo `.txt` de data anterior sem regenerar.

---

## 2. BACKUP DOS ARQUIVOS

### ✅ Faça sempre
- Mantenha **backups datados** dos TXTs gerados em `backups/` antes de sobrescrever:
  ```bash
  cp OM_115610100_todas_07-05-2026.txt backups/OM_115610100_todas_07-05-2026_$(date +%H%M).txt
  ```
- Guarde o PDF fonte junto com o TXT correspondente — facilita reprocessamento.
- Antes de corrigir um TXT em produção, salve uma cópia com sufixo `_orig`.

### ❌ Evite
- Sobrescrever um TXT correto com uma nova extração sem backup.
- Deletar PDFs fonte após geração — são necessários para auditoria e reprocessamento.

---

## 3. CONTAINER DOCKER

### ✅ Faça sempre
- Sempre executar **rebuild** após alterar qualquer arquivo em `src/`:
  ```bash
  cd conversor-siscofis-siads
  docker compose down && docker compose up --build -d
  ```
- Verificar que o container está saudável antes de processar:
  ```bash
  docker ps | grep pdf-extractor
  curl -s http://localhost:3000/health
  ```
- Lembrar que apenas `output/` e `uploads/` são bind-mounts — alterações em `src/` exigem rebuild.
- No servidor CTA, executar o deploy a partir de `/opt/conversor-siscofis-siads/conversor-siscofis-siads`, porque o clone Git fica um nível acima.
- Se `docker compose up -d` terminar com o container rodando, mas sem `0.0.0.0:3000->3000/tcp` em `docker ps`, reiniciar o daemon Docker e recriar o serviço.
- Manter `build.network: host` no `docker-compose.yml` do servidor para evitar falhas de DNS do `npm` durante o build.

### ❌ Evite
- Editar arquivos `src/` e esperar que o container reflita a mudança sem rebuild.
- Usar `docker compose restart` sozinho — não recompila a imagem.
- Assumir que `docker ps` sem coluna `PORTS` publicada significa apenas problema de firewall; nesse caso o publish falhou no próprio host.

### Recuperação rápida da porta 3000

Quando o acesso a `http://10.166.68.89:3000` falhar com `não conseguiu se conectar`, validar nesta ordem:

```bash
tsh ssh --insecure suporte@VM-7CTA-11CGCFEX-APP-CONVERSOR-SISCOFIS-SIADS-PRODUCAO \
  'docker ps --filter name=conversor-siscofis-siads --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" && curl -I -s http://localhost:3000 | head -n 8'
```

Se o container estiver sem porta publicada, executar:

```bash
tsh ssh --insecure root@VM-7CTA-11CGCFEX-APP-CONVERSOR-SISCOFIS-SIADS-PRODUCAO \
  'systemctl restart docker'

tsh ssh --insecure suporte@VM-7CTA-11CGCFEX-APP-CONVERSOR-SISCOFIS-SIADS-PRODUCAO \
  'cd /opt/conversor-siscofis-siads/conversor-siscofis-siads && docker compose down && docker compose up -d --force-recreate'
```

---

## 4. CORREÇÃO DE ITENS MESCLADOS

### ✅ Procedimento recomendado
1. Extrair o PDF com `pdftotext -layout` para inspeção visual:
   ```bash
   pdftotext -layout "INVENTARIO HMAB.pdf" /tmp/inventario_hmab.txt
   grep -n "BOM" /tmp/inventario_hmab.txt | head -30
   ```
2. Para cada linha D problemática, localizar o NrOrd real no PDF.
3. Usar o script Python de correção em lote (`fix_merged_items.py`) — nunca corrigir manualmente mais de 2–3 itens.
4. Após correção, **sempre revalidar** a linha T (ver seção 1).

### ❌ Evite
- Remover itens ao invés de separar — causa divergência no inventário.
- Inferir NrFicha ou valores sem confirmar no PDF original.

---

## 5. RASTREABILIDADE E NOMENCLATURA

| Elemento | Padrão |
|---|---|
| Arquivo TXT — Consumo | `OM_<ContaContábil>_todas_<DD-MM-AAAA>.txt` |
| Arquivo TXT — Permanente | `OM_<ContaContábil>_perm_<DD-MM-AAAA>.txt` (sugerido) |
| Backup | `backups/OM_<ContaContábil>_todas_<DD-MM-AAAA>_<HHMM>.txt` |
| NrFicha duplicado | `<NrFicha>A`, `<NrFicha>B`, `<NrFicha>C`… |
| Container | `conversor-siscofis-siads` (porta 3000) |

### Tipo de Material (campo 2 da linha H)
| Texto no PDF | Campo H | Tipo |
|---|---|---|
| `MATERIAL DE CONSUMO` | `CO` | Material de Consumo |
| `MATERIAL PERMANENTE` | `PE` | Material Permanente |

Detecção automática pelo sistema. Caso nenhum padrão seja encontrado, assume `CO` como fallback.

---

## 6. SEGURANÇA DE DADOS

- Os PDFs de inventário contêm dados sensíveis de material militar — **não compartilhar fora da rede interna**.
- O CPF/ID fixo `36899038315` na linha H é o identificador da OM — não alterar.
- O campo `SiadsId136002` identifica o almoxarifado — verificar junto ao administrador SIADS antes de usar em outro contexto.
- Não versionar PDFs com dados reais em repositórios públicos.

---

## 7. HISTÓRICO DE CORREÇÕES APLICADAS

| Data | Problema | Solução |
|---|---|---|
| 06/05/2026 | GLP com NrFicha `04006` errado (correto: `04054`) | Corrigido manualmente |
| 06/05/2026 | OXIGENIO MEDICINAL (2 itens) fundido com GLP | Separados em `04006A` e `04006B` |
| 07/05/2026 | 33 linhas D com itens mesclados (`BOM` na descrição) | Corrigido via script Python (`fix_merged_items.py`) — 2764 → 2829 itens |
| 07/05/2026 | `Metro Cubico`, `Frasco`, `Ampola` não reconhecidos | Lista `UNID` expandida em `pdfExtractorService.js` + rebuild do container |
| 11/05/2026 | Bloco OBSERVAÇÕES/rodapé no arquivo TXT causava rejeição no SIADS | Removido `formatObservacoes()` — arquivo TXT termina na linha T |
| 11/05/2026 | Linha H usava `CO` fixo para qualquer tipo de inventário | Detecção automática: `CO` (Material de Consumo) ou `PE` (Material Permanente) pelo título do PDF |
| 11/05/2026 | Página web não registrava autor da conversão | Campos Nome e CPF adicionados ao formulário; card de confirmação exibido após conversão |
| 13/05/2026 | Build Docker falhava no servidor CTA por DNS do `npm` dentro da rede padrão do Docker | Removido `apk add` desnecessário do `Dockerfile` e configurado `build.network: host` no Compose |
| 13/05/2026 | Aplicação inacessível em `10.166.68.89:3000` apesar do container em execução | Reinício do daemon Docker e recriação do serviço para restaurar a publicação da porta `3000` |

---

## 📎 Referências

- [Manual SIADS v6.21](orientacoes-gerais-geracao-dos-arquivos-v6-21.pdf)
- [Prompt / Documentação IA](.github/prompts/prompt_ai.prompt.md)
- [README do Projeto](README.md)
- [Formato de Saída H/D/T](conversor-siscofis-siads/FORMATO_SAIDA.md)

