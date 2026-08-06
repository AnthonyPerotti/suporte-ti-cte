const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

const initSocket = (server, corsOrigin) => {
  io = new Server(server, {
    cors: {
      origin: corsOrigin || '*',
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userRole = socket.user?.role;
    if (['admin', 'technician', 'root'].includes(userRole)) {
      socket.join('staff');
    }
    if (socket.user?.id) {
      socket.join(`user:${socket.user.id}`);
    }

    socket.on('disconnect', () => {});
  });

  console.log('[WEBSOCKET] Socket.io inicializado com sucesso.');
  return io;
};

const getIo = () => io;

const notifyNewTicket = (ticket) => {
  if (io) {
    io.to('staff').emit('ticket:created', ticket);
  }
};

const notifyTicketUpdated = (ticket) => {
  if (io) {
    io.to('staff').emit('ticket:updated', ticket);
    if (ticket.user_id) {
      io.to(`user:${ticket.user_id}`).emit('ticket:updated', ticket);
    }
    if (ticket.assignee_id) {
      io.to(`user:${ticket.assignee_id}`).emit('ticket:updated', ticket);
    }
  }
};

module.exports = {
  initSocket,
  getIo,
  notifyNewTicket,
  notifyTicketUpdated,
};
