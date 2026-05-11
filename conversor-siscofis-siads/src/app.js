const express = require('express');
const path = require('path');
const uploadRoutes = require('./routes/uploadRoutes');
const appConfig = require('../config/app.config');

const app = express();
const PORT = appConfig.PORT;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, '../public')));
app.use('/output', express.static(path.join(__dirname, '../output')));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'PDF Extractor API is running' });
});

// Routes
app.use('/api/upload', uploadRoutes);

// Root route - servir index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Something went wrong!',
        message: err.message 
    });
});

app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`PDF Extractor Server is running!`);
    console.log(`Port: ${PORT}`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Upload endpoint: http://localhost:${PORT}/api/upload`);
    console.log(`========================================`);
});