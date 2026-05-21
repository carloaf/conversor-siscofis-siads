'use strict';

const express        = require('express');
const multer         = require('multer');
const uorgController = require('../controllers/uorgController');
const upload         = require('../middlewares/uploadMiddleware');

// Instância separada com memoryStorage para que req.file.buffer esteja disponível
const uploadMemory = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Apenas arquivos PDF são permitidos!'), false);
    },
});

const router = express.Router();

// POST /api/uorg/extract — extrai UORGs do RelatorioDependUORG.pdf
router.post('/extract', uploadMemory.single('pdf'), uorgController.extractFromPdf);

// POST /api/uorg — gera o arquivo UORG para o SIADS
router.post('/', uorgController.generate);

module.exports = router;
