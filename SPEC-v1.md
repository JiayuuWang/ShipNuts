# ShipNuts - 自动化开源项目生成系统

## 1. 项目概述

ShipNuts 是一个长期运行的自动化系统，能够将想法自动转化为 GitHub 开源项目。系统使用 Claude Code 作为推理引擎，通过定时从各大信息源搜集最新前沿的开源项目和 idea，经过智能分析后呈现选题列表，用户选中后自动完成项目开发并上传至 GitHub。

## 2. 可行性分析

### 2.1 技术可行性 ✅

- **Claude Code Agent SDK**: Anthropic 已发布官方 SDK，支持编程调用 autonomous agent loop
- **MCP 服务器**: Claude Code 支持 MCP 扩展，可连接外部服务
- **Subagents**: 支持创建自定义子代理处理特定任务
- **Checkpoints**: 支持检查点功能，实现长时间运行的自主操作

### 2.2 挑战与应对

| 挑战 | 应对方案 |
|------|----------|
| Claude Code 调用成本 | 采集层用轻量 prompt 快速筛选，分析层用深度 prompt |
| 选题"无竞品"判断 | Claude Code 直接调用 GitHub API 搜索验证 |
| 项目生成质量 | 使用 Claude Code 完整 agent loop + 检查点保存 |
| GitHub 授权 | OAuth 集成，用户首次需授权 |
| 长时间任务 | 任务队列 + 检查点恢复 + 状态持久化 |
| 并行处理多个 idea | 使用 Claude Code Subagents 并行分析 |

## 3. 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         ShipNuts Core                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Claude Code (Unified Brain)                │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐  │   │
│  │  │ Idea Miner  │→ │   Analyzer  │→ │ Project Builder│  │   │
│  │  │  (Gather)   │  │  (Filter)   │  │ (Vibe Coding)  │  │   │
│  │  └─────────────┘  └─────────────┘  └────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           ↑                                     │
│         ┌─────────────────┼─────────────────┐                   │
│         │                 │                 │                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Scheduler   │  │    Data      │  │  GitHub API  │          │
│  │   (Cron)     │  │   Sources    │  │  (Uploader)  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                           ↓                                     │
│                   ┌───────────────┐                             │
│                   │   Dashboard   │                             │
│                   │   (Web UI)    │                             │
│                   └───────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

## 4. 核心模块设计

### 4.1 Scheduler (调度器)

- 用户配置采集频率（每小时/每天/每周）
- 支持多个采集任务并行
- 任务持久化，支持重启恢复

### 4.2 Idea Miner (Idea 采集器) - Claude Code 驱动

**核心设计**: 采集工作由 Claude Code Agent 执行，而非简单的 API 爬取。

**信息源**:
- Hacker News (API)
- Product Hunt (API/Web scraping)
- Reddit (r/indiehackers, r/ideas, r/startups)
- GitHub Trending (GraphQL API)
- Twitter/X (开发者API)
- 技术博客 RSS 订阅
- Indie Hacker Newsletter

**Claude Code 采集流程**:
```
1. 获取源数据 (通过 MCP 或 API)
2. 使用 Claude Code 分析每个条目:
   - 是否是一个 idea/项目想法？
   - 是否足够新（最近 24-48 小时）？
   - 是否有足够的描述信息？
   - 是否符合用户配置的关键词？
3. 提取并结构化: title, description, source, sourceUrl, rawContent
4. 输出原始 idea 候选列表
```

**Claude Code Prompt 示例**:
```markdown
你是一个 idea 采集助手。从以下 Hacker News 数据中提取有潜力的项目想法。

筛选标准：
- 必须是尚未实现的想法，或正在寻求建议的项目
- 必须有足够的描述信息（至少 2 句话）
- 必须是最近 24 小时内的内容
- 排除招聘、投资、自我推广类内容

输出 JSON 数组格式：
[{
  "title": "项目标题",
  "description": "项目描述（包含问题和解决方案）",
  "source": "Hacker News",
  "sourceUrl": "原始链接"
}]
```

### 4.3 Idea Analyzer (选题分析器) - Claude Code 驱动

**核心设计**: 所有分析工作由 Claude Code Agent 完成，利用其强大的推理能力和工具调用能力。

