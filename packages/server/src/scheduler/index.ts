import cron from 'node-cron';
import type Database from 'better-sqlite3';
import type { UserConfig } from '@shipnuts/shared';
import type { WSManager } from '../ws/index.js';

export class Scheduler {
  private db: Database.Database;
  private wsManager: WSManager;
  private config: UserConfig;
  private task: cron.ScheduledTask | null = null;

  constructor(db: Database.Database, wsManager: WSManager, config: UserConfig) {
    this.db = db;
    this.wsManager = wsManager;
    this.config = config;
  }

  start(): void {
    const cronExpr = this.buildCronExpression();
    console.log(`Scheduler started with cron: ${cronExpr}`);
    this.task = cron.schedule(cronExpr, () => {
      this.run();
    });
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      console.log('Scheduler stopped');
    }
  }

  updateConfig(config: UserConfig): void {
    this.config = config;
    if (this.task) {
      this.stop();
      if (config.schedule.enabled) {
        this.start();
      }
    }
  }

  private buildCronExpression(): string {
    const { frequency, hour, minute } = this.config.schedule;
    switch (frequency) {
      case 'hourly':
        return `${minute} * * * *`;
      case 'daily':
        return `${minute} ${hour} * * *`;
      case 'weekly':
        return `${minute} ${hour} * * 1`; // Every Monday
      default:
        return `${minute} ${hour} * * *`;
    }
  }

  private async run(): Promise<void> {
    console.log('Scheduler triggered: starting gather + analyze pipeline');
    // Pipeline will be implemented in the brain module
    try {
      const { Pipeline } = await import('../brain/pipeline.js');
      const pipeline = new Pipeline(this.db, this.wsManager, this.config);
      await pipeline.runGatherAndAnalyze();
    } catch (error) {
      console.error('Pipeline error:', error);
    }
  }
}
