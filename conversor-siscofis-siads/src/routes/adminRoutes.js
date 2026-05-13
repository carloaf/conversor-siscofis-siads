const express                           = require('express');
const router                            = express.Router();
const adminCtrl                         = require('../controllers/adminController');
const { requireAdmin, requireSuperAdmin } = require('../middlewares/adminMiddleware');

router.get('/login',                        adminCtrl.showLogin.bind(adminCtrl));
router.post('/login',                       adminCtrl.doLogin.bind(adminCtrl));
router.get('/logout',                       adminCtrl.doLogout.bind(adminCtrl));
router.get('/',                             requireAdmin,      adminCtrl.getDashboard.bind(adminCtrl));
router.get('/api/stats',                    requireAdmin,      adminCtrl.getStats.bind(adminCtrl));
router.get('/api/users/:id',                requireAdmin,      adminCtrl.getUser.bind(adminCtrl));
router.delete('/api/users/:id',             requireSuperAdmin, adminCtrl.deleteUser.bind(adminCtrl));
router.put('/api/users/:id',                requireSuperAdmin, adminCtrl.updateUser.bind(adminCtrl));
router.patch('/api/users/:id/role',         requireSuperAdmin, adminCtrl.updateRole.bind(adminCtrl));

module.exports = router;
