const router = require('express').Router();
const ctrl = require('../controllers/report.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate, authorize('admin', 'technician'));
router.get('/dashboard', ctrl.getDashboard);
router.get('/', ctrl.getReports);
router.get('/export', ctrl.exportCsv);

module.exports = router;
