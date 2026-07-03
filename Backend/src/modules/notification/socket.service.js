const { Server } = require('socket.io');
const env = require('../../config/env');
const logger = require('../../shared/utils/logger');
// In a real scenario, we might also import jwt utils here to authenticate socket connections

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: env.FRONTEND_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    logger.info(`New client connected: ${socket.id}`);

    // Allow user to join a room specific to their user ID to receive targeted notifications
    socket.on('joinRoom', (userId) => {
      socket.join(userId);
      logger.info(`User ${userId} joined room`);
    });

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIo = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

const sendNotificationToUser = (userId, event, payload) => {
  if (io) {
    io.to(userId).emit(event, payload);
  }
};

module.exports = {
  initSocket,
  getIo,
  sendNotificationToUser,
};
