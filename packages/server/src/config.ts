import type Database from 'better-sqlite3';
import type { UserConfig } from '@shipnuts/shared';

const DEFAULT_CONFIG: UserConfig = {
  schedule: {
    enabled: false,
    frequency: 'daily',
    hour: 9,
    minute: 0,
  },
  sources: ['hackernews', 'github-trending'],
  criteria: {
    minGapScore: 6,
    minValueScore: 50,
    maxComplexity: 'medium',
  },
  github: {
    token: null,
    username: null,
  },
  claudeCode: {
    maxConcurrent: 2,
    timeout: 600000,
  },
};

export function loadConfig(db: Database.Database): UserConfig {
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get('user_config') as { value: string } | undefined;
  if (row) {
    return JSON.parse(row.value);
  }
  // Save default config
  saveConfig(db, DEFAULT_CONFIG);
  return DEFAULT_CONFIG;
}

export function saveConfig(db: Database.Database, config: UserConfig): void {
  db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run('user_config', JSON.stringify(config));
}
