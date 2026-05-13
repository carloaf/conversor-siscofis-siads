const path    = require('path');
const fs      = require('fs');
const bcrypt  = require('bcryptjs');
const { ADMIN_CPF }                             = require('../middlewares/adminMiddleware');
const { getAllConversions, getConversionsByOM } = require('../services/reportService');

const DATA_DIR   = path.join(__dirname, '../../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

function readUsers() {
    if (!fs.existsSync(USERS_FILE)) return [];
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}

function writeUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

function normalizeCpf(cpf) {
    return (cpf || '').replace(/\D/g, '');
}

const VALID_ROLES = ['user', 'manager', 'admin'];

class AdminController {

    showLogin(req, res) {
        const role = req.session && req.session.adminRole;
        if (role === 'admin' || role === 'manager') {
            return res.redirect('/admin');
        }
        res.sendFile(path.join(__dirname, '../../public/admin-login.html'));
    }

    async doLogin(req, res) {
        const cpf      = normalizeCpf(req.body.cpf);
        const password = req.body.password || '';

        const users = readUsers();
        const user  = users.find(u => u.cpf === cpf);
        if (!user) {
            return res.status(401).json({ success: false, message: 'CPF ou senha inválidos' });
        }

        // Garante que o admin principal sempre tem role admin
        const role = user.cpf === ADMIN_CPF ? 'admin' : (user.role || 'user');

        if (role !== 'admin' && role !== 'manager') {
            return res.status(403).json({ success: false, message: 'Sem permissão para acessar o painel' });
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            return res.status(401).json({ success: false, message: 'CPF ou senha inválidos' });
        }

        req.session.adminRole = role;
        req.session.adminUser = { nomeGuerra: user.nomeGuerra, cpf: user.cpf, om: user.om, role };
        res.json({ success: true });
    }

    doLogout(req, res) {
        req.session.destroy(() => res.redirect('/admin/login'));
    }

    getDashboard(req, res) {
        res.sendFile(path.join(__dirname, '../../public/admin.html'));
    }

    getStats(req, res) {
        const sessionUser  = req.session.adminUser;
        const role         = sessionUser.role;
        const managerOM    = sessionUser.om;

        let users       = readUsers().map(({ passwordHash, ...u }) => u);
        let conversions = getAllConversions();
        let byOM        = getConversionsByOM();

        // Manager vê apenas sua OM
        if (role === 'manager') {
            users       = users.filter(u => u.om === managerOM);
            conversions = conversions.filter(c => c.userOM === managerOM);
            byOM        = null; // não exibido para manager
        }

        const today      = new Date().toISOString().slice(0, 10);
        const todayCount = conversions.filter(c => c.processedAt.startsWith(today)).length;
        const totalItems = conversions.reduce((s, c) => s + (c.itemsCount || 0), 0);

        const usersWithStats = users.map(u => {
            const userConv = conversions.filter(c => c.userCpf === u.cpf);
            return {
                ...u,
                totalConversions: userConv.length,
                totalItems:       userConv.reduce((s, c) => s + (c.itemsCount || 0), 0),
                lastConversion:   userConv.length ? userConv[0].processedAt : null
            };
        });

        res.json({
            adminUser: sessionUser,
            summary: {
                totalUsers:       users.length,
                totalConversions: conversions.length,
                todayConversions: todayCount,
                totalItems
            },
            users:       usersWithStats,
            conversions: conversions.slice(0, 200),
            byOM
        });
    }

    deleteUser(req, res) {
        const { id } = req.params;
        const users  = readUsers();
        const idx    = users.findIndex(u => u.id === id);
        if (idx === -1) return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
        if (users[idx].cpf === ADMIN_CPF) return res.status(403).json({ success: false, message: 'Não é possível excluir o administrador' });
        users.splice(idx, 1);
        writeUsers(users);
        res.json({ success: true });
    }

    async updateUser(req, res) {
        const { id } = req.params;
        const { nomeCompleto, nomeGuerra, idtMilitar, postoGrad, om, email, cidade, password } = req.body;
        const users = readUsers();
        const idx   = users.findIndex(u => u.id === id);
        if (idx === -1) return res.status(404).json({ success: false, message: 'Usuário não encontrado' });

        if (nomeCompleto) users[idx].nomeCompleto = nomeCompleto.trim();
        if (nomeGuerra)   users[idx].nomeGuerra   = nomeGuerra.trim().toUpperCase();
        if (idtMilitar)   users[idx].idtMilitar   = idtMilitar.trim();
        if (postoGrad)    users[idx].postoGrad    = postoGrad;
        if (om)           users[idx].om           = om.trim().toUpperCase();
        if (email)        users[idx].email        = email.trim().toLowerCase();
        if (cidade)       users[idx].cidade       = cidade.trim();
        if (password && password.length >= 6) {
            users[idx].passwordHash = await bcrypt.hash(password, 10);
        }

        writeUsers(users);
        const { passwordHash, ...safe } = users[idx];
        res.json({ success: true, data: safe });
    }

    updateRole(req, res) {
        const { id }   = req.params;
        const { role } = req.body;
        if (!VALID_ROLES.includes(role)) {
            return res.status(400).json({ success: false, message: 'Perfil inválido' });
        }
        const users = readUsers();
        const idx   = users.findIndex(u => u.id === id);
        if (idx === -1) return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
        if (users[idx].cpf === ADMIN_CPF) return res.status(403).json({ success: false, message: 'Não é possível alterar o perfil do administrador principal' });
        users[idx].role = role;
        writeUsers(users);
        res.json({ success: true });
    }

    getUser(req, res) {
        const { id } = req.params;
        const users  = readUsers();
        const user   = users.find(u => u.id === id);
        if (!user) return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
        const { passwordHash, ...safe } = user;
        res.json({ success: true, data: safe });
    }
}

module.exports = new AdminController();
