const router = require('express').Router();
const ctrl = require('../controllers/calendar.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);
router.get('/', ctrl.listEvents);
router.get('/:id/links', ctrl.getEventLinks);
router.post('/', authorize('admin', 'technician'), ctrl.createEvent);
router.put('/:id', authorize('admin', 'technician'), ctrl.updateEvent);
router.delete('/:id', authorize('admin', 'technician'), ctrl.deleteEvent);

module.exports = router;
