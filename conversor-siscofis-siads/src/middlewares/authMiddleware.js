/**
 * Middleware de autenticação — exige sessão ativa.
 * Rotas de API retornam 401 JSON; requisições de browser redirecionam para /login.html
 */
function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    const isApiRequest = req.path.startsWith('/api/') ||
                         (req.headers['content-type'] || '').includes('json') ||
                         req.headers['x-requested-with'] === 'XMLHttpRequest';
    if (isApiRequest) {
        return res.status(401).json({ success: false, message: 'Não autenticado' });
    }
    res.redirect('/login.html');
}

module.exports = { requireAuth };
