import { runAgent } from './agent.js';
import type Database from 'better-sqlite3';
import type { Idea, IdeaAnalysis } from '@shipnuts/shared';
import type { WSManager } from '../ws/index.js';
import { Octokit } from 'octokit';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECTS_DIR = path.resolve(__dirname, '../../../projects');

export interface BuildOptions {
  idea: Idea;
  githubToken: string | null;
  githubUsername: string | null;
  includeTests: boolean;
  includeCI: boolean;
  timeout?: number;
}

/**
 * Build a project from an analyzed idea using Claude Code vibe coding.
 */
export async function buildProject(
  db: Database.Database,
  wsManager: WSManager,
  projectId: string,
  options: BuildOptions
): Promise<void> {
  const { idea, githubToken, githubUsername, includeTests, includeCI, timeout = 1800000 } = options;

  if (!idea.analysis) {
    throw new Error('Idea must have analysis before building');
  }

  const projectDir = path.join(PROJECTS_DIR, idea.id);
  if (!existsSync(projectDir)) {
    mkdirSync(projectDir, { recursive: true });
  }

  const updateProgress = (progress: number, status: string, log: string) => {
    db.prepare('UPDATE projects SET progress = ?, status = ?, logs = json_insert(logs, \'$[#]\', ?), updated_at = datetime(\'now\') WHERE id = ?')
      .run(progress, status, log, projectId);
    wsManager.broadcast({
      type: 'project:progress',
      payload: { projectId, progress, status, log },
    });
  };

  try {
    // Phase 1: Initialize project
    updateProgress(5, 'initializing', 'Creating project structure...');

    const initPrompt = buildInitPrompt(idea, idea.analysis, includeTests, includeCI);
    const initResult = await runAgent({
      prompt: initPrompt,
      cwd: projectDir,
      maxTurns: 50,
      timeout: timeout / 2,
      allowedTools: ['Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep'],
    });

    if (!initResult.success) {
      throw new Error(`Project initialization failed: ${initResult.error}`);
    }

    updateProgress(50, 'building', 'Project structure created. Building core features...');

    // Phase 2: Build core features
    const buildPrompt = buildFeaturePrompt(idea, idea.analysis);
    const buildResult = await runAgent({
      prompt: buildPrompt,
      cwd: projectDir,
      maxTurns: 80,
      timeout: timeout / 2,
      allowedTools: ['Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep'],
    });

    if (!buildResult.success) {
      throw new Error(`Feature building failed: ${buildResult.error}`);
    }

    updateProgress(80, 'building', 'Core features built.');

    // Phase 3: Push to GitHub (if configured)
    if (githubToken && githubUsername) {
      updateProgress(85, 'pushing', 'Creating GitHub repository...');

      const repoName = idea.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 50);

      try {
        const octokit = new Octokit({ auth: githubToken });

        // Create repo
        const { data: repo } = await octokit.rest.repos.createForAuthenticatedUser({
          name: repoName,
          description: idea.description.slice(0, 350),
          auto_init: false,
          private: false,
        });

        updateProgress(90, 'pushing', `Repository created: ${repo.full_name}`);

        // Initialize git and push
        const pushResult = await runAgent({
          prompt: `Initialize a git repository in this directory, add all files, commit with message "Initial commit: ${idea.title}", and push to the remote repository at ${repo.clone_url}. Use the token "${githubToken}" for authentication by setting the remote URL to https://${githubUsername}:${githubToken}@github.com/${repo.full_name}.git`,
          cwd: projectDir,
          maxTurns: 10,
          timeout: 60000,
          allowedTools: ['Bash'],
        });

        if (pushResult.success) {
          db.prepare('UPDATE projects SET github_repo = ? WHERE id = ?').run(repo.full_name, projectId);
          updateProgress(95, 'pushing', `Pushed to GitHub: ${repo.full_name}`);
        } else {
          updateProgress(90, 'building', `GitHub push failed: ${pushResult.error}`);
        }
      } catch (ghError: any) {
        updateProgress(90, 'building', `GitHub error: ${ghError.message}`);
      }
    }

    // Done
    updateProgress(100, 'completed', 'Project build completed!');
    db.prepare('UPDATE projects SET completed_at = datetime(\'now\') WHERE id = ?').run(projectId);
    db.prepare('UPDATE ideas SET status = \'completed\' WHERE id = ?').run(idea.id);

  } catch (error: any) {
    updateProgress(0, 'failed', `Build failed: ${error.message}`);
    db.prepare('UPDATE projects SET error = ?, status = \'failed\' WHERE id = ?').run(error.message, projectId);
    db.prepare('UPDATE ideas SET status = \'new\' WHERE id = ?').run(idea.id);
  }
}

function buildInitPrompt(idea: Idea, analysis: IdeaAnalysis, includeTests: boolean, includeCI: boolean): string {
  const techStack = analysis.feasibility.recommendedTechStack.join(', ');

  return `You are a senior software engineer. Create a complete, well-structured open source project.

**Project:** ${idea.title}
**Description:** ${idea.description}
**Recommended Tech Stack:** ${techStack}

Create the full project from scratch in the current directory. This should be a real, working project that people can use.

Requirements:
1. Create a proper project structure with package.json (or equivalent for the chosen language)
2. Implement the core functionality described above
3. Write a comprehensive README.md with:
   - Project description and motivation
   - Features
   - Installation instructions
   - Usage examples
   - Contributing guidelines
4. Add a LICENSE file (MIT)
${includeTests ? '5. Add basic tests for core functionality' : ''}
${includeCI ? '6. Add GitHub Actions CI/CD configuration' : ''}

Focus on:
- Clean, well-organized code
- Good documentation
- Working implementation (not just stubs)
- Modern best practices for the chosen tech stack

Start building now.`;
}

function buildFeaturePrompt(idea: Idea, analysis: IdeaAnalysis): string {
  return `Continue building the project "${idea.title}".

Review what has been created so far and:
1. Ensure all core features are fully implemented (not just stubs)
2. Fix any bugs or issues
3. Improve error handling
4. Make sure the README accurately reflects the implemented features
5. Ensure the project can be installed and run by a user following the README

If tests exist, make sure they pass. If there is a build step, make sure it succeeds.

The project should be a polished, ready-to-use open source tool.`;
}
