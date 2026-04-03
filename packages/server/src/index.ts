import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { initDatabase } from './db/index.js';
import { createApiRouter } from './api/index.js';
import { Scheduler } from './scheduler/index.js';
import { WSManager } from './ws/index.js';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';

const log = createLogger('Server');
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3456;

async function main() {
  log.info('Starting ShipNuts server...');

  // Initialize database
  const db = initDatabase();

  // Load config
  const config = loadConfig(db);

  // Create Express app
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Create HTTP server
  const server = createServer(app);

  // Initialize WebSocket
  const wss = new WebSocketServer({ server, path: '/ws' });
  const wsManager = new WSManager(wss);

  // Mount API routes
  app.use('/api', createApiRouter(db, wsManager));

  // Initialize scheduler
  const scheduler = new Scheduler(db, wsManager, config);
  if (config.schedule.enabled) {
    scheduler.start();
  }

  // Start server
  server.listen(PORT, () => {
    log.info(`Server running on http://localhost:${PORT}`);
    log.info(`WebSocket available at ws://localhost:${PORT}/ws`);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    log.info('Shutting down...');
    scheduler.stop();
    wss.close();
    server.close();
    db.close();
    process.exit(0);
  });
}

main().catch((err) => log.error('Startup failed:', err));
