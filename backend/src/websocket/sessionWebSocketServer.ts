import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { ACTUAL_JWT_SECRET } from '../middleware/auth';
import { SessionRegistry } from '../services/sessionRegistry';
import { IncomingMessage } from 'http';
import { URL } from 'url';

export const createSessionWebSocketServer = () => {
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', async (ws: WebSocket, req: IncomingMessage, userId: string, sessionId: string) => {
    // Bind socket to session local registry
    SessionRegistry.bindSocket(sessionId, ws);
    
    ws.send(JSON.stringify({ type: 'ready', message: 'Session WebSocket connected' }));

    ws.on('close', () => {
      SessionRegistry.removeLocalSocket(sessionId);
    });

    ws.on('error', (err) => {
      console.error('[SessionWS] error:', err);
      SessionRegistry.removeLocalSocket(sessionId);
    });
  });

  return wss;
};

export const handleSessionUpgrade = async (wss: WebSocketServer, request: IncomingMessage, socket: any, head: Buffer) => {
  try {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const token = url.searchParams.get('token');
    const sessionId = url.searchParams.get('sessionId');

    if (!token || !sessionId) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, ACTUAL_JWT_SECRET);
    } catch {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    const userId = decoded.userId;

    // Enforce Active Session via Redis
    const isActive = await SessionRegistry.isActiveSession(userId, sessionId);
    if (!isActive) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request, userId, sessionId);
    });
  } catch (err) {
    socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
    socket.destroy();
  }
};
