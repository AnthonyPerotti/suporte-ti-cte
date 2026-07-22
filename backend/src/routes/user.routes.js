const router = require('express').Router();
const ctrl = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);

const upload = require('../middlewares/upload.middleware');

router.get('/technicians', ctrl.getTechnicians);
router.get('/', authorize('admin'), ctrl.listUsers);
router.get('/:id', ctrl.getUser);
router.post('/', authorize('admin'), ctrl.createUser);
router.put('/:id', upload.single('avatar'), ctrl.updateUser);
router.post('/:id/reset-password', authorize('admin'), ctrl.resetPassword);

module.exports = router;
