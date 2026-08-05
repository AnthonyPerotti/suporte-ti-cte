const router = require('express').Router();
const ctrl = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

router.use(authenticate);

router.get('/technicians', ctrl.getTechnicians);
router.get('/', authorize('admin', 'technician', 'root'), ctrl.listUsers);
router.get('/:id', ctrl.getUser);
router.post('/', authorize('admin', 'root'), ctrl.createUser);
router.put('/:id', upload.single('avatar'), ctrl.updateUser);
router.post('/:id/reset-password', authorize('admin', 'root'), ctrl.resetPassword);

module.exports = router;
