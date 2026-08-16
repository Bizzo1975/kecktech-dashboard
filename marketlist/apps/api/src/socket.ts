import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from './config/env';
import { HouseholdMember, User } from './models';

export const createSocketServer = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: env.corsOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = (socket.handshake.auth?.token || socket.handshake.query?.token) as string | undefined;
      if (!token) return next(new Error('Unauthorized'));
      const decoded = jwt.verify(token, env.jwtSecret) as { id: string };
      const user = await User.findByPk(decoded.id);
      if (!user) return next(new Error('Unauthorized'));
      socket.data.userId = user.id;
      return next();
    } catch {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('household:join', async (householdId: string) => {
      const member = await HouseholdMember.findOne({
        where: { householdId, userId: socket.data.userId },
      });
      if (member) {
        await socket.join(`household:${householdId}`);
      }
    });
  });

  return io;
};
