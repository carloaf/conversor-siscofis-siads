const authService = require('../services/authService');

class AuthController {
    async register(req, res) {
        try {
            const { nomeCompleto, nomeGuerra, idtMilitar, postoGrad,
                    cpf, om, email, cidade, password, confirmPassword } = req.body;

            const required = { nomeCompleto, nomeGuerra, idtMilitar, postoGrad, cpf, om, email, cidade, password };
            for (const [field, val] of Object.entries(required)) {
                if (!val || !String(val).trim()) {
                    return res.status(400).json({ success: false, message: `Campo obrigatório não preenchido: ${field}` });
                }
            }
            if (password !== confirmPassword) {
                return res.status(400).json({ success: false, message: 'As senhas não conferem' });
            }

            const user = await authService.register({ nomeCompleto, nomeGuerra, idtMilitar, postoGrad, cpf, om, email, cidade, password });
            res.json({ success: true, message: 'Cadastro realizado com sucesso!', data: user });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }

    async login(req, res) {
        try {
            const { cpf, password } = req.body;
            if (!cpf || !password) {
                return res.status(400).json({ success: false, message: 'CPF e senha são obrigatórios' });
            }
            const user = await authService.login(cpf, password);
            req.session.user = user;
            res.json({ success: true, data: user });
        } catch (err) {
            res.status(401).json({ success: false, message: err.message });
        }
    }

    logout(req, res) {
        req.session.destroy(() => {
            res.json({ success: true });
        });
    }

    me(req, res) {
        if (req.session && req.session.user) {
            // Refresh user data from store (in case it was updated)
            const fresh = authService.findById(req.session.user.id);
            if (fresh) {
                req.session.user = fresh;
                return res.json({ success: true, data: fresh });
            }
        }
        res.status(401).json({ success: false, message: 'Não autenticado' });
    }
}

module.exports = new AuthController();
