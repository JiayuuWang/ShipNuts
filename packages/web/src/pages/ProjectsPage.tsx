import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Project } from '@shipnuts/shared';
import { FolderGit2, ExternalLink, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setLoading(true);
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'failed': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'building': return <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />;
      default: return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Projects</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Track your project builds
        </p>
      </div>

      {loading ? (
        <div className="text-center py-20" style={{ color: 'var(--color-text-secondary)' }}>
          Loading projects...
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20">
          <FolderGit2 className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-text-secondary)' }} />
          <p style={{ color: 'var(--color-text-secondary)' }}>
            No projects yet. Select an idea to start building.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="p-5 rounded-xl border"
              style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getStatusIcon(project.status)}
                  <span className="font-semibold capitalize">{project.status}</span>
                </div>
                {project.githubRepo && (
                  <a
                    href={`https://github.com/${project.githubRepo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    {project.githubRepo}
                  </a>
                )}
              </div>

              {/* Progress bar */}
              <div className="w-full rounded-full h-2 mb-3" style={{ backgroundColor: 'var(--color-bg)' }}>
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{ width: `${project.progress}%`, backgroundColor: 'var(--color-accent)' }}
                />
              </div>

              <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                <span>Started: {new Date(project.startedAt).toLocaleString()}</span>
                {project.completedAt && (
                  <span>Completed: {new Date(project.completedAt).toLocaleString()}</span>
                )}
                <span>Progress: {project.progress}%</span>
              </div>

              {project.error && (
                <div className="mt-3 p-3 rounded-lg text-sm text-red-400" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                  {project.error}
                </div>
              )}

              {project.logs.length > 0 && (
                <details className="mt-3">
                  <summary className="text-xs cursor-pointer" style={{ color: 'var(--color-text-secondary)' }}>
                    Build Logs ({project.logs.length})
                  </summary>
                  <div className="mt-2 p-3 rounded-lg text-xs font-mono max-h-40 overflow-auto" style={{ backgroundColor: 'var(--color-bg)' }}>
                    {project.logs.map((log, i) => (
                      <div key={i} style={{ color: 'var(--color-text-secondary)' }}>{log}</div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
