const ADMIN_CPF = '93428979087';

// Permite acesso ao painel para admin e manager
function requireAdmin(req, res, next) {
    const role = req.session && req.session.adminRole;
    if (role === 'admin' || role === 'manager') {
        return next();
    }
    res.redirect('/admin/login');
}

// Permite apenas admin (para ações destrutivas/sensíveis)
function requireSuperAdmin(req, res, next) {
    if (req.session && req.session.adminRole === 'admin') {
        return next();
    }
    res.status(403).json({ success: false, message: 'Ação restrita ao administrador' });
}

module.exports = { requireAdmin, requireSuperAdmin, ADMIN_CPF };
