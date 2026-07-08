const fs = require('fs');
const pdfParse = require('pdf-parse');

class PdfExtractorService {
    constructor() {
        // Padrões regex para extrair informações do PDF
        this.patterns = {
            // Padrão para linhas de itens no relatório
            itemLine: /^\s*(\d+)\s+(\d+)\s+(.+?)\s+([\d,]+)\s+(.+?)\s+R\$\s*([\d.,]+)/,
            // Padrão para data
            date: /(\d{2}\/\d{2}\/\d{4})/,
            // Padrão para total
            total: /TOTAL.*?R\$\s*([\d.,]+)/i,
            // Padrão para documento
            document: /(NF|DIEx|GFRN)\s+Nr\s+(\d+),\s+de\s+(\d{1,2}\/\d{1,2}\/\d{4})/
        };
    }

    /**
     * Extrai dados do arquivo PDF
     * @param {string} pdfFilePath - Caminho do arquivo PDF
     * @returns {Promise<Object>} Dados extraídos
     */
    async extractData(pdfFilePath) {
        try {
            const dataBuffer = fs.readFileSync(pdfFilePath);
            const pdfData = await pdfParse(dataBuffer);
            
            // DEBUG: Salvar texto extraído para análise
            console.log('\n=== TEXTO EXTRAÍDO DO PDF (primeiras 2000 chars) ===');
            console.log(pdfData.text.substring(0, 2000));
            console.log('=== FIM DO TRECHO ===\n');
            
            const tipoMaterial = this.extractTipoMaterial(pdfData.text);
            const items = this.extractItems(pdfData.text);
            const totalInventario = this.extractTotalInventario(pdfData.text);

            // Calcular soma dos valores totais dos itens (campo 8)
            const somaItens = items.reduce((acc, item) => {
                const valor = parseFloat(item.valorTotal.replace(/\./g, '').replace(',', '.'));
                return acc + (isNaN(valor) ? 0 : valor);
            }, 0);

            // Verificar se a soma bate com o total do inventário
            let validacao = { valida: true, mensagem: '' };
            if (totalInventario !== null) {
                const diferenca = Math.abs(somaItens - totalInventario);
                const tolerancia = 0.02; // Tolerância de 2 centavos para erros de arredondamento
                
                if (diferenca > tolerancia) {
                    validacao = {
                        valida: false,
                        mensagem: `⚠ DIVERGÊNCIA: A soma dos itens (R$ ${somaItens.toFixed(2).replace('.', ',')}) não corresponde ao Total do Inventário (R$ ${totalInventario.toFixed(2).replace('.', ',')}) — diferença de R$ ${diferenca.toFixed(2).replace('.', ',')}`
                    };
                } else {
                    validacao = {
                        valida: true,
                        mensagem: `✓ Validado: Soma dos itens (R$ ${somaItens.toFixed(2).replace('.', ',')}) confere com o Total do Inventário`
                    };
                }
            } else {
                validacao = {
                    valida: null,
                    mensagem: '⚠ Total do Inventário não encontrado no PDF — não foi possível validar'
                };
            }

            const extractedData = {
                title: this.extractTitle(pdfData.text),
                dates: this.extractDates(pdfData.text),
                items,
                totals: this.extractTotals(pdfData.text),
                deposito: this.extractDeposito(pdfData.text),
                codigoUG: this.extractCodigoUG(pdfData.text),
                contaContabil: this.extractContaContabil(pdfData.text),
                contaCorrente: this.extractContaCorrente(pdfData.text),
                om: this.extractOM(pdfData.text),
                tipoMaterial,
                totalInventario: totalInventario ? totalInventario.toFixed(2).replace('.', ',') : null,
                somaItens: somaItens.toFixed(2).replace('.', ','),
                validacao,
                header: {
                    unit: this.extractCodigoUG(pdfData.text) || '00001',
                    co: tipoMaterial
                }
            };

            console.log(`  → Itens extraídos: ${extractedData.items.length}`);
            console.log(`  → Código UG: ${extractedData.codigoUG}`);
            console.log(`  → Conta Contábil: ${extractedData.contaContabil}`);
            console.log(`  → Conta Corrente: ${extractedData.contaCorrente}`);
            console.log(`  → OM: ${extractedData.om}`);
            console.log(`  → Tipo Material: ${tipoMaterial} (${tipoMaterial === 'CO' ? 'Material de Consumo' : 'Material Permanente'})`);
            console.log(`  → Total Inventário: R$ ${extractedData.totalInventario || 'não encontrado'}`);
            console.log(`  → Soma Itens: R$ ${extractedData.somaItens}`);
            console.log(`  → ${validacao.mensagem}`);
            return extractedData;
            
        } catch (error) {
            console.error('Erro ao extrair dados do PDF:', error);
            throw new Error(`Erro ao extrair dados do PDF: ${error.message}`);
        }
    }

