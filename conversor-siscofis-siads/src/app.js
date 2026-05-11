const express = require('express');
const path = require('path');
const session = require('express-session');
const uploadRoutes = require('./routes/uploadRoutes');
const authRoutes   = require('./routes/authRoutes');
const { requireAuth } = require('./middlewares/authMiddleware');
const appConfig = require('../config/app.config');

const app  = express();
const PORT = appConfig.PORT;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sessão
app.use(session({
    secret: appConfig.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, maxAge: 8 * 60 * 60 * 1000 } // 8h
}));

// Página principal — exige autenticação (deve vir ANTES do static middleware)
app.get('/', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Arquivos estáticos públicos (login.html, register.html — index:false para não auto-servir index.html)
app.use(express.static(path.join(__dirname, '../public'), { index: false }));

// Arquivos de output exigem autenticação
app.use('/output', requireAuth, express.static(path.join(__dirname, '../output')));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Conversor-SISCOFIS-SIADS is running' });
});

// Rotas de autenticação (públicas)
app.use('/api/auth', authRoutes);

// Rotas protegidas
app.use('/api/upload', requireAuth, uploadRoutes);

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Something went wrong!',
        message: err.message 
    });
});

app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`Conversor-SISCOFIS-SIADS is running!`);
    console.log(`Port: ${PORT}`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`========================================`);
});