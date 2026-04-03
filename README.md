# ShipNuts

Automated system that turns ideas into GitHub open source projects, powered by Claude Code.

## What It Does

ShipNuts is a long-running automation system that:

1. **Mines Ideas** - Periodically scans Hacker News, GitHub Trending, Reddit, Product Hunt, and RSS feeds for promising project ideas
2. **Analyzes Viability** - Uses Claude Code to evaluate each idea's market gap, value proposition, and technical feasibility
3. **Builds Projects** - When you select an idea, Claude Code autonomously writes the code (vibe coding), creates a GitHub repo, and pushes the project
4. **Tracks Everything** - A local dashboard lets you browse ideas, monitor builds, and configure the system

## Architecture

```
ShipNuts Core
├── Brain (Claude Code Agent SDK)
│   ├── Idea Miner     - Gathers ideas from data sources
│   ├── Idea Analyzer   - Gap/value/feasibility scoring
│   └── Project Builder  - Autonomous vibe coding
├── Scheduler (node-cron)
├── REST API + WebSocket (Express)
├── Database (SQLite)
└── Dashboard (React + Tailwind)
```

## Tech Stack

- **Backend**: Node.js + TypeScript + Express
- **Frontend**: React 19 + TypeScript + Tailwind CSS 4 + Vite 6
- **Agent**: Claude Code Agent SDK (`@anthropic-ai/claude-agent-sdk`)
- **Database**: SQLite (better-sqlite3)
- **GitHub**: Octokit
- **Scheduler**: node-cron

## Prerequisites

