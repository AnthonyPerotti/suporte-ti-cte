const router = require('express').Router();
const ctrl = require('../controllers/category.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);
router.get('/', ctrl.listCategories);
router.post('/', authorize('admin'), ctrl.createCategory);
router.put('/:id', authorize('admin'), ctrl.updateCategory);
router.delete('/:id', authorize('admin'), ctrl.deleteCategory);

module.exports = router;
