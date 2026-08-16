import { io, Socket } from 'socket.io-client';
import { getApiBaseUrl } from './api';

let socket: Socket | null = null;

export const connectSocket = (token: string, householdId?: string | null) => {
  if (socket) {
    socket.disconnect();
  }
  const base = getApiBaseUrl().replace(/\/api$/, '');
  socket = io(base, { auth: { token }, transports: ['websocket'] });
  if (householdId) {
    socket.emit('household:join', householdId);
  }
  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};
