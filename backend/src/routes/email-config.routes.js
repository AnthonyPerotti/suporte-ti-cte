const router = require('express').Router();
const ctrl = require('../controllers/email-config.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);
router.use(authorize('admin'));

router.get('/', ctrl.getEmailConfig);
router.put('/', ctrl.updateEmailConfig);
router.post('/test', ctrl.testEmailConfig);

router.get('/templates', ctrl.getEmailTemplates);
router.put('/templates/:key', ctrl.updateEmailTemplate);

module.exports = router;
