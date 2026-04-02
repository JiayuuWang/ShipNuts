import { v4 as uuidv4 } from 'uuid';
import type Database from 'better-sqlite3';
import type { UserConfig, Idea, PipelineStatusPayload, AgentOutputPayload } from '@shipnuts/shared';
import type { WSManager } from '../ws/index.js';
import type { AgentStreamMessage } from './agent.js';
import { mineIdeas } from './miner.js';
import { analyzeIdeas } from './analyzer.js';
import { buildProject } from './builder.js';

/**
 * Pipeline orchestrates the full idea-to-project workflow.
 * Broadcasts real-time status and agent output via WebSocket.
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

  private broadcastStatus(payload: PipelineStatusPayload): void {
    this.wsManager.broadcast({ type: 'pipeline:status', payload });
  }

  private broadcastAgentOutput(pipelineId: string, agentId: string, msg: AgentStreamMessage): void {
    const payload: AgentOutputPayload = {
      pipelineId,
      agentId,
      type: msg.type,
      content: msg.content,
      toolName: msg.toolName,
      timestamp: new Date().toISOString(),
    };
    this.wsManager.broadcast({ type: 'agent:output', payload });
  }

  /**
   * Run the gather + analyze pipeline.
   * Returns the pipelineId for WS event correlation.
   */
  async runGatherAndAnalyze(pipelineId?: string): Promise<string> {
    const id = pipelineId || uuidv4();
    console.log(`Pipeline [${id}]: Starting gather phase...`);

    // === GATHER PHASE ===
    this.broadcastStatus({
      pipelineId: id,
      phase: 'gather',
      status: 'started',
      message: `Gathering ideas from ${this.config.sources.length} source(s)...`,
      progress: 0,
      detail: { totalItems: this.config.sources.length, processedItems: 0 },
    });

    let rawIdeas;
    try {
      rawIdeas = await mineIdeas({
        sources: this.config.sources,
        maxIdeas: 20,
        timeWindow: '48h',
        timeout: this.config.claudeCode.timeout,
        onMessage: (source, msg) => {
          this.broadcastAgentOutput(id, `gather-${source}`, msg);
          if (msg.type === 'init') {
            this.broadcastStatus({
              pipelineId: id,
              phase: 'gather',
              status: 'running',
              message: `Mining from ${source}...`,
              detail: { source },
            });
          }
        },
      });
    } catch (error: any) {
      this.broadcastStatus({
        pipelineId: id,
        phase: 'gather',
        status: 'failed',
        message: `Gather failed: ${error.message}`,
      });
      throw error;
    }

    console.log(`Pipeline [${id}]: Gathered ${rawIdeas.length} raw ideas`);

    this.broadcastStatus({
      pipelineId: id,
      phase: 'gather',
      status: 'completed',
      message: `Gathered ${rawIdeas.length} raw ideas`,
      progress: 100,
    });

    if (rawIdeas.length === 0) {
      console.log(`Pipeline [${id}]: No ideas found, stopping`);
      return id;
    }

    // === ANALYZE PHASE ===
    console.log(`Pipeline [${id}]: Starting analysis phase...`);
    this.broadcastStatus({
      pipelineId: id,
      phase: 'analyze',
      status: 'started',
      message: `Analyzing ${rawIdeas.length} ideas...`,
      progress: 0,
      detail: { totalItems: rawIdeas.length, processedItems: 0 },
    });

    let analyzedIdeas;
    try {
      analyzedIdeas = await analyzeIdeas({
        ideas: rawIdeas,
        criteria: this.config.criteria,
        timeout: this.config.claudeCode.timeout,
        onMessage: (ideaTitle, msg) => {
          this.broadcastAgentOutput(id, `analyze-${ideaTitle}`, msg);
          if (msg.type === 'init') {
            this.broadcastStatus({
              pipelineId: id,
              phase: 'analyze',
              status: 'running',
              message: `Analyzing: ${ideaTitle}`,
              detail: { ideaTitle },
            });
          }
        },
        onIdeaProgress: (processed, total) => {
          this.broadcastStatus({
            pipelineId: id,
            phase: 'analyze',
            status: 'running',
            message: `Analyzed ${processed}/${total} ideas`,
            progress: Math.round((processed / total) * 100),
            detail: { totalItems: total, processedItems: processed },
          });
        },
      });
    } catch (error: any) {
      this.broadcastStatus({
        pipelineId: id,
        phase: 'analyze',
        status: 'failed',
        message: `Analysis failed: ${error.message}`,
      });
      throw error;
    }

    console.log(`Pipeline [${id}]: ${analyzedIdeas.length} ideas passed analysis filters`);

    this.broadcastStatus({
      pipelineId: id,
      phase: 'analyze',
      status: 'completed',
      message: `${analyzedIdeas.length} ideas passed filters`,
      progress: 100,
    });

    // Phase 3: Save to database
    for (const idea of analyzedIdeas) {
      const ideaId = uuidv4();
      this.db.prepare(`
        INSERT INTO ideas (id, title, description, source, source_url, analysis, status)
        VALUES (?, ?, ?, ?, ?, ?, 'new')
      `).run(ideaId, idea.title, idea.description, idea.source, idea.sourceUrl, JSON.stringify(idea.analysis));

      // Notify connected clients
      this.wsManager.broadcast({
        type: 'idea:new',
        payload: {
          idea: {
            id: ideaId,
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

    console.log(`Pipeline [${id}]: Saved ${analyzedIdeas.length} ideas to database`);
    return id;
  }

  /**
   * Run the build pipeline for a specific idea.
   */
  async runBuild(ideaId: string, projectId: string, pipelineId?: string): Promise<string> {
    const id = pipelineId || uuidv4();
    console.log(`Pipeline [${id}]: Starting build for idea ${ideaId}...`);

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

    this.broadcastStatus({
      pipelineId: id,
      phase: 'build',
      status: 'started',
      message: `Building project: ${idea.title}`,
      progress: 0,
    });

    try {
      await buildProject(this.db, this.wsManager, projectId, {
        idea,
        githubToken: this.config.github.token,
        githubUsername: this.config.github.username,
        includeTests: true,
        includeCI: true,
        timeout: 1800000,
        onMessage: (msg) => {
          this.broadcastAgentOutput(id, `build-${ideaId}`, msg);
        },
      });

      this.broadcastStatus({
        pipelineId: id,
        phase: 'build',
        status: 'completed',
        message: `Build completed: ${idea.title}`,
        progress: 100,
      });
    } catch (error: any) {
      this.broadcastStatus({
        pipelineId: id,
        phase: 'build',
        status: 'failed',
        message: `Build failed: ${error.message}`,
      });
    }

    return id;
  }
}
