import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { orderEvents } from './orderEvents.js';

export function initSocketServer(httpServer) {
  const origins = env.clientUrl.split(',').map((url) => url.trim());

  const io = new Server(httpServer, {
    cors: {
      origin: origins,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Unauthorized'));
    }

    try {
      const payload = verifyAccessToken(token);
      if (payload.role !== 'admin') {
        return next(new Error('Forbidden'));
      }
      socket.data.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join('admin');
  });

  orderEvents.on('order:created', (payload) => {
    io.to('admin').emit('order:created', payload);
  });

  orderEvents.on('order:status_changed', (payload) => {
    io.to('admin').emit('order:status_changed', payload);
  });

  return io;
}
