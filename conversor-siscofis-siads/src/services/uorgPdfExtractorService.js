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
        const lines = text.split('\n');
        const uorgs = [];
        const seen  = new Set(); // evita duplicatas pelo nome da DEPENDÊNCIA

        for (const raw of lines) {
            // Normaliza tabs para espaço e divide por 2+ espaços
            const parts = raw.replace(/\t/g, ' ').trim().split(/\s{2,}/).map(p => p.trim()).filter(p => p);

            // Linhas de dados têm ≥7 partes e a segunda parte é o IDS do detentor direto
            if (parts.length < 7) continue;
            if (!/^IDS\d+$/.test(parts[1])) continue;

            const dependencia   = parts[0];
            const idsIdentifier = parts[1];              // ex.: "IDS0522295047"
            const postoGradNome = parts[parts.length - 2]; // penúltimo campo = NOME DETENTOR DIRETO

            // Deduplica: mesma DEPENDÊNCIA pode aparecer com diferentes detentores
            if (seen.has(dependencia)) continue;
            seen.add(dependencia);

            const idsNumber = idsIdentifier.replace(/^IDS/, '');
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