- **Node.js >= 20** — [Download](https://nodejs.org/)
- **Claude Code CLI** — Must be installed and authenticated (see [Claude Code Setup](#claude-code-setup) below)
- **GitHub Personal Access Token** (optional) — Required only if you want to auto-create repos and push code

> **Database**: ShipNuts uses SQLite (an embedded database). **No separate database installation or startup is required.** The database file is automatically created at `packages/server/data/shipnuts.db` on first run.

## Claude Code Setup

ShipNuts uses the [Claude Code Agent SDK](https://docs.anthropic.com/en/docs/claude-code/sdk) to run autonomous agents. The SDK spawns Claude Code CLI processes under the hood, so **the CLI must be installed and properly authenticated before running ShipNuts**.

### Step 1: Install Claude Code CLI

```bash
npm install -g @anthropic-ai/claude-code
```

Verify the installation:

```bash
claude --version
```

### Step 2: Authenticate

Claude Code needs a valid API key to call Anthropic's API. There are several ways to provide it:

#### Option A: Anthropic API Key (Recommended)

Set the `ANTHROPIC_API_KEY` environment variable:

```bash
# Linux / macOS
export ANTHROPIC_API_KEY=your-api-key

# Windows (PowerShell)
$env:ANTHROPIC_API_KEY = "your-api-key"

# Windows (CMD)
set ANTHROPIC_API_KEY=your-api-key
```

You can get an API key from the [Anthropic Console](https://console.anthropic.com/settings/keys).

To make it permanent, add it to your shell profile (`~/.bashrc`, `~/.zshrc`) or system environment variables.

#### Option B: Claude Code Login (OAuth)

If you have a Claude Pro/Team/Enterprise subscription:

```bash
claude login
```

This opens a browser for OAuth authentication. Once completed, Claude Code will use your account credentials.

#### Option C: Third-Party API Providers

If you use a third-party API provider (e.g., OpenRouter, API proxy services, or a self-hosted gateway), you need to set **both** the API key and the base URL.

**Environment variables:**

```bash
# Linux / macOS
export ANTHROPIC_API_KEY=your-provider-api-key
export ANTHROPIC_BASE_URL=https://your-provider.com/v1

# Windows (PowerShell)
$env:ANTHROPIC_API_KEY = "your-provider-api-key"
$env:ANTHROPIC_BASE_URL = "https://your-provider.com/v1"

# Windows (CMD)
set ANTHROPIC_API_KEY=your-provider-api-key
set ANTHROPIC_BASE_URL=https://your-provider.com/v1
```

**Claude Code CLI configuration (persistent):**

You can also configure these permanently via the Claude Code CLI so you don't need to set environment variables every time:

```bash
claude config set --global apiKey your-provider-api-key
claude config set --global apiBaseUrl https://your-provider.com/v1
```

**Common third-party provider examples:**

| Provider | Base URL | Notes |
|----------|----------|-------|
| OpenRouter | `https://openrouter.ai/api/v1` | Set `ANTHROPIC_API_KEY` to your OpenRouter key |
| Custom Proxy | `https://your-proxy.example.com/v1` | Must be compatible with the Anthropic API format |
| AWS Bedrock | N/A | Use `claude config set --global apiProvider bedrock` instead |
| Google Vertex AI | N/A | Use `claude config set --global apiProvider vertex` instead |

> **Important**: The base URL should point to the API root (typically ending in `/v1`). Do **not** include the `/messages` path — the SDK appends it automatically.

> **Tip**: If your provider requires a custom model name mapping, note that ShipNuts defaults to `claude-sonnet-4-6`. Make sure your provider supports this model identifier or adjust the `model` parameter in `packages/server/src/brain/agent.ts`.

### Step 3: Verify Authentication

Run a quick test to confirm Claude Code works:

```bash
claude -p "Say hello"
```

If you see a response, authentication is working. If you get an `invalid_api_key` or `401` error, double-check your API key and environment variables.

### Troubleshooting Authentication

| Error | Cause | Fix |
|-------|-------|-----|
| `invalid_api_key` / `401` | API key is missing, expired, or invalid | Re-check `ANTHROPIC_API_KEY`; generate a new key if needed |
| `Failed to authenticate` | Claude Code CLI cannot reach the API | Check network/proxy settings; verify `ANTHROPIC_BASE_URL` if using a third-party provider |
| `billing_error` | Account has no active billing | Add a payment method at [console.anthropic.com](https://console.anthropic.com) |
| `rate_limit` | Too many concurrent requests | Reduce `Agent Concurrency` in Settings, or wait and retry |

> **Important**: The environment variable must be set in the **same terminal session** where you run `npm run dev`. If you set it in one terminal but start ShipNuts in another, the key won't be available.

## Quick Start

```bash
# 1. Clone the project
git clone <repo-url>
cd ShipNuts

# 2. Install dependencies (all sub-packages are installed via npm workspaces)
npm install

# 3. Build the shared types package (required by both server and web)
npm run build:shared

# 4. Make sure Claude Code is authenticated (see Claude Code Setup above)
# 5. Start development mode (backend + frontend concurrently)
npm run dev
```

On successful startup you will see:

```
10:05:31.039 INFO  [Server] Starting ShipNuts server...
10:05:31.089 INFO  [Server] Server running on http://localhost:3456
10:05:31.089 INFO  [Server] WebSocket available at ws://localhost:3456/ws
```

- **Backend API**: http://localhost:3456
- **Dashboard**: http://localhost:5173 (Vite dev server proxies API requests to the backend)
- **WebSocket**: ws://localhost:3456/ws

You can also start services individually:

```bash
npm run dev:server   # Backend only
npm run dev:web      # Frontend only
```

### Production Build

```bash
# Build all packages (shared -> server -> web, in dependency order)
npm run build

# Start production server
npm run start
```

## Configuration

On first startup, the system uses default configuration. You can modify settings via the Dashboard at http://localhost:5173/settings.

| Setting | Default | Description |
|---------|---------|-------------|
| Auto Gather | Off | Enable to automatically gather ideas on a schedule |
| Frequency | Daily at 09:00 | Hourly / Daily / Weekly |
| Sources | Hacker News, GitHub Trending | Also available: Reddit, Product Hunt, RSS |
| Min Gap Score | 6 (out of 10) | Minimum market gap score to keep an idea |
| Min Value Score | 50 (out of 100) | Minimum value score to keep an idea |
| Max Complexity | Medium | Filter out ideas above this complexity level |
| GitHub Token | Empty | Set to enable auto-publishing projects to GitHub |
| Agent Concurrency | 2 | Max concurrent Claude Code agent tasks |
| Agent Timeout | 600000ms (10 min) | Max execution time per agent task |

Settings can also be managed via the REST API:

```bash
# Get current config
curl http://localhost:3456/api/config

# Update config
curl -X PUT http://localhost:3456/api/config \
  -H "Content-Type: application/json" \
  -d '{"schedule":{"enabled":true,"frequency":"daily","hour":9,"minute":0},...}'
```

## Usage

1. **Gather Ideas** — Click "Gather Ideas" on the Ideas page, or enable auto-gathering in Settings
2. **Browse & Filter** — The Ideas list shows all gathered ideas with Gap score, Value score, and complexity analysis
3. **Build a Project** — Click "Build" on any idea; Claude Code will autonomously write the code, tests, and documentation
4. **Track Progress** — Monitor build progress, logs, and GitHub repo links on the Projects page

## Project Structure

```
packages/
├── shared/          # Shared TypeScript type definitions
├── server/          # Backend service
│   ├── src/
│   │   ├── api/     # REST API routes
│   │   ├── brain/   # Claude Code Agent integration
│   │   │   ├── agent.ts    # Agent SDK wrapper
│   │   │   ├── miner.ts    # Idea mining (multi-source)
│   │   │   ├── analyzer.ts # Idea analysis (Gap/Value/Feasibility)
│   │   │   ├── builder.ts  # Project generation (vibe coding + GitHub push)
│   │   │   └── pipeline.ts # Workflow orchestration
│   │   ├── db/      # SQLite database (auto-created, no manual setup)
│   │   ├── scheduler/ # Cron job scheduling
│   │   └── ws/      # WebSocket real-time updates
│   └── data/        # SQLite database files (auto-generated, gitignored)
└── web/             # React Dashboard
    └── src/
        ├── pages/   # Ideas / Projects / Settings pages
        ├── components/ # Layout, PipelinePanel, UI components
        └── lib/     # API client, WebSocket client
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/ideas | List all ideas |
| GET | /api/ideas/:id | Get idea details |
| POST | /api/ideas/:id/build | Start building a project from an idea |
| PATCH | /api/ideas/:id | Update idea status |
| GET | /api/projects | List all projects |
| GET | /api/projects/:id | Get project details |
| GET | /api/config | Get configuration |
| PUT | /api/config | Update configuration |
| POST | /api/gather | Trigger idea gathering |
| GET | /api/health | Health check |

## License

MIT