**分析流程**:
```
1. 接收原始 idea 候选列表
2. 对每个 idea 执行深度分析（Claude Code 并行处理）:
   
   a) 空白点分析（使用 GitHub Search API + Claude Code 推理）
      - 搜索 GitHub 相似项目
      - 搜索 NPM/Crates/PyPI 同名包
      - 分析竞品数量和差异化程度
   
   b) 价值评估（Claude Code 推理）
      - 目标用户是谁？规模多大？
      - 解决什么痛点？有多痛？
      - 商业化潜力如何？
   
   c) 可实现性评估（Claude Code 推理）
      - 技术复杂度
      - 预计开发时间
      - 推荐技术栈

3. 根据用户配置过滤:
   - 最低空白点分数
   - 最低价值分数
   - 最大复杂度

4. 输出结构化分析结果
```

**Claude Code Prompt 示例**:
```markdown
你是一个资深产品分析师。请分析以下 idea 的市场空白点和价值。

Idea: {title}
描述: {description}

请执行以下步骤：

1. 搜索 GitHub 类似项目（使用 GitHub API）
2. 搜索 NPM/PyPI 是否有类似工具
3. 分析竞品，评估差异化空间
4. 评估商业价值

输出 JSON：
{
  "gapScore": 0-10,  // 市场空白程度，10=几乎无竞品
  "gapAnalysis": "详细说明",
  "valueScore": 0-100,
  "targetUsers": "目标用户描述",
  "painPoint": "解决的痛点",
  "monetization": "low|medium|high",
  "complexity": "low|medium|high",
  "estimatedHours": 数字,
  "recommendedTechStack": ["技术栈建议"]
}
```

```typescript
interface IdeaAnalysis {
  id: string;
  title: string;
  description: string;
  source: string;
  sourceUrl: string;
  capturedAt: Date;
  
  analysis: {
   空白点: {
      gapScore: number; // 0-10, 越高表示竞品越少
      gapAnalysis: string;
      similarProjects: string[]; // 找到的类似项目
    };
    价值: {
      valueScore: number; // 0-100
      targetUsers: string;
      painPoint: string;
      monetizationPotential: 'low' | 'medium' | 'high';
    };
    可实现性: {
      complexity: 'low' | 'medium' | 'high';
      estimatedHours: number;
      recommendedTechStack: string[];
      techStackViable: boolean;
    };
  };
  
  rawIdea: {
    // Claude Code 提取的原始信息
    title: string;
    description: string;
    source: string;
    sourceUrl: string;
  };
}
```

### 4.4 Claude Code Unified Brain (统一大脑)

**核心设计**: 所有智能决策统一由 Claude Code Agent 处理，分为三种任务类型。

**任务类型**:

1. **采集任务 (Gather Task)** - 轻量级
   - 获取源数据
   - 快速筛选符合条件的 idea
   - 输出原始候选列表
   - prompt 简短，执行快速

2. **分析任务 (Analyze Task)** - 中等重量
   - 并行分析多个 idea
   - 调用 GitHub/NPM API 搜索竞品
   - 深度推理空白点和价值
   - 可使用 Subagents 并行

3. **构建任务 (Build Task)** - 重量级
   - 完整的 vibe coding loop
   - 创建项目结构
   - 实现核心功能
   - 编写测试和文档
   - 支持检查点恢复

```typescript
// 统一的 Claude Code 任务接口
interface ClaudeCodeTask {
  id: string;
  type: 'gather' | 'analyze' | 'build';
  status: 'pending' | 'running' | 'completed' | 'failed';
  input: any;
  output?: any;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

// 采集任务配置
interface GatherTaskConfig {
  sources: string[];  // 数据源列表
  maxIdeas: number;   // 最多采集数量
  minDescriptionLen: number;
  timeWindow: '24h' | '48h' | '7d';
}

// 分析任务配置
interface AnalyzeTaskConfig {
  ideas: RawIdea[];
  userCriteria: {
    minGapScore: number;
    minValueScore: number;
    maxComplexity: 'low' | 'medium' | 'high';
  };
  searchAPIs: {
    github: { token: string };
    npm?: { token: string };
  };
}

// 构建任务配置
interface BuildTaskConfig {
  ideaId: string;
  analysis: IdeaAnalysis;
  github: {
    token: string;
    repoName: string;
    isPrivate: boolean;
  };
  buildOptions: {
    includeTests: boolean;
    includeCI: boolean;
    license: string;
  };
}
```

