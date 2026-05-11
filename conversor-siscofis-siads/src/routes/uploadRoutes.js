const express = require('express');
const uploadController = require('../controllers/uploadController');
const upload = require('../middlewares/uploadMiddleware');

const router = express.Router();

// Rota para upload e processamento de PDF
router.post('/', upload.single('pdf'), (req, res) => {
    uploadController.handleUpload(req, res);
});

// Rota para listar arquivos processados
router.get('/files', (req, res) => {
    uploadController.listProcessedFiles(req, res);
});

module.exports = router;
