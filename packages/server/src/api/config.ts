import { Router } from 'express';
import type Database from 'better-sqlite3';
import type { UserConfig, ApiResponse } from '@shipnuts/shared';
import { loadConfig, saveConfig } from '../config.js';

export function createConfigRouter(db: Database.Database): Router {
  const router = Router();

  // GET /api/config
  router.get('/', (_req, res) => {
    const config = loadConfig(db);
    res.json({ success: true, data: config } satisfies ApiResponse<UserConfig>);
  });

  // PUT /api/config
  router.put('/', (req, res) => {
    const config = req.body as UserConfig;
    saveConfig(db, config);
    res.json({ success: true, data: config } satisfies ApiResponse<UserConfig>);
  });

  return router;
}
