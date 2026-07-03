const fs = require('fs');
const path = require('path');

/**
 * Gera arquivo no formato Mat Consumo.odt -> export serializado
 * Formato esperado (H, D, T):
 * H ¥ CO ¥ 1 ¥ 25000 ¥ 00001 ¥ 36899038315 ¥ 00001 ¥ £
 * D ¥ AB99999 ¥ C2805006045 ¥  VALVULA ... ¥ UN ¥ 115610139 ¥ PA60T0000 ¥ 179014 ¥ 40000 ¥ FALSE ¥ £
 * T ¥ 04052017083540 ¥ 4 ¥ 1974 ¥ 13000 ¥ FIM ¥ £
 *
 * Observações:
 * - Os campos são preenchidos a partir de `extractedData` quando possível.
 * - Se algum campo não existir, será usado um padrão (vazio ou 0) para manter posições.
 * - Registro E (exclusão) não é utilizado por enquanto.
 */
class TxtFormatterService {
    constructor() {
        this.sep = '¥';
        this.term = '¥£';
    }

    /**
     * Monta o arquivo no formato solicitado (H, D, T)
     * @param {Object} extractedData { header: {...}, items: [...] }
     * @param {Object} [options]
     * @param {string} [options.almoxarifadoCode] Código UORG do SIADS p/ POR DEPÓSITO (campo 2 da linha D)
     * @returns {string} texto pronto para gravação
     */
    formatData(extractedData, options = {}) {
        console.log(`Formatando ${extractedData.items ? extractedData.items.length : 0} itens...`);
        if (options.almoxarifadoCode) {
            console.log(`  → Inventário POR DEPÓSITO — UORG SIADS: ${options.almoxarifadoCode}`);
        }
        
        // Cabeçalho - Linha H
        const headerLine = this.formatHeaderRecord(extractedData.header);
        
        // Detalhes - Linhas D
        const detailLines = [];
        if (extractedData.items && extractedData.items.length > 0) {
            // Agrupar itens por Nr Ficha e adicionar sufixos A, B, C...
            const fichaCount = {};
            const itemsComSufixo = extractedData.items.map(item => {
                const nrFicha = item.nrFicha || item.numeroFicha || item.nrficha || '0';
                
                // Contar ocorrências de cada Nr Ficha
                if (!fichaCount[nrFicha]) {
                    fichaCount[nrFicha] = 0;
                }
                
                const itemCopy = { ...item };
                
                // Se houver mais de 1 item com o mesmo Nr Ficha, adicionar sufixo
                if (fichaCount[nrFicha] > 0) {
                    const sufixo = String.fromCharCode(65 + fichaCount[nrFicha]); // A=65, B=66, C=67...
                    itemCopy.nrFichaComSufixo = nrFicha + sufixo;
                } else if (extractedData.items.filter(i => (i.nrFicha || i.numeroFicha || i.nrficha || '0') === nrFicha).length > 1) {
                    // Primeiro item de um grupo duplicado recebe 'A'
                    itemCopy.nrFichaComSufixo = nrFicha + 'A';
                } else {
                    // Item único sem duplicatas
                    itemCopy.nrFichaComSufixo = nrFicha;
                }
                
                fichaCount[nrFicha]++;
                return itemCopy;
            });
            
            itemsComSufixo.forEach((item, index) => {
                // Passar conta contábil e código do almoxarifado (UORG) para cada detalhe
                const almoxCode = options.almoxarifadoCode || null;
                const detailLine = this.formatDetailRecord(item, item.contaContabil || extractedData.contaContabil, almoxCode);
                detailLines.push(detailLine);
            });
        }
        
        // Totalizador - Linha T
        const trailerLine = this.formatTrailerRecord(extractedData);
        
        // Combinar todas as linhas
        const allLines = [
            headerLine,
            ...detailLines,
            trailerLine
        ];
        
        return allLines.join('\n');
    }

    formatHeaderRecord(h = {}) {
        // Campos: H ¥ CO ¥ 1 ¥ 52121 ¥ 160072 ¥ 36899038315 ¥ 00001 ¥ £
        // Campo 5 (UASG) vem de h.unit (Código UG do PDF)
        const fields = [];
        fields.push('H');
        fields.push(h.co || 'CO');
        fields.push(h.version || '1');
        fields.push(h.org || '52121');
        fields.push(h.unit || '00001'); // Código UG extraído do PDF
        fields.push(h.bigNumber || '36899038315');
        fields.push(h.sequence || '00001');

        return fields.join(this.sep) + this.term;
    }

