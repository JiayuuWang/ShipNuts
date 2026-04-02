import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useWS } from '../hooks/WSContext';
import PipelinePanel from '../components/PipelinePanel';
import type { Idea, NewIdeaPayload } from '@shipnuts/shared';
import { Sparkles, ExternalLink, Rocket, X, Search, RefreshCw } from 'lucide-react';

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [gathering, setGathering] = useState(false);
  const [pipelineId, setPipelineId] = useState<string | null>(null);
  const { subscribe } = useWS();

  useEffect(() => {
    loadIdeas();
  }, []);

  // Listen for new ideas via WS and auto-refresh
  useEffect(() => {
    const unsub = subscribe<NewIdeaPayload>('idea:new', () => {
      loadIdeas();
    });
    return unsub;
  }, [subscribe]);

  async function loadIdeas() {
    setLoading(true);
    try {
      const data = await api.getIdeas();
      setIdeas(data);
    } catch (err) {
      console.error('Failed to load ideas:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleBuild(id: string) {
    try {
      const result = await api.buildIdea(id);
      setPipelineId(result.pipelineId);
      loadIdeas();
    } catch (err) {
      console.error('Failed to start build:', err);
    }
  }

  async function handleTriggerGather() {
    setGathering(true);
    try {
      const result = await api.triggerGather();
      setPipelineId(result.pipelineId);
    } catch {
      // ignore
    } finally {
      setGathering(false);
    }
  }

  const filtered = ideas.filter(
    (idea) =>
      idea.title.toLowerCase().includes(filter.toLowerCase()) ||
      idea.description.toLowerCase().includes(filter.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return '#22c55e';
      case 'building': return '#f59e0b';
      case 'completed': return '#3b82f6';
      case 'rejected': return '#ef4444';
      default: return '#a1a1aa';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Ideas</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Curated project ideas from across the web
          </p>
        </div>
        <button
          onClick={handleTriggerGather}
          disabled={gathering}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: 'var(--color-accent)', color: '#000' }}
        >
          <RefreshCw className={`w-4 h-4 ${gathering ? 'animate-spin' : ''}`} />
          {gathering ? 'Gathering...' : 'Gather Ideas'}
        </button>
      </div>

      {/* Pipeline Visualization */}
      <PipelinePanel pipelineId={pipelineId} subscribe={subscribe} />

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
        <input
          type="text"
          placeholder="Search ideas..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm border outline-none focus:ring-1"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text)',
          }}
        />
      </div>

      {loading ? (
        <div className="text-center py-20" style={{ color: 'var(--color-text-secondary)' }}>
          Loading ideas...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Sparkles className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-text-secondary)' }} />
          <p style={{ color: 'var(--color-text-secondary)' }}>
            No ideas yet. Click "Gather Ideas" to start collecting.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((idea) => (
            <div
              key={idea.id}
              className="p-5 rounded-xl border cursor-pointer transition-colors"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
              }}
              onClick={() => setSelectedIdea(idea)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold">{idea.title}</h3>
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: getStatusColor(idea.status) + '20', color: getStatusColor(idea.status) }}
                    >
                      {idea.status}
                    </span>
                  </div>
                  <p className="text-sm line-clamp-2 mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                    {idea.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    <span>{idea.source}</span>
                    <span>{new Date(idea.capturedAt).toLocaleDateString()}</span>
                    {idea.analysis && (
                      <>
                        <span>Gap: {idea.analysis.gap.gapScore}/10</span>
                        <span>Value: {idea.analysis.value.valueScore}/100</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {idea.sourceUrl && (
                    <a
                      href={idea.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: 'var(--color-text-secondary)' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  {idea.status === 'new' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBuild(idea.id);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer hover:opacity-80"
                      style={{ backgroundColor: 'var(--color-accent)', color: '#000' }}
                    >
                      <Rocket className="w-3.5 h-3.5" />
                      Build
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Idea Detail Modal */}
      {selectedIdea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-2xl rounded-2xl border p-6 max-h-[80vh] overflow-auto" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-xl font-bold">{selectedIdea.title}</h2>
              <button onClick={() => setSelectedIdea(null)} className="p-1 cursor-pointer" style={{ color: 'var(--color-text-secondary)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
              {selectedIdea.description}
            </p>

            {selectedIdea.analysis && (
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--color-bg)' }}>
                  <div className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Gap Score</div>
                  <div className="text-2xl font-bold">{selectedIdea.analysis.gap.gapScore}<span className="text-sm font-normal">/10</span></div>
                </div>
                <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--color-bg)' }}>
                  <div className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Value Score</div>
                  <div className="text-2xl font-bold">{selectedIdea.analysis.value.valueScore}<span className="text-sm font-normal">/100</span></div>
                </div>
                <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--color-bg)' }}>
                  <div className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Complexity</div>
                  <div className="text-2xl font-bold capitalize">{selectedIdea.analysis.feasibility.complexity}</div>
                </div>
              </div>
            )}

            {selectedIdea.analysis && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-1">Gap Analysis</h3>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{selectedIdea.analysis.gap.gapAnalysis}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-1">Target Users</h3>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{selectedIdea.analysis.value.targetUsers}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-1">Pain Point</h3>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{selectedIdea.analysis.value.painPoint}</p>
                </div>
                {selectedIdea.analysis.feasibility.recommendedTechStack.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-1">Recommended Stack</h3>
                    <div className="flex gap-2 flex-wrap">
                      {selectedIdea.analysis.feasibility.recommendedTechStack.map((tech) => (
                        <span key={tech} className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-secondary)' }}>
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
              {selectedIdea.status === 'new' && (
                <>
                  <button
                    onClick={() => {
                      api.updateIdeaStatus(selectedIdea.id, 'rejected');
                      setSelectedIdea(null);
                      loadIdeas();
                    }}
                    className="px-4 py-2 rounded-lg text-sm border cursor-pointer hover:opacity-80"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => {
                      handleBuild(selectedIdea.id);
                      setSelectedIdea(null);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer hover:opacity-80"
                    style={{ backgroundColor: 'var(--color-accent)', color: '#000' }}
                  >
                    <Rocket className="w-4 h-4" />
                    Build This
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
