// === Idea Types ===

export interface RawIdea {
  title: string;
  description: string;
  source: string;
  sourceUrl: string;
}

export interface GapAnalysis {
  gapScore: number; // 0-10, higher means fewer competitors
  gapAnalysis: string;
  similarProjects: string[];
}

export interface ValueAssessment {
  valueScore: number; // 0-100
  targetUsers: string;
  painPoint: string;
  monetizationPotential: 'low' | 'medium' | 'high';
}

export interface FeasibilityAssessment {
  complexity: 'low' | 'medium' | 'high';
  estimatedHours: number;
  recommendedTechStack: string[];
  techStackViable: boolean;
}

export interface IdeaAnalysis {
  gap: GapAnalysis;
  value: ValueAssessment;
  feasibility: FeasibilityAssessment;
}

export type IdeaStatus = 'new' | 'viewed' | 'building' | 'completed' | 'rejected';

export interface Idea {
  id: string;
  title: string;
  description: string;
  source: string;
  sourceUrl: string;
  capturedAt: string;
  analysis: IdeaAnalysis | null;
  status: IdeaStatus;
}

// === Project Types ===

export type ProjectStatus = 'pending' | 'initializing' | 'building' | 'pushing' | 'completed' | 'failed';

export interface Project {
  id: string;
  ideaId: string;
  status: ProjectStatus;
  githubRepo: string | null;
  startedAt: string;
  completedAt: string | null;
  progress: number; // 0-100
  logs: string[];
  error: string | null;
}

// === Task Types ===

export type TaskType = 'gather' | 'analyze' | 'build';
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface ClaudeCodeTask {
  id: string;
  type: TaskType;
  status: TaskStatus;
  input: unknown;
  output?: unknown;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
}

export interface GatherTaskConfig {
  sources: string[];
  maxIdeas: number;
  minDescriptionLen: number;
  timeWindow: '24h' | '48h' | '7d';
}

export interface AnalyzeTaskConfig {
  ideas: RawIdea[];
  userCriteria: {
    minGapScore: number;
    minValueScore: number;
    maxComplexity: 'low' | 'medium' | 'high';
  };
}

export interface BuildTaskConfig {
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

// === User Config ===

export type ScheduleFrequency = 'hourly' | 'daily' | 'weekly';

export interface UserConfig {
  schedule: {
    enabled: boolean;
    frequency: ScheduleFrequency;
    hour: number; // 0-23
    minute: number; // 0-59
  };
  sources: string[];
  criteria: {
    minGapScore: number;
    minValueScore: number;
    maxComplexity: 'low' | 'medium' | 'high';
  };
  github: {
    token: string | null;
    username: string | null;
  };
  claudeCode: {
    maxConcurrent: number;
    timeout: number; // ms
  };
}

// === API Types ===

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// === WebSocket Event Types ===

export type WSEventType = 'project:progress' | 'idea:new' | 'task:update' | 'pipeline:status' | 'agent:output';

export interface WSEvent<T = unknown> {
  type: WSEventType;
  payload: T;
}

export interface ProjectProgressPayload {
  projectId: string;
  progress: number;
  status: ProjectStatus;
  log?: string;
}

export interface NewIdeaPayload {
  idea: Idea;
}

// === Pipeline Visualization Types ===

export type PipelinePhase = 'gather' | 'analyze' | 'build';
export type PipelinePhaseStatus = 'pending' | 'started' | 'running' | 'completed' | 'failed';

export interface PipelineStatusPayload {
  pipelineId: string;
  phase: PipelinePhase;
  status: PipelinePhaseStatus;
  message: string;
  progress?: number;
  detail?: {
    source?: string;
    ideaTitle?: string;
    totalItems?: number;
    processedItems?: number;
  };
}

export type AgentOutputType = 'init' | 'text' | 'tool_use' | 'tool_result' | 'progress' | 'result' | 'error';

export interface AgentOutputPayload {
  pipelineId: string;
  agentId: string;
  type: AgentOutputType;
  content: string;
  toolName?: string;
  timestamp: string;
}
