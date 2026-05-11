const fs   = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR   = path.join(__dirname, '../../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

function normalizeCpf(cpf) {
    return cpf.replace(/\D/g, '');
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function ensureStore() {
    if (!fs.existsSync(DATA_DIR))   fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]', 'utf8');
}

function readUsers() {
    ensureStore();
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}

function writeUsers(users) {
    ensureStore();
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

function safeUser(user) {
    const { passwordHash, ...rest } = user;
    return rest;
}

class AuthService {
    async register(data) {
        const users = readUsers();
        const cpf   = normalizeCpf(data.cpf);

        if (users.find(u => u.cpf === cpf)) {
            throw new Error('CPF já cadastrado no sistema');
        }
        if (users.find(u => u.email.toLowerCase() === data.email.toLowerCase())) {
            throw new Error('E-mail já cadastrado no sistema');
        }
        if (!data.password || data.password.length < 6) {
            throw new Error('A senha deve ter no mínimo 6 caracteres');
        }

        const passwordHash = await bcrypt.hash(data.password, 10);
        const user = {
            id:           generateId(),
            nomeCompleto: data.nomeCompleto.trim(),
            nomeGuerra:   data.nomeGuerra.trim().toUpperCase(),
            idtMilitar:   data.idtMilitar.trim(),
            postoGrad:    data.postoGrad,
            cpf,
            om:           data.om.trim().toUpperCase(),
            email:        data.email.trim().toLowerCase(),
            cidade:       data.cidade.trim(),
            passwordHash,
            createdAt:    new Date().toISOString()
        };
        users.push(user);
        writeUsers(users);
        return safeUser(user);
    }

    async login(cpf, password) {
        const users = readUsers();
        const user  = users.find(u => u.cpf === normalizeCpf(cpf));
        if (!user) throw new Error('CPF ou senha inválidos');
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) throw new Error('CPF ou senha inválidos');
        return safeUser(user);
    }

    findById(id) {
        const users = readUsers();
        const user  = users.find(u => u.id === id);
        return user ? safeUser(user) : null;
    }
}

module.exports = new AuthService();