    /**
     * Detecta o tipo do catálogo: 'CO' (Material de Consumo) ou 'PE' (Material Permanente)
     */
    extractTipoMaterial(text) {
        // Busca explícita por "MATERIAL PERMANENTE" primeiro (mais específico)
        if (/MATERIAL\s+PERMANENTE/i.test(text)) {
            return 'PE';
        }
        // Busca por "MATERIAL DE CONSUMO"
        if (/MATERIAL\s+DE\s+CONSUMO/i.test(text)) {
            return 'CO';
        }
        // Fallback: consumo
        return 'CO';
    }

    /**
     * Extrai o título do relatório
     */
    extractTitle(text) {
        // Procurar por "INVENTÁRIO DE ALMOXARIFADO [POR CONTA]" (com colchetes)
        let titleMatch = text.match(/INVENT.RIO\s+DE\s+ALMOXARIFADO.*?\]/i);
        if (titleMatch) {
            return titleMatch[0].replace(/\s+/g, ' ').trim();
        }
        
        // Procurar por "INVENTÁRIO DE ALMOXARIFADO POR DEPÓSITO" (sem colchetes)
        titleMatch = text.match(/INVENT[ÁA]RIO\s+DE\s+ALMOXARIFADO\s+POR\s+(CONTA|DEP[ÓO]SITO)/i);
        if (titleMatch) {
            return titleMatch[0].replace(/\s+/g, ' ').trim();
        }
        
        // Alternativa: MAPA DE EXISTÊNCIA
        titleMatch = text.match(/MAPA DE EXIST.NCIA.*?MATERIAL DE CONSUMO/i);
        if (titleMatch) {
            return titleMatch[0].replace(/\s+/g, ' ').trim();
        }
        
