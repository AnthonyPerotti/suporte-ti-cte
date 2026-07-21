const router = require('express').Router();
const ctrl = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);

router.get('/technicians', ctrl.getTechnicians);
router.get('/', authorize('admin'), ctrl.listUsers);
router.get('/:id', ctrl.getUser);
router.post('/', authorize('admin'), ctrl.createUser);
router.put('/:id', ctrl.updateUser);
router.post('/:id/reset-password', authorize('admin'), ctrl.resetPassword);

module.exports = router;
