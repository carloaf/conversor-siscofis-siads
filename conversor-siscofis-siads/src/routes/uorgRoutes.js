'use strict';

const express        = require('express');
const uorgController = require('../controllers/uorgController');

const router = express.Router();

// POST /api/uorg — gera o arquivo UORG para o SIADS
router.post('/', uorgController.generate);

module.exports = router;