    formatDetailRecord(item = {}, contaContabil = '', almoxarifadoCode = null) {
        // Exemplo D ¥ AB99999 ¥ C2805006045 ¥  VALVULA ... ¥ UN ¥ 115610139 ¥ PA60T0000 ¥ 179014 ¥ 40000 ¥ FALSE ¥ £
        // Mapeamento (assunções):
        // - tipo D
        // - campo2: código do almoxarifado (UORG do SIADS p/ POR DEPÓSITO, senão fixo SiadsId136002)
        // - campo3: material code -> item.codMat || item.nrOrd || ''
        // - campo4: descrição -> item.especificacao || item.nomeMaterial || ''
        // - campo5: unidade -> item.unidade || 'UN'
        // - campo6: conta contábil (vem do PDF, parâmetro contaContabil)
        // - campo7: códigos adicionais -> item.cod1, item.cod2 ... qtde, valor, flag

        const fields = [];
        fields.push('D');
        // Campo 2: Código do almoxarifado (UORG do SIADS ou fallback fixo)
        fields.push(almoxarifadoCode || 'SiadsId136002');
        // Campo 3: Número da Ficha extraído do PDF (com sufixo A, B, C... se duplicado)
        fields.push(this.normalize(item.nrFichaComSufixo || item.nrFicha || item.numeroFicha || item.nrficha || ''));
        fields.push(this.truncate(this.normalize(item.especificacao || item.nomeMaterial || ''), 299));
        fields.push(this.normalize(item.unidade || 'UN'));
        // Campo 5: Conta Contábil vem do PDF como parâmetro
        fields.push(this.normalize(contaContabil || item.codInterno1 || item.cod1 || item.campo5 || ''));
        // Campo 6: Endereço fixo A1
        fields.push('A1');

        // Campo 7: Quantidade disponível (inteiro, sem separadores)
        const qtde = this.normalizeNumberInt(item.qtde || item.quantidade || item.qtd || 0);
        fields.push(qtde);
        
        // Campo 8: Valor do saldo em centavos (multiplicado por 100, sem vírgula ou ponto)
        const valorSaldo = this.normalizeNumberCentavos(item.valorTotal || item.vlrTotal || 0);
        fields.push(valorSaldo);

        // Campo 10: Estocável (fixo TRUE)
        fields.push('TRUE');

        return fields.join(this.sep) + this.term;
    }

    formatTrailerRecord(extractedData) {
        // T ¥ 04052017083540 ¥ 4 ¥ 1974 ¥ 13000 ¥ FIM ¥ £
        const items = extractedData.items || [];
        const fields = [];
        fields.push('T');
        fields.push(this.formatTimestamp(new Date()));
        fields.push(String(items.length || 0));

        // totalQty e totalValue calculados
        let totalQty = 0;
        let totalValue = 0;
        items.forEach(it => {
            const q = parseFloat(String(it.qtde || it.quantidade || 0).toString().replace(',', '.')) || 0;
            // Usar valorTotal (valor do saldo) ao invés de valorUnit
            const vTotal = parseFloat(String(it.valorTotal || it.vlrTotal || 0).toString().replace(/\./g, '').replace(',', '.')) || 0;
            totalQty += q;
            totalValue += vTotal;
        });

        fields.push(String(Math.round(totalQty)));
        // totalValue em centavos (multiplicar por 100)
        fields.push(String(Math.round(totalValue * 100)));
        fields.push('FIM');
        return fields.join(this.sep) + this.term;
    }

    // ===== util =====
    normalize(str) {
        if (str === null || str === undefined) return '';
        return String(str).trim();
    }

    truncate(str, maxLen) {
        if (str === null || str === undefined) return '';
        return str.length > maxLen ? str.substring(0, maxLen) : str;
    }

    normalizeNumber(value) {
        if (value === null || value === undefined) return '0';
        // remove pontos e trocar vírgula por ponto
        const s = String(value).replace(/\./g, '').replace(/,/g, '.');
        const n = parseFloat(s);
        if (isNaN(n)) return '0';
        // Retornar sem casas decimais (conforme exemplo) ou arredondado
        return String(Math.round(n));
    }

    normalizeNumberInt(value) {
        if (value === null || value === undefined) return '0';
        // remove pontos e trocar vírgula por ponto
        const s = String(value).replace(/\./g, '').replace(/,/g, '.');
        const n = parseFloat(s);
        if (isNaN(n)) return '0';
        // Retornar como inteiro
        return String(Math.floor(n));
    }

    normalizeNumberCentavos(value) {
        if (value === null || value === undefined) return '0';
        // remove pontos (separadores de milhares) e trocar vírgula por ponto
        const s = String(value).replace(/\./g, '').replace(/,/g, '.');
        const n = parseFloat(s);
        if (isNaN(n)) return '0';
        // Multiplicar por 100 para converter para centavos (inteiro)
        return String(Math.round(n * 100));
    }

    normalizeBoolean(v) {
        if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
        const s = String(v).toLowerCase();
        if (s === 'true' || s === '1' || s === 'yes') return 'TRUE';
        return 'FALSE';
    }

    formatTimestamp(date) {
        // Formato: ddMMyyyyHHmmss (por exemplo 04052017083540)
        const pad = (n, z = 2) => String(n).padStart(z, '0');
        return pad(date.getDate(),2) + pad(date.getMonth()+1,2) + date.getFullYear() + pad(date.getHours(),2) + pad(date.getMinutes(),2) + pad(date.getSeconds(),2);
    }

    /**
     * Salva o texto formatado em arquivo
     */
    saveToFile(formattedData, outputPath) {
        try {
            const dir = path.dirname(outputPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(outputPath, formattedData, 'utf8');
            console.log(`✓ Arquivo TXT salvo: ${outputPath}`);
            return outputPath;
        } catch (error) {
            console.error('Erro ao salvar arquivo:', error);
            throw new Error(`Erro ao salvar arquivo: ${error.message}`);
        }
    }
}

module.exports = TxtFormatterService;
