import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { getAllowedOrigins } from '../config/cors';
import { verifyToken } from '../utils/auth/jwt';
import { Conversation, Message } from '../types';

let io: SocketServer | null = null;

const getCookie = (cookieHeader: string | undefined, name: string): string | undefined => {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
};

export const initSocketServer = (httpServer: HttpServer): SocketServer => {
  io = new SocketServer(httpServer, {
    cors: { origin: getAllowedOrigins(), credentials: true },
  });

  io.use((socket, next) => {
    const token = getCookie(socket.handshake.headers.cookie, 'access_token');
    if (!token || !verifyToken(token)) {
      next(new Error('unauthorized'));
      return;
    }
    next();
  });

  io.on('connection', (socket) => {
    socket.on('conversation:join', (conversationId: string) => {
      if (typeof conversationId === 'string') {
        socket.join(`conversation:${conversationId}`);
      }
    });

    socket.on('conversation:leave', (conversationId: string) => {
      if (typeof conversationId === 'string') {
        socket.leave(`conversation:${conversationId}`);
      }
    });
  });

  return io;
};

export const emitNewMessage = (message: Message): void => {
  io?.emit('message:new', message);
};

export const emitConversationUpdated = (conversation: Conversation): void => {
  io?.emit('conversation:updated', conversation);
};

export const emitNewConversation = (conversation: Conversation): void => {
  io?.emit('conversation:new', conversation);
};
