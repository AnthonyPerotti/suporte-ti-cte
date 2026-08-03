const router = require('express').Router();
const ctrl = require('../controllers/audit.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);
router.use(authorize('admin', 'root'));

router.get('/', ctrl.listAuditLogs);
router.get('/export', ctrl.exportAuditLogs);

module.exports = router;
