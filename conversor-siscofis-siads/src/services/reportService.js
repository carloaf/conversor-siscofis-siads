const fs   = require('fs');
const path = require('path');

const DATA_DIR         = path.join(__dirname, '../../data');
const CONVERSIONS_FILE = path.join(DATA_DIR, 'conversions.json');

function ensureStore() {
    if (!fs.existsSync(DATA_DIR))         fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(CONVERSIONS_FILE)) fs.writeFileSync(CONVERSIONS_FILE, '[]', 'utf8');
}

function readConversions() {
    ensureStore();
    return JSON.parse(fs.readFileSync(CONVERSIONS_FILE, 'utf8'));
}

function writeConversions(data) {
    ensureStore();
    fs.writeFileSync(CONVERSIONS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Registra uma conversão realizada por um usuário.
 * @param {object} entry - { userCpf, userName, userOM, pdfOriginalName, outputFile, itemsCount }
 */
function logConversion(entry) {
    const conversions = readConversions();
    conversions.push({
        id:          Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        userCpf:     entry.userCpf     || '',
        userName:    entry.userName    || '',
        userOM:      entry.userOM      || '',
        pdfName:     entry.pdfName     || '',
        outputFile:  entry.outputFile  || '',
        itemsCount:  entry.itemsCount  || 0,
        processedAt: new Date().toISOString()
    });
    writeConversions(conversions);
}

/**
 * Retorna todas as conversões, mais recentes primeiro.
 */
function getAllConversions() {
    return readConversions().slice().reverse();
}

/**
 * Retorna agrupamento de conversões por OM.
 */
function getConversionsByOM() {
    const conversions = readConversions();
    const byOM = {};
    for (const c of conversions) {
        const om = c.userOM || 'N/A';
        if (!byOM[om]) byOM[om] = { om, conversions: 0, totalItems: 0 };
        byOM[om].conversions++;
        byOM[om].totalItems += c.itemsCount || 0;
    }
    return Object.values(byOM).sort((a, b) => b.conversions - a.conversions);
}

module.exports = { logConversion, getAllConversions, getConversionsByOM };
