const PdfExtractorService = require('../services/pdfExtractorService');
const TxtFormatterService = require('../services/txtFormatterService');
const { logConversion }   = require('../services/reportService');
const path = require('path');
const fs   = require('fs');

class UploadController {
    constructor() {
        this.pdfExtractorService = new PdfExtractorService();
        this.txtFormatterService = new TxtFormatterService();
    }

    /**
     * Manipula o upload e processamento do arquivo PDF
     */
    async handleUpload(req, res) {
        try {
            // Validar se o arquivo foi enviado
            if (!req.file) {
                return res.status(400).json({ 
                    success: false,
                    error: 'Nenhum arquivo foi enviado.' 
                });
            }

            console.log(`\n=== Processando arquivo PDF ===`);
            console.log(`Arquivo: ${req.file.originalname}`);
            console.log(`Tamanho: ${(req.file.size / 1024).toFixed(2)} KB`);

            const pdfFilePath = req.file.path;
            
            // Extrair dados do PDF
            console.log(`\n1. Extraindo dados do PDF...`);
            const extractedData = await this.pdfExtractorService.extractData(pdfFilePath);

            // Injeta CPF do usuário logado no header para o campo 6 da linha H
            if (req.session && req.session.user && req.session.user.cpf) {
                extractedData.header.bigNumber = req.session.user.cpf;
            }
            
            // Formatar dados para TXT
            console.log(`2. Formatando dados para TXT...`);
            const formatOptions = {};
            if (req.body.uorg) {
                formatOptions.almoxarifadoCode = req.body.uorg.trim();
            }
            const formattedOutput = this.txtFormatterService.formatData(extractedData, formatOptions);
            
            // Salvar no diretório de output
            const outputDir = path.join(__dirname, '../../output');
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            
            // Formato: OM_contacontabil_contacorrente_dia-mes-ano.txt
            const now = new Date();
            const dia = String(now.getDate()).padStart(2, '0');
            const mes = String(now.getMonth() + 1).padStart(2, '0');
            const ano = now.getFullYear();
            const om = (req.session && req.session.user && req.session.user.om) || extractedData.om || 'OM';
            const contaContabil = extractedData.contaContabil || '000000000';
            const contaCorrente = extractedData.contaCorrente || '0001';
            const outputFileName = `${om}_${contaContabil}_${contaCorrente}_${dia}-${mes}-${ano}.txt`;
            const outputPath = path.join(outputDir, outputFileName);
            
            console.log(`3. Salvando arquivo TXT...`);
            this.txtFormatterService.saveToFile(formattedOutput, outputPath);

            // Registrar conversão para relatório admin
            const sessionUser = req.session && req.session.user;
            logConversion({
                userCpf:    sessionUser ? sessionUser.cpf       : 'desconhecido',
                userName:   sessionUser ? sessionUser.nomeGuerra : 'desconhecido',
                userOM:     sessionUser ? sessionUser.om         : 'desconhecida',
                pdfName:    req.file.originalname,
                outputFile: outputFileName,
                itemsCount: extractedData.items ? extractedData.items.length : 0
            });

            // Limpar arquivo PDF temporário
            console.log(`4. Limpando arquivos temporários...`);
            fs.unlinkSync(pdfFilePath);
            
            console.log(`\n✓ Processamento concluído com sucesso!`);
            console.log(`================================\n`);
            
            // Retornar resposta com sucesso
            res.status(200).json({
                success: true,
                message: 'Arquivo processado com sucesso',
                data: {
                    outputFile: outputFileName,
                    outputPath: `/output/${outputFileName}`,
                    itemsCount: extractedData.items ? extractedData.items.length : 0,
                    extractedData: {
                        title: extractedData.title,
                        date: extractedData.dates,
                        deposito: extractedData.deposito,
                        itemsCount: extractedData.items ? extractedData.items.length : 0
                    }
                }
            });
            
        } catch (error) {
            console.error('\n✗ Erro ao processar arquivo:', error);
            
            // Limpar arquivo temporário em caso de erro
            if (req.file && req.file.path && fs.existsSync(req.file.path)) {
                try {
                    fs.unlinkSync(req.file.path);
                } catch (cleanupError) {
                    console.error('Erro ao limpar arquivo temporário:', cleanupError);
                }
            }
            
            res.status(500).json({ 
                success: false,
                error: 'Erro ao processar o arquivo',
                message: error.message 
            });
        }
    }

    /**
     * Detecta o tipo de inventário a partir do título do PDF
     * Retorna { inventoryType: 'POR_CONTA' | 'POR_DEPOSITO', title }
     */
    async detectInventoryType(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'Nenhum arquivo foi enviado.'
                });
            }

            const pdfFilePath = req.file.path;

            // Extrai apenas o título do PDF
            const dataBuffer = fs.readFileSync(pdfFilePath);
            const pdfParse = require('pdf-parse');
            const pdfData = await pdfParse(dataBuffer);

            const title = this.pdfExtractorService.extractTitle(pdfData.text);

            // Determina o tipo de inventário — busca no texto COMPLETO do PDF,
            // não apenas no título (que pode falhar se não tiver colchetes)
            const isPorDeposito = /POR\s+DEP[ÓO]SITO/i.test(pdfData.text) && !/POR\s+CONTA/i.test(pdfData.text);
            const inventoryType = isPorDeposito ? 'POR_DEPOSITO' : 'POR_CONTA';

            // Limpa o arquivo temporário
            fs.unlinkSync(pdfFilePath);

            res.status(200).json({
                success: true,
                data: {
                    inventoryType,
                    title: title
                }
            });

        } catch (error) {
            console.error('Erro ao detectar tipo de inventário:', error);
            if (req.file && req.file.path && fs.existsSync(req.file.path)) {
                try { fs.unlinkSync(req.file.path); } catch (_) {}
            }
            res.status(500).json({
                success: false,
                error: 'Erro ao analisar o PDF',
                message: error.message
            });
        }
    }

    /**
     * Lista arquivos processados no diretório output
     */
    async listProcessedFiles(req, res) {
        try {
            const outputDir = path.join(__dirname, '../../output');
            
            if (!fs.existsSync(outputDir)) {
                return res.status(200).json({
                    success: true,
                    files: []
                });
            }
            
            const files = fs.readdirSync(outputDir)
                .filter(file => file.endsWith('.txt'))
                .map(file => {
                    const filePath = path.join(outputDir, file);
                    const stats = fs.statSync(filePath);
                    return {
                        name: file,
                        size: stats.size,
                        created: stats.birthtime,
                        modified: stats.mtime
                    };
                })
                .sort((a, b) => b.created - a.created);
            
            res.status(200).json({
                success: true,
                count: files.length,
                files: files
            });
            
        } catch (error) {
            console.error('Erro ao listar arquivos:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao listar arquivos processados',
                message: error.message
            });
        }
    }
}

module.exports = new UploadController();
