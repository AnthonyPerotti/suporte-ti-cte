const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.post('/login', ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/logout', ctrl.logout);
router.post('/change-password', authenticate, ctrl.changePassword);
router.get('/me', authenticate, ctrl.getMe);

module.exports = router;
