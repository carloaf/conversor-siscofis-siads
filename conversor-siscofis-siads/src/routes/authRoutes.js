const express = require('express');
const router  = express.Router();
const authController = require('../controllers/authController');

router.post('/register', (req, res) => authController.register(req, res));
router.post('/login',    (req, res) => authController.login(req, res));
router.post('/logout',   (req, res) => authController.logout(req, res));
router.get('/me',        (req, res) => authController.me(req, res));

module.exports = router;
