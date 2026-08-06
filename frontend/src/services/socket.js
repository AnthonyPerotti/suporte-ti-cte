import { io } from 'socket.io-client';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    const token = localStorage.getItem('token');
    const backendUrl = import.meta.env.VITE_API_URL || window.location.origin;
    socket = io(backendUrl, {
      auth: { token },
      autoConnect: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket.io] Erro de conexão:', err?.message || err);
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