**核心能力**:
- 使用 Subagents 并行处理多个采集/分析任务
- 任务队列管理（优先级：build > analyze > gather）
- 资源限制（超时控制）
- 检查点保存与恢复（尤其是 build 任务）
- MCP 服务器集成（GitHub, Search 等）

### 4.5 Dashboard (仪表盘)

**功能**:
- 选题列表展示（可筛选/排序）
- 选题详情查看
- 一键启动项目生成
- 项目进度跟踪
- 历史项目查看
- 设置面板

**UI 风格**:
模仿 opencode 和 openai 官网的UI设计


### 4.6 GitHub Uploader

- OAuth 授权管理
- 仓库创建（公开/私有）
- 自动 Push
- 支持自定义 README 模板

## 5. 数据模型

```typescript
// 选题
interface Idea {
  id: string;
  title: string;
  description: string;
  source: string;
  sourceUrl: string;
  capturedAt: Date;
  analysis: IdeaAnalysis;
  status: 'new' | 'viewed' | 'building' | 'completed' | 'rejected';
}

// 项目
interface Project {
  id: string;
  ideaId: string;
  status: 'pending' | 'initializing' | 'building' | 'pushing' | 'completed' | 'failed';
  githubRepo?: string;
  startedAt: Date;
  completedAt?: Date;
  progress: number;
  logs: string[];
  error?: string;
}

// 用户配置
interface UserConfig {
  schedule: {
    enabled: boolean;
    frequency: 'hourly' | 'daily' | 'weekly';
    hour?: number; // 0-23
    minute?: number;
  };
  sources: string[];
  criteria: {
    minGapScore: number;
    minValueScore: number;
    maxComplexity: 'low' | 'medium' | 'high';
  };
  github?: {
    token?: string;
    username?: string;
  };
  claudeCode?: {
    maxConcurrent: number;
    timeout: number; // ms
  };
}
```

## 6. API 设计

### 6.1 REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/ideas | 获取选题列表 |
| GET | /api/ideas/:id | 获取选题详情 |
| POST | /api/ideas/:id/build | 开始构建项目 |
| GET | /api/projects | 获取项目列表 |
| GET | /api/projects/:id | 获取项目详情 |
| GET | /api/config | 获取用户配置 |
| PUT | /api/config | 更新用户配置 |
| POST | /api/github/auth | GitHub OAuth |

### 6.2 WebSocket

- `project:progress` - 项目构建进度
- `idea:new` - 新选题通知

## 7. 技术栈

- **后端**: Node.js + TypeScript
- **数据库**: SQLite (轻量级，长期运行)
- **前端**: React + TypeScript + Tailwind CSS
- **Agent**: Claude Code Agent SDK
- **调度**: node-cron
- **GitHub**: Octokit

## 8. 实施路线

### Phase 1: 核心功能 (MVP)
- [ ] 项目骨架搭建 (Node.js + React)
- [ ] Scheduler 定时任务
- [ ] Claude Code Agent SDK 集成
- [ ] Claude Code 采集任务 (HN API)
- [ ] Claude Code 分析任务 (GitHub API 搜索竞品)
- [ ] 基础 Dashboard (选题列表)
- [ ] 端到端流程跑通

### Phase 2: 完善功能
- [ ] 多源采集扩展 (Product Hunt, Reddit, RSS)
- [ ] GitHub 集成 (创建仓库 + Push)
- [ ] Claude Code 构建任务 (vibe coding)
- [ ] 任务队列与并行 (Subagents)
- [ ] 项目进度跟踪

### Phase 3: 优化体验
- [ ] 检查点恢复
- [ ] WebSocket 实时更新
- [ ] 用户自定义配置
- [ ] MCP 服务器集成
- [ ] 性能优化

## 9. 风险提示

1. **选题质量**: AI 分析可能存在误判，建议用户先验证再构建
2. **构建失败**: 复杂项目可能中途失败，需预留人工介入接口
3. **API 限制**: 注意各平台 API 限制，合理设置采集频率
4. **Claude Code 限制**: 需确保 Claude Code CLI 已安装且配置正确
