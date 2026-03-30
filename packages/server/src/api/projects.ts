import { Router } from 'express';
import type Database from 'better-sqlite3';
import type { Project, ApiResponse } from '@shipnuts/shared';
import type { WSManager } from '../ws/index.js';

export function createProjectsRouter(db: Database.Database, _wsManager: WSManager): Router {
  const router = Router();

  // GET /api/projects - List all projects
  router.get('/', (_req, res) => {
    const rows = db.prepare('SELECT * FROM projects ORDER BY started_at DESC').all() as any[];
    const projects: Project[] = rows.map(rowToProject);
    res.json({ success: true, data: projects } satisfies ApiResponse<Project[]>);
  });

  // GET /api/projects/:id - Get project by id
  router.get('/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as any;
    if (!row) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }
    res.json({ success: true, data: rowToProject(row) } satisfies ApiResponse<Project>);
  });

  return router;
}

function rowToProject(row: any): Project {
  return {
    id: row.id,
    ideaId: row.idea_id,
    status: row.status,
    githubRepo: row.github_repo,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    progress: row.progress,
    logs: JSON.parse(row.logs),
    error: row.error,
  };
}
