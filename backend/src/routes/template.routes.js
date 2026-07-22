const router = require('express').Router();
const ctrl = require('../controllers/template.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);
router.get('/', authorize('admin', 'technician'), ctrl.listTemplates);
router.post('/', authorize('admin'), ctrl.createTemplate);
router.put('/:id', authorize('admin'), ctrl.updateTemplate);
router.delete('/:id', authorize('admin'), ctrl.deleteTemplate);
router.patch('/:id/restore', authorize('admin'), ctrl.restoreTemplate);

module.exports = router;
