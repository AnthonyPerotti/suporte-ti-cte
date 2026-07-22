const router = require('express').Router();
const ctrl = require('../controllers/template.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate, authorize('admin', 'technician'));
router.get('/', ctrl.listTemplates);
router.post('/', ctrl.createTemplate);
router.put('/:id', ctrl.updateTemplate);
router.delete('/:id', ctrl.deleteTemplate);
router.patch('/:id/restore', authorize('admin'), ctrl.restoreTemplate);

module.exports = router;
