import { WebSocketServer, WebSocket } from 'ws';
import type { WSEvent } from '@shipnuts/shared';

export class WSManager {
  private wss: WebSocketServer;

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.wss.on('connection', (ws) => {
      console.log('WebSocket client connected');
      ws.on('close', () => {
        console.log('WebSocket client disconnected');
      });
    });
  }

  broadcast(event: WSEvent): void {
    const data = JSON.stringify(event);
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }
}
