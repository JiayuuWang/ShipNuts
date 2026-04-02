import { Outlet, NavLink } from 'react-router-dom';
import { Lightbulb, FolderGit2, Settings, Zap, Wifi, WifiOff } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';
import { WSContext } from '../hooks/WSContext';

const navItems = [
  { to: '/', icon: Lightbulb, label: 'Ideas' },
  { to: '/projects', icon: FolderGit2, label: 'Projects' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout() {
  const ws = useWebSocket();

  return (
    <WSContext.Provider value={ws}>
      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="w-60 border-r flex flex-col" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
          <div className="p-5 flex items-center gap-2.5">
            <Zap className="w-6 h-6" style={{ color: 'var(--color-accent)' }} />
            <span className="text-lg font-semibold">ShipNuts</span>
          </div>
          <nav className="flex-1 px-3">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1 ${
                    isActive
                      ? 'text-white'
                      : 'hover:text-white'
                  }`
                }
                style={({ isActive }) => ({
                  color: isActive ? 'var(--color-text)' : 'var(--color-text-secondary)',
                  backgroundColor: isActive ? 'var(--color-surface-hover)' : 'transparent',
                })}
              >
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="p-4 flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {ws.connected ? (
              <Wifi className="w-3 h-3 text-green-500" />
            ) : (
              <WifiOff className="w-3 h-3 text-red-500" />
            )}
            Powered by Claude Code
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-8">
          <Outlet />
        </main>
      </div>
    </WSContext.Provider>
  );
}
