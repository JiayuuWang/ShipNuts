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

## Quick Start

```bash
# Prerequisites: Node.js >= 20, Claude Code CLI authenticated

# Install dependencies
npm install

# Build all packages
npm run build

# Start development (server + frontend)
npm run dev

# Server: http://localhost:3456
# Dashboard: http://localhost:5173
```

## Project Structure

```
packages/
├── shared/          # Shared TypeScript types
├── server/          # Backend API + Agent brain
│   └── src/
│       ├── api/     # REST endpoints
│       ├── brain/   # Claude Code agent integration
│       │   ├── agent.ts    # Core agent wrapper
│       │   ├── miner.ts    # Idea mining from sources
│       │   ├── analyzer.ts # Gap/value analysis
│       │   ├── builder.ts  # Project generation
│       │   └── pipeline.ts # Orchestration
│       ├── db/      # SQLite database layer
│       ├── scheduler/ # Cron job scheduling
│       └── ws/      # WebSocket real-time updates
└── web/             # React dashboard
    └── src/
        ├── pages/   # Ideas, Projects, Settings
        ├── components/ # Layout, UI components
        └── lib/     # API client, WebSocket client
```

## Configuration

Access settings via the dashboard at `/settings` or the API:

- **Schedule**: Set gathering frequency (hourly/daily/weekly)
- **Sources**: Enable/disable data sources
- **Criteria**: Set minimum gap score, value score, max complexity
- **GitHub**: Configure token for auto-publishing projects

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/ideas | List all ideas |
| GET | /api/ideas/:id | Get idea details |
| POST | /api/ideas/:id/build | Start building a project |
| PATCH | /api/ideas/:id | Update idea status |
| GET | /api/projects | List all projects |
| GET | /api/projects/:id | Get project details |
| GET | /api/config | Get configuration |
| PUT | /api/config | Update configuration |
| POST | /api/gather | Trigger idea gathering |

## License

MIT
