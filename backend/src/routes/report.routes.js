const router = require('express').Router();
const ctrl = require('../controllers/report.controller');
const exportCtrl = require('../controllers/report-export.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate, authorize('admin', 'technician'));
router.get('/dashboard', ctrl.getDashboard);
router.get('/', ctrl.getReports);
router.get('/export', ctrl.exportCsv);
router.get('/export/pdf', exportCtrl.exportPdf);
router.get('/export/excel', exportCtrl.exportExcel);

router.post('/purge', authorize('admin'), ctrl.purgeTickets);

module.exports = router;
