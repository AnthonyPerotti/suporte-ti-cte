const router = require('express').Router();
const ctrl = require('../controllers/ticket.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

router.use(authenticate);

router.get('/', ctrl.listTickets);
router.get('/:id', ctrl.getTicket);
router.post('/', upload.array('attachments', 5), ctrl.createTicket);
router.put('/:id', authorize('admin', 'technician'), ctrl.updateTicket);
router.post('/:id/comments', ctrl.addComment);
router.post('/:id/rate', ctrl.rateTicket);

module.exports = router;
