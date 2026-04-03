import { WebSocketServer, WebSocket } from 'ws';
import type { WSEvent } from '@shipnuts/shared';
import { createLogger } from '../logger.js';

const log = createLogger('WS');

export class WSManager {
  private wss: WebSocketServer;

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.wss.on('connection', (ws) => {
      log.info('Client connected');
      ws.on('close', () => {
        log.info('Client disconnected');
      });
    });
  }

  broadcast(event: WSEvent): void {
    const data = JSON.stringify(event);
    const clientCount = this.wss.clients.size;
    if (clientCount > 0) {
      log.debug(`Broadcasting ${event.type} to ${clientCount} client(s)`);
    }
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }
}
