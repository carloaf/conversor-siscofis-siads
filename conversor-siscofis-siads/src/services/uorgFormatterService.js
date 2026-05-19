'use strict';

class UorgFormatterService {
    /**
     * Gera o conteúdo do arquivo UORG para o SIADS.
     *
     * Leiaute (Orientações Gerais v6.21):
     *   H¥UO¥seq¥órgão¥UASG¥CPF¥£
     *   D¥CODIGO¥UG_VINCULADA¥NOME¥SIGLA¥ENDERECO¥CEP¥PAIS¥TELEFONE¥RAMAL¥
     *     CPF_RESP¥NOME_RESP¥MATRICULA_SIAPE¥NR_PORTARIA¥UORG_SUBORDINADA¥
     *     NOME_REDUZIDO¥DATA_CRIACAO¥NR_DOC_CRIACAO¥UF¥MUNICIPIO¥EMAIL¥
     *     COD_SIORG¥ALMOXARIFADO¥£
     *   T¥ddMMyyyyHHmmss¥qtd_registros¥FIM¥£
     *
     * @param {Object} header - { orgao, uasg, cpf }
     * @param {Array}  uorgs  - array de objetos com campos de cada UORG
     * @returns {string}
     */
    format(header, uorgs) {
        const now = new Date();
        const pad = (n, len) => String(n).padStart(len, '0');
        const dateFmt =
            pad(now.getDate(), 2) +
            pad(now.getMonth() + 1, 2) +
            now.getFullYear() +
            pad(now.getHours(), 2) +
            pad(now.getMinutes(), 2) +
            pad(now.getSeconds(), 2);

        const cpfLimpo = (header.cpf || '').replace(/\D/g, '');

        const hLine = `H¥UO¥1¥${header.orgao || ''}¥${header.uasg || ''}¥${cpfLimpo}¥£`;

        const dLines = uorgs.map(u => {
            const cepLimpo      = (u.cep             || '').replace(/\D/g, '');
            const cpfRespLimpo  = (u.cpfResponsavel  || '').replace(/\D/g, '');
            // Data de criação: aceita ddMMyyyy ou dd/MM/yyyy
            const dataLimpa     = (u.dataCriacao     || '').replace(/\D/g, '');

            const fields = [
                'D',
                u.codigo,
                u.ugVinculada,
                u.nome,
                u.sigla,
                u.endereco,
                cepLimpo,
                u.pais || 'BRASIL',
                u.telefone,
                u.ramal          || '',
                cpfRespLimpo,
                u.nomeResponsavel,
                u.matriculaSiape,
                u.portaria       || '',
                u.uorgSubordinada || '',
                u.nomeReduzido,
                dataLimpa,
                u.nrDocCriacao,
                u.uf,
                u.municipio,
                u.email,
                u.codigoSiorg,
                u.almoxarifado === true || u.almoxarifado === 'SIM' ? 'SIM' : 'NAO',
            ];
            return fields.join('¥') + '¥£';
        });

        const tLine = `T¥${dateFmt}¥${uorgs.length}¥FIM¥£`;

        return [hLine, ...dLines, tLine].join('\r\n');
    }
}

module.exports = UorgFormatterService;
