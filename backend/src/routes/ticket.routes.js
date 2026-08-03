const router = require('express').Router();
const ctrl = require('../controllers/ticket.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

router.use(authenticate);

router.get('/', ctrl.listTickets);
router.get('/:id', ctrl.getTicket);
router.post('/', upload.array('attachments', 5), ctrl.createTicket);
router.put('/:id', authorize('admin', 'technician', 'root'), ctrl.updateTicket);
router.post('/:id/comments', upload.array('attachments', 5), ctrl.addComment);
router.post('/:id/rate', ctrl.rateTicket);
router.patch('/:id/archive', authorize('admin', 'root'), ctrl.archiveTicket);
router.patch('/:id/unarchive', authorize('admin', 'root'), ctrl.unarchiveTicket);

// ONLY ROOT CAN PERMANENTLY DELETE TICKETS
router.delete('/:id', authorize('root'), ctrl.deleteTicket);

module.exports = router;
