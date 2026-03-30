import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { UserConfig } from '@shipnuts/shared';
import { Save, Check } from 'lucide-react';

const defaultConfig: UserConfig = {
  schedule: { enabled: false, frequency: 'daily', hour: 9, minute: 0 },
  sources: ['hackernews', 'github-trending'],
  criteria: { minGapScore: 6, minValueScore: 50, maxComplexity: 'medium' },
  github: { token: null, username: null },
  claudeCode: { maxConcurrent: 2, timeout: 600000 },
};

const allSources = [
  { id: 'hackernews', label: 'Hacker News' },
  { id: 'github-trending', label: 'GitHub Trending' },
  { id: 'reddit', label: 'Reddit' },
  { id: 'producthunt', label: 'Product Hunt' },
  { id: 'rss', label: 'RSS Feeds' },
];

export default function SettingsPage() {
  const [config, setConfig] = useState<UserConfig>(defaultConfig);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getConfig().then((data) => {
      setConfig(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    try {
      await api.updateConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save config:', err);
    }
  }

  if (loading) return <div style={{ color: 'var(--color-text-secondary)' }}>Loading...</div>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Configure ShipNuts behavior
          </p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ backgroundColor: saved ? '#16a34a' : 'var(--color-accent)', color: '#000' }}
        >
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>

      <div className="space-y-8">
        {/* Schedule */}
        <section className="p-5 rounded-xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <h2 className="font-semibold mb-4">Schedule</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.schedule.enabled}
                onChange={(e) => setConfig({ ...config, schedule: { ...config.schedule, enabled: e.target.checked } })}
                className="rounded"
              />
              <span className="text-sm">Enable automatic gathering</span>
            </label>
            <div className="flex gap-4">
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--color-text-secondary)' }}>Frequency</label>
                <select
                  value={config.schedule.frequency}
                  onChange={(e) => setConfig({ ...config, schedule: { ...config.schedule, frequency: e.target.value as any } })}
                  className="px-3 py-2 rounded-lg text-sm border"
                  style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--color-text-secondary)' }}>Hour</label>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={config.schedule.hour}
                  onChange={(e) => setConfig({ ...config, schedule: { ...config.schedule, hour: parseInt(e.target.value) } })}
                  className="w-20 px-3 py-2 rounded-lg text-sm border"
                  style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--color-text-secondary)' }}>Minute</label>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={config.schedule.minute}
                  onChange={(e) => setConfig({ ...config, schedule: { ...config.schedule, minute: parseInt(e.target.value) } })}
                  className="w-20 px-3 py-2 rounded-lg text-sm border"
                  style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Sources */}
        <section className="p-5 rounded-xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <h2 className="font-semibold mb-4">Data Sources</h2>
          <div className="space-y-2">
            {allSources.map((source) => (
              <label key={source.id} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={config.sources.includes(source.id)}
                  onChange={(e) => {
                    const sources = e.target.checked
                      ? [...config.sources, source.id]
                      : config.sources.filter((s) => s !== source.id);
                    setConfig({ ...config, sources });
                  }}
                  className="rounded"
                />
                <span className="text-sm">{source.label}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Criteria */}
        <section className="p-5 rounded-xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <h2 className="font-semibold mb-4">Filtering Criteria</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--color-text-secondary)' }}>Min Gap Score (0-10)</label>
              <input
                type="number"
                min={0}
                max={10}
                value={config.criteria.minGapScore}
                onChange={(e) => setConfig({ ...config, criteria: { ...config.criteria, minGapScore: parseInt(e.target.value) } })}
                className="w-20 px-3 py-2 rounded-lg text-sm border"
                style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--color-text-secondary)' }}>Min Value Score (0-100)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={config.criteria.minValueScore}
                onChange={(e) => setConfig({ ...config, criteria: { ...config.criteria, minValueScore: parseInt(e.target.value) } })}
                className="w-20 px-3 py-2 rounded-lg text-sm border"
                style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--color-text-secondary)' }}>Max Complexity</label>
              <select
                value={config.criteria.maxComplexity}
                onChange={(e) => setConfig({ ...config, criteria: { ...config.criteria, maxComplexity: e.target.value as any } })}
                className="px-3 py-2 rounded-lg text-sm border"
                style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        </section>

        {/* GitHub */}
        <section className="p-5 rounded-xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <h2 className="font-semibold mb-4">GitHub</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--color-text-secondary)' }}>Personal Access Token</label>
              <input
                type="password"
                value={config.github.token || ''}
                onChange={(e) => setConfig({ ...config, github: { ...config.github, token: e.target.value || null } })}
                placeholder="ghp_..."
                className="w-full px-3 py-2 rounded-lg text-sm border"
                style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--color-text-secondary)' }}>Username</label>
              <input
                type="text"
                value={config.github.username || ''}
                onChange={(e) => setConfig({ ...config, github: { ...config.github, username: e.target.value || null } })}
                className="w-full px-3 py-2 rounded-lg text-sm border"
                style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
