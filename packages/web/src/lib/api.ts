import type { Idea, Project, UserConfig, ApiResponse } from '@shipnuts/shared';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json: ApiResponse<T> = await res.json();
  if (!json.success) throw new Error(json.error || 'Request failed');
  return json.data as T;
}

export const api = {
  getIdeas: () => request<Idea[]>('/ideas'),
  getIdea: (id: string) => request<Idea>(`/ideas/${id}`),
  buildIdea: (id: string) => request<{ projectId: string; pipelineId: string }>(`/ideas/${id}/build`, { method: 'POST' }),
  updateIdeaStatus: (id: string, status: string) =>
    request<void>(`/ideas/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  getProjects: () => request<Project[]>('/projects'),
  getProject: (id: string) => request<Project>(`/projects/${id}`),

  getConfig: () => request<UserConfig>('/config'),
  updateConfig: (config: UserConfig) =>
    request<UserConfig>('/config', { method: 'PUT', body: JSON.stringify(config) }),

  triggerGather: () => request<{ pipelineId: string; message: string }>('/gather', { method: 'POST' }),
};
