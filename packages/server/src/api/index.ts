import { Router } from 'express';
import type Database from 'better-sqlite3';
import type { WSManager } from '../ws/index.js';
import { createIdeasRouter } from './ideas.js';
import { createProjectsRouter } from './projects.js';
import { createConfigRouter } from './config.js';

export function createApiRouter(db: Database.Database, wsManager: WSManager): Router {
  const router = Router();

  router.use('/ideas', createIdeasRouter(db, wsManager));
  router.use('/projects', createProjectsRouter(db, wsManager));
  router.use('/config', createConfigRouter(db));

  // Manually trigger gather + analyze pipeline
  router.post('/gather', async (_req, res) => {
    try {
      const { Pipeline } = await import('../brain/pipeline.js');
      const { loadConfig } = await import('../config.js');
      const config = loadConfig(db);
      const pipeline = new Pipeline(db, wsManager, config);
      pipeline.runGatherAndAnalyze().catch((err: Error) => {
        console.error('Gather pipeline error:', err);
      });
      res.json({ success: true, data: { message: 'Gather pipeline started' } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Health check
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return router;
}
