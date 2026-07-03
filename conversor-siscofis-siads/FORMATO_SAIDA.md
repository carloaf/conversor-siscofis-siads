# Formato de Saída — Conversor-SISCOFIS-SIADS

## Visão Geral
Gera arquivos TXT para importação no SIADS com registros delimitados por `¥` e terminador `¥£`.  
O tipo de inventário (**Material de Consumo** ou **Material Permanente**) é detectado automaticamente pelo título do PDF e refletido no campo 2 da linha H.

## Estrutura do Arquivo

Passo a Passo para Entender o Formato do Arquivo de Material de Consumo
1. O que é esse arquivo?

Um arquivo de texto (TXT) usado para importar materiais de consumo em um sistema. Ele é dividido em quatro tipos de linhas:
Cabeçalho (H)
Dados (D)
Exclusões (E)
Rodapé (T)
Cada linha é formada por campos separados pelo caractere ¥.

2. Estrutura de Cada Tipo de Linha
🔵 A. Linha de Cabeçalho (H)

Contém informações gerais do arquivo.  
**O campo 2 é preenchido automaticamente** conforme o tipo de inventário detectado no PDF:

| Texto no PDF | Campo 2 | Significado |
|---|---|---|
| `MATERIAL DE CONSUMO` | `CO` | Material de Consumo |
| `MATERIAL PERMANENTE` | `PE` | Material Permanente |

Exemplos:
```
H¥CO¥1¥52121¥160088¥36899038315¥00001¥£   ← Material de Consumo
H¥PE¥1¥52121¥160088¥36899038315¥00001¥£   ← Material Permanente
```

Campos:
H → cabeçalho
CO ou PE → tipo do inventário (detectado automaticamente)
1 → número do arquivo
52121 → órgão
160088 → UASG (Código UG extraído do PDF)
36899038315 → identificador da OM
00001 → gestão
£ → fim da linha

🟢 B. Linha de Dados (D)
Representa um material.
Exemplo:
D ¥ AB99999 ¥ C2805006045 ¥ VALVULA ... ¥ UN ¥ 115610139 ¥ PA60T0000 ¥ 179014 ¥ 40000 ¥ FALSE ¥ £

Significado dos campos:

D → inclusão/alteração
Código do almoxarifado / Código UORG
Código do material
Descrição
Unidade de medida
Conta contábil
Endereço
Quantidade disponível
Valor do saldo
Estocável (TRUE/FALSE)
£ → fim da linha

🔴 C. Linha de Exclusão (E)

Indica ao sistema que o material deve ser removido.

Exemplo:
E ¥ C2805006045 ¥ UN ¥ £

Campos:
E → exclusão
Código do material
Unidade de medida
£ → fim da linha

🟠 D. Linha de Rodapé (T)
Finaliza o arquivo e apresenta totais.

Exemplo:
T ¥ 04052017083540 ¥ 4 ¥ 1974 ¥ 13000 ¥ FIM ¥ £

Campos:
T → rodapé
Data/hora
Quantidade de registros do tipo D
Soma das quantidades
Soma dos valores
FIM → encerramento
£ → fim da linha

3. Visão Geral da Estrutura do Arquivo
CABEÇALHO (H)
DADOS (D)
DADOS (D)
DADOS (D)
EXCLUSÕES (E)
RODAPÉ (T)

Como um documento organizado em:
Uma capa
Várias fichas de materiais
Uma seção de itens a excluir
Um resumo final

4. Regras Importantes
A ordem das linhas deve ser H → D/E → T
Só pode existir 1 cabeçalho (H) e 1 rodapé (T)
Todos os campos são separados por ¥
Cada linha termina com £
Quantidades e valores não usam ponto ou vírgula
"Estocável" só aceita TRUE ou FALSE
O arquivo deve ser lido pelo sistema exatamente como está

5. Resumo Simples
A primeira linha identifica o arquivo.
As linhas seguintes descrevem os materiais.
Algumas linhas podem pedir exclusão.
A última linha fecha o arquivo com totais.
