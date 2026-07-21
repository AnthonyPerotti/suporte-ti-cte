const router = require('express').Router();
const ctrl = require('../controllers/knowledge.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);
router.get('/suggest', ctrl.suggestArticles);
router.get('/', ctrl.listArticles);
router.get('/:id', ctrl.getArticle);
router.post('/', authorize('admin', 'technician'), ctrl.createArticle);
router.put('/:id', authorize('admin', 'technician'), ctrl.updateArticle);
router.delete('/:id', authorize('admin'), ctrl.deleteArticle);

module.exports = router;
