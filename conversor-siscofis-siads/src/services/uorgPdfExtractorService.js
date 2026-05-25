'use strict';

const pdfParse = require('pdf-parse');

/**
 * Extrai UORGs do relatório "RelatorioDependUORG.pdf" gerado pelo SISCOFIS OM.
 *
 * Estrutura do relatório:
 *   ORGANIZAÇÃO MILITAR | DEPENDÊNCIA | IDENTIFICADOR (IDS+digits) | POSTO/GRAD NOME | S/N
 *
 * Campos extraídos:
 *   nome, sigla, nomeReduzido  ← DEPENDÊNCIA
 *   nomeResponsavel            ← POSTO/GRAD + NOME do Detentor Direto
 *   matriculaSiape             ← dígitos do IDENTIFICADOR (sem o prefixo "IDS")
 *
 * Campos NÃO presentes no PDF (preenchimento manual ou campos comuns):
 *   codigo, ugVinculada, endereco, cep, uf, municipio, pais, telefone,
 *   ramal, email, cpfResponsavel, portaria, uorgSubordinada,
 *   dataCriacao, nrDocCriacao, codigoSiorg, almoxarifado
 */
class UorgPdfExtractorService {
    /**
     * @param {Buffer} buffer  Conteúdo binário do PDF
     * @returns {Promise<Array>} Array de objetos UORG parcialmente preenchidos
     */
    async extractFromBuffer(buffer) {
        const data = await pdfParse(buffer);
        return this.parseText(data.text);
    }

    /**
     * Processa o texto extraído pelo pdf-parse e retorna os registros.
     *
     * Formato real das linhas de dados (separadas por 2+ espaços):
     *   DEPENDÊNCIA | IDS_DIRETO | OM | IDS_INDIRETO | USU_IND | NOME_INDIRETO | NOME_DIRETO | USU_DIR
     *
     * @param {string} text
     * @returns {Array}
     */
    parseText(text) {
        // Pré-processa: une linhas quebradas pelo pdf-parse.
        // Uma linha é "quebrada" quando tem IDS em parts[1] mas < 7 partes — o restante
        // ficou na linha seguinte (ex.: nome do detentor longo demais para a página).
        const rawLines = text.split('\n');
        const lines = [];
        for (let i = 0; i < rawLines.length; i++) {
            const p = rawLines[i].replace(/\t/g, ' ').trim().split(/\s{2,}/).map(s => s.trim()).filter(s => s);
            if (p.length >= 2 && p.length < 7 && /^IDS\d+$/.test(p[1]) && i + 1 < rawLines.length) {
                lines.push(rawLines[i] + rawLines[i + 1]); // junta com a próxima linha
                i++; // pula a linha de continuação
            } else {
                lines.push(rawLines[i]);
            }
        }

        const uorgs = [];
        // Sem deduplicação automática: todas as linhas do PDF são importadas.
        // Entradas repetidas (artefatos de quebra de página ou seções distintas com mesmo nome)
        // ficam visíveis na tabela para que o usuário decida o que manter.

        for (const raw of lines) {
            // Normaliza tabs para espaço e divide por 2+ espaços
            const parts = raw.replace(/\t/g, ' ').trim().split(/\s{2,}/).map(p => p.trim()).filter(p => p);

            // Linhas de dados têm ≥7 partes e a segunda parte é o IDS do detentor direto
            // (aceita também "Não informado" para UORGs sem detentor cadastrado no SISCOFIS)
            if (parts.length < 7) continue;
            const hasIds = /^IDS\d+$/.test(parts[1]);
            const noIds  = /^Não\s/i.test(parts[1]);
            if (!hasIds && !noIds) continue;

            const dependencia   = parts[0];
            const idsIdentifier = hasIds ? parts[1] : '';  // ex.: "IDS0522295047" ou vazio
            const postoGradNome = hasIds ? parts[parts.length - 2] : ''; // penúltimo = NOME DETENTOR DIRETO


            const idsNumber = idsIdentifier ? idsIdentifier.replace(/^IDS/, '') : '';
            const sigla     = dependencia.length <= 16 ? dependencia : dependencia.substring(0, 16).trim();
            const nomeReduz = dependencia.length <= 40 ? dependencia : dependencia.substring(0, 40).trim();

            uorgs.push({
                // Extraídos do PDF
                nome:            dependencia,
                sigla:           sigla,
                nomeReduzido:    nomeReduz,
                nomeResponsavel: postoGradNome,
                matriculaSiape:  idsNumber,
                // Campos em branco — usuário preenche manualmente ou via "Campos Comuns"
                codigo:          '',
                ugVinculada:     '',
                endereco:        '',
                cep:             '',
                uf:              '',
                municipio:       '',
                pais:            'BRASIL',
                telefone:        '',
                ramal:           '',
                email:           '',
                cpfResponsavel:  '',
                portaria:        '',
                uorgSubordinada: '',
                dataCriacao:     '',
                nrDocCriacao:    '',
                codigoSiorg:     '',
                almoxarifado:    'NAO',
            });
        }

        return uorgs;
    }
}

module.exports = UorgPdfExtractorService;
