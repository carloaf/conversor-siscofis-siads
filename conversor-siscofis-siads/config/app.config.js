module.exports = {
    PORT:           process.env.PORT       || 3000,
    SESSION_SECRET: process.env.SESSION_SECRET || 'siads-siscofis-secret-change-in-prod',
    UPLOAD_DIR: 'uploads/',
    OUTPUT_DIR: 'output/',
    PDF_MIME_TYPE: 'application/pdf',
    TXT_EXTENSION: '.txt',
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5 MB
    ALLOWED_FILE_TYPES: ['application/pdf'],
};