import { useEffect, useRef, useState } from 'react';
import type { PipelineStatusPayload, AgentOutputPayload, PipelinePhase, PipelinePhaseStatus, WSEventType } from '@shipnuts/shared';
import { Search, BarChart3, Hammer, Terminal, ChevronDown, ChevronUp, Loader2, CheckCircle2, XCircle, Circle } from 'lucide-react';

interface PhaseState {
  status: PipelinePhaseStatus;
  message: string;
  progress?: number;
}

interface AgentLog {
  agentId: string;
  type: string;
  content: string;
  toolName?: string;
  timestamp: string;
}

interface PipelinePanelProps {
  pipelineId: string | null;
  subscribe: <T = unknown>(type: WSEventType, handler: (payload: T) => void) => () => void;
}

const phaseConfig: { key: PipelinePhase; label: string; icon: typeof Search }[] = [
  { key: 'gather', label: 'Gather', icon: Search },
  { key: 'analyze', label: 'Analyze', icon: BarChart3 },
  { key: 'build', label: 'Build', icon: Hammer },
];

export default function PipelinePanel({ pipelineId, subscribe }: PipelinePanelProps) {
  const [phases, setPhases] = useState<Record<PipelinePhase, PhaseState>>({
    gather: { status: 'pending', message: 'Waiting...' },
    analyze: { status: 'pending', message: 'Waiting...' },
    build: { status: 'pending', message: 'Waiting...' },
  });
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [showLogs, setShowLogs] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Reset when new pipeline starts
  useEffect(() => {
    if (!pipelineId) return;
    setPhases({
      gather: { status: 'pending', message: 'Waiting...' },
      analyze: { status: 'pending', message: 'Waiting...' },
      build: { status: 'pending', message: 'Waiting...' },
    });
    setLogs([]);
  }, [pipelineId]);

  // Subscribe to pipeline events
  useEffect(() => {
    if (!pipelineId) return;

    const unsubStatus = subscribe<PipelineStatusPayload>('pipeline:status', (payload) => {
      if (payload.pipelineId !== pipelineId) return;
      setPhases((prev) => ({
        ...prev,
        [payload.phase]: {
          status: payload.status,
          message: payload.message,
          progress: payload.progress,
        },
      }));
    });

    const unsubOutput = subscribe<AgentOutputPayload>('agent:output', (payload) => {
      if (payload.pipelineId !== pipelineId) return;
      setLogs((prev) => {
        // Throttle: keep last 500 entries
        const next = [...prev, {
          agentId: payload.agentId,
          type: payload.type,
          content: payload.content,
          toolName: payload.toolName,
          timestamp: payload.timestamp,
        }];
        return next.length > 500 ? next.slice(-500) : next;
      });
    });

    return () => {
      unsubStatus();
      unsubOutput();
    };
  }, [pipelineId, subscribe]);

  if (!pipelineId) return null;

  const isRunning = Object.values(phases).some((p) => p.status === 'running' || p.status === 'started');
  const isDone = Object.values(phases).some((p) => p.status === 'completed' || p.status === 'failed') && !isRunning;

  return (
    <div
      className="mb-6 rounded-xl border overflow-hidden"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      {/* Phase Progress Bar */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            {isRunning && <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--color-accent)' }} />}
            Pipeline
            {isDone && !Object.values(phases).some((p) => p.status === 'failed') && (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            )}
          </h3>
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {pipelineId.slice(0, 8)}
          </span>
        </div>

        {/* Phase Steps */}
        <div className="flex items-center gap-2">
          {phaseConfig.map(({ key, label, icon: Icon }, idx) => {
            const phase = phases[key];
            return (
              <div key={key} className="flex items-center gap-2 flex-1">
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1 text-xs font-medium"
                  style={{
                    backgroundColor:
                      phase.status === 'running' || phase.status === 'started'
                        ? 'rgba(34, 197, 94, 0.15)'
                        : phase.status === 'completed'
                          ? 'rgba(34, 197, 94, 0.08)'
                          : phase.status === 'failed'
                            ? 'rgba(239, 68, 68, 0.1)'
                            : 'var(--color-bg)',
                    color:
                      phase.status === 'running' || phase.status === 'started'
                        ? '#22c55e'
                        : phase.status === 'completed'
                          ? '#4ade80'
                          : phase.status === 'failed'
                            ? '#ef4444'
                            : 'var(--color-text-secondary)',
                  }}
                >
                  {phase.status === 'running' || phase.status === 'started' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                  ) : phase.status === 'completed' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  ) : phase.status === 'failed' ? (
                    <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 flex-shrink-0" />
                  )}
                  <span>{label}</span>
                </div>
                {idx < phaseConfig.length - 1 && (
                  <div className="w-4 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Current Phase Message */}
        {Object.entries(phases).map(([key, phase]) => {
          if (phase.status !== 'running' && phase.status !== 'started') return null;
          return (
            <div key={key} className="mt-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {phase.message}
              {phase.progress !== undefined && (
                <div className="mt-1.5 w-full rounded-full h-1" style={{ backgroundColor: 'var(--color-bg)' }}>
                  <div
                    className="h-1 rounded-full transition-all duration-500"
                    style={{ width: `${phase.progress}%`, backgroundColor: 'var(--color-accent)' }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Agent Output Terminal */}
      <div style={{ borderTop: '1px solid var(--color-border)' }}>
        <button
          onClick={() => setShowLogs(!showLogs)}
          className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium cursor-pointer hover:opacity-80"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <span className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5" />
            Agent Output ({logs.length})
          </span>
          {showLogs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showLogs && (
          <div
            className="max-h-64 overflow-auto font-mono text-xs px-4 pb-3"
            style={{ backgroundColor: 'var(--color-bg)' }}
          >
            {logs.length === 0 ? (
              <div className="py-4 text-center" style={{ color: 'var(--color-text-secondary)' }}>
                Waiting for agent output...
              </div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="py-0.5 flex gap-2" style={{ color: getLogColor(log.type) }}>
                  <span className="flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="flex-shrink-0 w-16 text-right" style={{ color: getLogTypeColor(log.type) }}>
                    [{log.type}]
                  </span>
                  <span className="break-all">
                    {log.toolName && (
                      <span style={{ color: '#f59e0b' }}>{log.toolName}: </span>
                    )}
                    {truncateContent(log.content)}
                  </span>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}

function getLogColor(type: string): string {
  switch (type) {
    case 'error': return '#ef4444';
    case 'result': return '#22c55e';
    case 'tool_use': return '#f59e0b';
    default: return 'var(--color-text-secondary)';
  }
}

function getLogTypeColor(type: string): string {
  switch (type) {
    case 'init': return '#3b82f6';
    case 'text': return '#a1a1aa';
    case 'tool_use': return '#f59e0b';
    case 'progress': return '#8b5cf6';
    case 'result': return '#22c55e';
    case 'error': return '#ef4444';
    default: return 'var(--color-text-secondary)';
  }
}

function truncateContent(content: string): string {
  if (content.length > 300) {
    return content.slice(0, 300) + '...';
  }
  return content;
}
