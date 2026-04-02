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
- **Claude Code CLI** — 需要已安装并完成身份认证（用于 Agent SDK 调用）
- **GitHub Personal Access Token**（可选）— 如果需要自动创建仓库并推送代码，需在 Dashboard Settings 页面配置

> **数据库说明**: 项目使用 SQLite（嵌入式数据库），**无需单独安装或启动任何数据库服务**。首次启动时会自动在 `packages/server/data/` 目录下创建 `shipnuts.db` 文件。

## Quick Start

```bash
# 1. 克隆项目
git clone <repo-url>
cd ShipNuts

# 2. 安装依赖（所有子包会通过 npm workspaces 一并安装）
npm install

# 3. 构建 shared 类型包（server 和 web 都依赖它）
npm run build:shared

# 4. 启动开发环境（同时启动后端 + 前端）
npm run dev
```

启动成功后会看到：

- **后端 API**: http://localhost:3456
- **前端 Dashboard**: http://localhost:5173（开发模式下自动代理 API 请求到后端）
- **WebSocket**: ws://localhost:3456/ws

也可以分别单独启动：

```bash
npm run dev:server   # 仅启动后端
npm run dev:web      # 仅启动前端
```

### 生产构建

```bash
# 构建所有包（shared -> server -> web，按依赖顺序）
npm run build

# 启动生产服务
npm run start
```

## Configuration

首次启动时系统会使用以下默认配置，可通过 Dashboard 的 Settings 页面（http://localhost:5173/settings）修改：

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| 自动采集 | 关闭 | 开启后按设定频率自动从数据源采集 idea |
| 采集频率 | 每天 09:00 | 支持每小时 / 每天 / 每周 |
| 数据源 | Hacker News, GitHub Trending | 可选 Reddit, Product Hunt, RSS |
| 最低 Gap 分数 | 6 (满分 10) | 市场空白度筛选阈值 |
| 最低 Value 分数 | 50 (满分 100) | 项目价值筛选阈值 |
| 最大复杂度 | medium | 过滤掉复杂度过高的 idea |
| GitHub Token | 空 | 配置后可自动创建仓库并推送代码 |
| Agent 并发数 | 2 | Claude Code 同时运行的最大任务数 |
| Agent 超时 | 600000ms (10分钟) | 单个 Agent 任务的最大执行时间 |

也可以通过 REST API 管理配置：

```bash
# 获取当前配置
curl http://localhost:3456/api/config

# 更新配置
curl -X PUT http://localhost:3456/api/config \
  -H "Content-Type: application/json" \
  -d '{"schedule":{"enabled":true,"frequency":"daily","hour":9,"minute":0},...}'
```

## Usage

1. **采集 Idea** — 在 Ideas 页面点击 "Gather Ideas" 按钮手动触发，或在 Settings 中开启自动采集
2. **浏览 & 筛选** — Ideas 列表展示所有采集到的 idea，包含 Gap 分数、Value 分数、复杂度等分析结果
3. **构建项目** — 对感兴趣的 idea 点击 "Build"，Claude Code 将自动完成编码、测试、文档
4. **查看进度** — 在 Projects 页面查看构建进度、日志和 GitHub 仓库链接

## Project Structure

```
packages/
├── shared/          # 共享 TypeScript 类型定义
├── server/          # 后端服务
│   ├── src/
│   │   ├── api/     # REST API 路由
│   │   ├── brain/   # Claude Code Agent 集成
│   │   │   ├── agent.ts    # Agent SDK 封装
│   │   │   ├── miner.ts    # Idea 采集（多数据源）
│   │   │   ├── analyzer.ts # Idea 分析（Gap/Value/Feasibility）
│   │   │   ├── builder.ts  # 项目生成（vibe coding + GitHub 推送）
│   │   │   └── pipeline.ts # 流程编排
│   │   ├── db/      # SQLite 数据库（自动创建，无需手动配置）
│   │   ├── scheduler/ # Cron 定时任务
│   │   └── ws/      # WebSocket 实时推送
│   └── data/        # SQLite 数据库文件（自动生成，已 gitignore）
└── web/             # React Dashboard
    └── src/
        ├── pages/   # Ideas / Projects / Settings 页面
        ├── components/ # Layout 等 UI 组件
        └── lib/     # API 客户端 / WebSocket 客户端
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/ideas | 获取 idea 列表 |
| GET | /api/ideas/:id | 获取 idea 详情 |
| POST | /api/ideas/:id/build | 开始构建项目 |
| PATCH | /api/ideas/:id | 更新 idea 状态 |
| GET | /api/projects | 获取项目列表 |
| GET | /api/projects/:id | 获取项目详情 |
| GET | /api/config | 获取配置 |
| PUT | /api/config | 更新配置 |
| POST | /api/gather | 手动触发 idea 采集 |
| GET | /api/health | 健康检查 |

## License

MIT
