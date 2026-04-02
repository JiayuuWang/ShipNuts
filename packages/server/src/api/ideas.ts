import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type Database from 'better-sqlite3';
import type { Idea, ApiResponse } from '@shipnuts/shared';
import type { WSManager } from '../ws/index.js';

export function createIdeasRouter(db: Database.Database, wsManager: WSManager): Router {
  const router = Router();

  // GET /api/ideas - List all ideas
  router.get('/', (_req, res) => {
    const rows = db.prepare('SELECT * FROM ideas ORDER BY captured_at DESC').all() as any[];
    const ideas: Idea[] = rows.map(rowToIdea);
    res.json({ success: true, data: ideas } satisfies ApiResponse<Idea[]>);
  });

  // GET /api/ideas/:id - Get idea by id
  router.get('/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM ideas WHERE id = ?').get(req.params.id) as any;
    if (!row) {
      res.status(404).json({ success: false, error: 'Idea not found' });
      return;
    }
    res.json({ success: true, data: rowToIdea(row) } satisfies ApiResponse<Idea>);
  });

  // POST /api/ideas/:id/build - Start building a project from an idea
  router.post('/:id/build', async (req, res) => {
    const row = db.prepare('SELECT * FROM ideas WHERE id = ?').get(req.params.id) as any;
    if (!row) {
      res.status(404).json({ success: false, error: 'Idea not found' });
      return;
    }

    const projectId = uuidv4();
    db.prepare(`
      INSERT INTO projects (id, idea_id, status, progress, logs)
      VALUES (?, ?, 'pending', 0, '[]')
    `).run(projectId, req.params.id);

    // Update idea status
    db.prepare('UPDATE ideas SET status = ? WHERE id = ?').run('building', req.params.id);

    // Trigger build asynchronously
    const pipelineId = uuidv4();
    try {
      const { Pipeline } = await import('../brain/pipeline.js');
      const { loadConfig } = await import('../config.js');
      const config = loadConfig(db);
      const pipeline = new Pipeline(db, wsManager, config);
      pipeline.runBuild(req.params.id, projectId, pipelineId).catch((err: Error) => {
        console.error('Build failed:', err);
      });
    } catch (error) {
      console.error('Failed to start build:', error);
    }

    res.json({ success: true, data: { projectId, pipelineId } });
  });

  // PATCH /api/ideas/:id - Update idea status
  router.patch('/:id', (req, res) => {
    const { status } = req.body;
    if (!status) {
      res.status(400).json({ success: false, error: 'status is required' });
      return;
    }
    db.prepare('UPDATE ideas SET status = ?, updated_at = datetime(\'now\') WHERE id = ?').run(status, req.params.id);
    res.json({ success: true });
  });

  return router;
}

function rowToIdea(row: any): Idea {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    source: row.source,
    sourceUrl: row.source_url,
    capturedAt: row.captured_at,
    analysis: row.analysis ? JSON.parse(row.analysis) : null,
    status: row.status,
  };
}
