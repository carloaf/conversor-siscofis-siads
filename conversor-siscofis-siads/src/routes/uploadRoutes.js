const express = require('express');
const uploadController = require('../controllers/uploadController');
const upload = require('../middlewares/uploadMiddleware');

const router = express.Router();

// Rota para upload e processamento de PDF
router.post('/', upload.single('pdf'), (req, res) => {
    uploadController.handleUpload(req, res);
});

// Rota para detectar o tipo de inventário (POR_CONTA ou POR_DEPOSITO)
router.post('/detect', upload.single('pdf'), (req, res) => {
    uploadController.detectInventoryType(req, res);
});

// Rota para extrair dados do PDF sem gerar arquivo (modo revisão)
router.post('/extract-only', upload.single('pdf'), (req, res) => {
    uploadController.extractOnly(req, res);
});

// Rota para gerar arquivo a partir de dados já extraídos
router.post('/generate', (req, res) => {
    uploadController.generateFromData(req, res);
});

// Rota para listar arquivos processados
router.get('/files', (req, res) => {
    uploadController.listProcessedFiles(req, res);
});

module.exports = router;
