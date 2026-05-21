'use strict';

const fs   = require('fs');
const path = require('path');
const UorgFormatterService      = require('../services/uorgFormatterService');
const UorgPdfExtractorService   = require('../services/uorgPdfExtractorService');

const formatter  = new UorgFormatterService();
const extractor  = new UorgPdfExtractorService();

// ── POST /api/uorg/extract ─────────────────────────────────────────────────
exports.extractFromPdf = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Nenhum arquivo enviado.' });
        }
        const uorgs = await extractor.extractFromBuffer(req.file.buffer);
        if (!uorgs.length) {
            return res.status(400).json({
                success: false,
                error: 'Nenhuma UORG encontrada. Verifique se o arquivo é o RelatorioDependUORG gerado pelo SISCOFIS OM.',
            });
        }
        return res.json({ success: true, data: { uorgs, count: uorgs.length } });
    } catch (err) {
        console.error('Erro ao extrair UORG do PDF:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
};

// ── POST /api/uorg ─────────────────────────────────────────────────────────
exports.generate = (req, res) => {
    try {
        const { header, uorgs } = req.body;

        if (!header || !header.uasg) {
            return res.status(400).json({ success: false, error: 'UASG não informada.' });
        }
        if (!Array.isArray(uorgs) || uorgs.length === 0) {
            return res.status(400).json({ success: false, error: 'Nenhuma UORG informada.' });
        }

        // Usa CPF da sessão se não foi enviado no header
        if (!header.cpf && req.session && req.session.user) {
            header.cpf = req.session.user.cpf;
        }

        const content = formatter.format(header, uorgs);

        const now     = new Date();
        const dateStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
        const filename = `UORG_${header.uasg}_${dateStr}.txt`;

        const outputDir = path.join(__dirname, '../../output');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        const outputPath = path.join(outputDir, filename);
        fs.writeFileSync(outputPath, content, 'utf8');

        return res.json({
            success: true,
            data: {
                outputFile: filename,
                outputPath: `/output/${filename}`,
                count: uorgs.length,
            },
        });
    } catch (err) {
        console.error('Erro ao gerar arquivo UORG:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
};
