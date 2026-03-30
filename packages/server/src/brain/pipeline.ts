import { v4 as uuidv4 } from 'uuid';
import type Database from 'better-sqlite3';
import type { UserConfig, Idea } from '@shipnuts/shared';
import type { WSManager } from '../ws/index.js';
import { mineIdeas } from './miner.js';
import { analyzeIdeas } from './analyzer.js';
import { buildProject } from './builder.js';

/**
 * Pipeline orchestrates the full idea-to-project workflow.
 */
export class Pipeline {
  private db: Database.Database;
  private wsManager: WSManager;
  private config: UserConfig;

  constructor(db: Database.Database, wsManager: WSManager, config: UserConfig) {
    this.db = db;
    this.wsManager = wsManager;
    this.config = config;
  }

  /**
   * Run the gather + analyze pipeline.
   * Called by the scheduler or manually.
   */
  async runGatherAndAnalyze(): Promise<void> {
    console.log('Pipeline: Starting gather phase...');

    // Phase 1: Mine ideas
    const rawIdeas = await mineIdeas({
      sources: this.config.sources,
      maxIdeas: 20,
      timeWindow: '48h',
      timeout: this.config.claudeCode.timeout,
    });

    console.log(`Pipeline: Gathered ${rawIdeas.length} raw ideas`);

    if (rawIdeas.length === 0) {
      console.log('Pipeline: No ideas found, stopping');
      return;
    }

    // Phase 2: Analyze ideas
    console.log('Pipeline: Starting analysis phase...');
    const analyzedIdeas = await analyzeIdeas({
      ideas: rawIdeas,
      criteria: this.config.criteria,
      timeout: this.config.claudeCode.timeout,
    });

    console.log(`Pipeline: ${analyzedIdeas.length} ideas passed analysis filters`);

    // Phase 3: Save to database
    for (const idea of analyzedIdeas) {
      const id = uuidv4();
      this.db.prepare(`
        INSERT INTO ideas (id, title, description, source, source_url, analysis, status)
        VALUES (?, ?, ?, ?, ?, ?, 'new')
      `).run(id, idea.title, idea.description, idea.source, idea.sourceUrl, JSON.stringify(idea.analysis));

      // Notify connected clients
      this.wsManager.broadcast({
        type: 'idea:new',
        payload: {
          idea: {
            id,
            title: idea.title,
            description: idea.description,
            source: idea.source,
            sourceUrl: idea.sourceUrl,
            capturedAt: new Date().toISOString(),
            analysis: idea.analysis,
            status: 'new' as const,
          },
        },
      });
    }

    console.log(`Pipeline: Saved ${analyzedIdeas.length} ideas to database`);
  }

  /**
   * Run the build pipeline for a specific idea.
   */
  async runBuild(ideaId: string, projectId: string): Promise<void> {
    console.log(`Pipeline: Starting build for idea ${ideaId}...`);

    const row = this.db.prepare('SELECT * FROM ideas WHERE id = ?').get(ideaId) as any;
    if (!row) {
      throw new Error(`Idea ${ideaId} not found`);
    }

    const idea: Idea = {
      id: row.id,
      title: row.title,
      description: row.description,
      source: row.source,
      sourceUrl: row.source_url,
      capturedAt: row.captured_at,
      analysis: row.analysis ? JSON.parse(row.analysis) : null,
      status: row.status,
    };

    await buildProject(this.db, this.wsManager, projectId, {
      idea,
      githubToken: this.config.github.token,
      githubUsername: this.config.github.username,
      includeTests: true,
      includeCI: true,
      timeout: 1800000, // 30 minutes for build
    });
  }
}