        return 'INVENTÁRIO DE ALMOXARIFADO';
    }

    /**
     * Extrai o depósito
     */
    extractDeposito(text) {
        // Procurar por "ALMOXARIFADO DEP" ou similar
        const depositoMatch = text.match(/ALMOXARIFADO\s+(\w+)/i);
        if (depositoMatch) {
            return `ALMOXARIFADO ${depositoMatch[1]}`;
        }
        
        // Alternativa: procurar por "DEPOSITO"
        const depMatch = text.match(/DEPOSITO\s+(.+?)(?:\n|$)/i);
        if (depMatch) {
            return depMatch[1].trim();
        }
        
        return 'ALMOXARIFADO DEP';
    }

    /**
     * Extrai o Código UG (UASG)
     * Exemplo: CÓDIGO UG: 160072
     */
    extractCodigoUG(text) {
        const ugMatch = text.match(/C.DIGO\s+UG:\s*(\d+)/i);
        if (ugMatch) {
            return ugMatch[1];
        }
        return '00001'; // Valor padrão
    }

    /**
     * Extrai a Conta Contábil
     * Exemplo: Conta contábil: 115610100
     */
    extractContaContabil(text) {
        const contaMatch = text.match(/Conta\s+cont.bil:\s*(\d+)/i);
        if (contaMatch) {
            return contaMatch[1];
        }
        return ''; // Vazio se não encontrar
    }

    /**
     * Extrai a Conta Corrente (Depósito)
     * Exemplo: Conta corrente: 26
     */
    extractContaCorrente(text) {
        const contaCorrenteMatch = text.match(/Conta\s+corrente:\s*(\d+)/i);
        if (contaCorrenteMatch) {
            return contaCorrenteMatch[1].padStart(4, '0');
        }
        return '0001'; // Valor padrão
    }

    /**
     * Extrai a OM (Organização Militar)
     * Exemplo: SIGLA UG: 11º D Sup ou 11º DEPÓSITO DE SUPRIMENTO
     */
    extractOM(text) {
        // Tentar extrair da SIGLA UG
        let omMatch = text.match(/SIGLA\s+UG:\s*(\d+)[ºª°]?\s*D\s*Sup/i);
        if (omMatch) {
            return omMatch[1] + 'DSup';
        }
        
        // Tentar extrair do título
        omMatch = text.match(/(\d+)[ºª°]?\s*DEP.SITO\s+DE\s+SUPRIMENTO/i);
        if (omMatch) {
            return omMatch[1] + 'DSup';
        }
        
        return 'OM'; // Valor padrão
    }

    /**
     * Extrai todas as datas encontradas
     */
    extractDates(text) {
        const dates = [];
        const lines = text.split('\n');
        
        for (const line of lines) {
            const dateMatch = line.match(this.patterns.date);
            if (dateMatch) {
                dates.push(dateMatch[1]);
            }
        }
        
        return dates.length > 0 ? dates[0] : new Date().toLocaleDateString('pt-BR');
    }

    /**
     * Extrai os itens do relatório
     *
     * O pdf-parse extrai cada registro (quase sempre) em uma linha com esta ordem:
     *   UNIDADE  QTDE  VALOR_UNIT  VALOR_TOTAL  BOM  NR_ORD  DESCRIÇÃO  NR_FICHA
     *
     * Quando a descrição é longa, o PDF quebra em linhas extras sem campos numéricos.
     * A estratégia é:
     *   1. Encontrar linhas que contêm o padrão principal (tem BOM/REGULAR/RUIM)
     *   2. Para itens sem NrFicha na mesma linha, olhar as próximas linhas não-item
     */
    extractItems(text) {
        const items = [];
        const lines = text.split('\n');

        // Regex para linha principal de item:
        // UNIDADE  QTDE  VALOR_UNIT  VALOR_TOTAL  SITUAÇÃO  NR_ORD  DESCRIÇÃO [NR_FICHA]
        const UNID = '(?:Metro\\s+C[uú]bico|MetroQuadrado|Cent[íi]metro|Mil[íi]metro|Unidade|Quilograma|Litro|Metro|Pe[çc]a|Caixa|Conjunto|LATA|Bloco(?:\\s*\\(papel\\))?|Pacote|Garrafa|Embalagem|D[úu]zia|Grama|Kilo(?:grama)?|Frasco|Ampola|C[aá]psula|Comprimido|Tubo|Rolo|Par|Resma|Bobina|Barra|Galao|Gal[aã]o|Bisnaga|Vidro|Kit|Dose|Sache|Lata|Cubo)';
        const mainRe = new RegExp(
            `^\\s*(${UNID})\\s+(\\d+)\\s+([\\d.,]+)\\s+([\\d.,]+)\\s+(BOM|REGULAR|RUIM|Recuper[aá]vel|Irrecuper[aá]vel|Inservível|Alienado)\\s+(\\d+)\\s+(.+)$`,
            'i'
        );
        // Regex para detectar se uma linha extra é continuação (não começa com unidade/número)
        const isItemLine = new RegExp(`^\\s*${UNID}\\s+\\d+`, 'i');
        // Regex para detectar mudança de conta contábil entre seções do PDF
        const contaContabilRe = /Conta\s+cont[aá]bil:\s*(\d+)/i;

        let currentContaContabil = '';

        for (let i = 0; i < lines.length; i++) {
            // Detectar nova conta contábil e atualizar a vigente
            const contaM = contaContabilRe.exec(lines[i]);
            if (contaM) {
                currentContaContabil = contaM[1];
                continue;
            }

            const m = mainRe.exec(lines[i]);
            if (!m) continue;

            const unidade    = m[1].trim();
            const qtde       = m[2];
            const valorUnit  = m[3];
            const valorTotal = m[4];
            const situacao   = m[5].toUpperCase();
            const nrOrd      = m[6];
            let   descRaw    = m[7].trim();

            // Se a descrição não termina com NrFicha, pode haver linhas de continuação
            // Continua agregando linhas seguintes que NÃO são novas linhas de item
            // e NÃO são linhas de cabeçalho/rodapé
            const skipLine = /^\s*$|SUB\s*TOTAL|^\s*TOTAL\b|Relat[oó]rio emitido|NR\s*ORD|Conta\s+cont|Invent[aá]rio|MINIST|EX[EÉ]RCITO|P[aá]gina\s+\d/i;
            let j = i + 1;
            while (j < lines.length) {
                const next = lines[j];
                if (skipLine.test(next)) break;
                if (isItemLine.test(next)) break;
                const extra = next.trim();
                if (extra) descRaw += ' ' + extra;
                j++;
            }

            // Extrair NrFicha: último token de dígitos (2-10) no final da descrição acumulada
            let nrFicha = '';
            let especificacao = descRaw;
            const fichaM = descRaw.match(/^(.*?)\s+(\d{2,10})\s*$/);
            if (fichaM) {
                especificacao = fichaM[1].trim();
                nrFicha = fichaM[2];
            }

            items.push({
                nrFicha:       nrFicha || '0',
                nrOrd,
                codMat:        '',
                unidade,
                qtde,
                valorUnit,
                valorTotal,
                situacao,
                nomeMaterial:  especificacao,
                especificacao,
                contaContabil: currentContaContabil
            });
        }

        console.log(`  → Total de linhas processadas: ${lines.length}`);
        console.log(`  → Itens encontrados: ${items.length}`);
        if (items.length > 0) {
            console.log(`  → Primeiro item: ${JSON.stringify(items[0]).substring(0, 200)}`);
            console.log(`  → Último item: ${JSON.stringify(items[items.length - 1]).substring(0, 200)}`);
            const nrOrds = items.map(it => it.nrOrd).join(', ');
            console.log(`  → NR ORDs extraídos: ${nrOrds}`);
        }

        return items;
    }

    /**
     * Extrai o Total do Inventário do PDF
     */
    extractTotalInventario(text) {
        // Procurar por "TOTAL DO INVENTÁRIO" ou "TOTAL" seguido de valor
        const patterns = [
            /TOTAL\s+DO\s+INVENT[ÁA]RIO.*?R\$\s*([\d.,]+)/i,
            /TOTAL\s+GERAL.*?R\$\s*([\d.,]+)/i,
            /TOTAL\s*:\s*R\$\s*([\d.,]+)/i,
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                // Remove pontos de milhares e substitui vírgula por ponto
                const valorStr = match[1].replace(/\./g, '').replace(',', '.');
                return parseFloat(valorStr);
            }
        }

        return null;
    }

    /**
     * Extrai valores totais
     */
    extractTotals(text) {
        const totals = [];
        const totalMatches = text.matchAll(/R\$\s*([\d.,]+)/g);
        
        for (const match of totalMatches) {
            totals.push(match[1]);
        }
        
        return totals;
    }

    /**
     * Formata valor monetário
     */
    formatCurrency(value) {
        if (typeof value === 'string') {
            // Remove pontos de milhares e substitui vírgula por ponto
            value = value.replace(/\./g, '').replace(',', '.');
        }
        const num = parseFloat(value);
        return isNaN(num) ? '0,00' : num.toFixed(2).replace('.', ',');
    }
}

module.exports = PdfExtractorService;
