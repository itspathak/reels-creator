import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from '../components/Logo.jsx';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊', end: true },
  { to: '/dashboard/create', label: 'Create Reel', icon: '✨' },
  { to: '/dashboard/reels', label: 'My Reels', icon: '🎬' },
  { to: '/dashboard/templates', label: 'Templates', icon: '🧩' },
  { to: '/dashboard/brand-kit', label: 'Brand Kit', icon: '🎨' },
  { to: '/dashboard/usage', label: 'Usage', icon: '📈' },
  { to: '/dashboard/settings', label: 'Settings', icon: '⚙️' },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState('');

  const initials = (user?.name || 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const onLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <Logo size={32} />
          <span className="brand-name">ReelForge <em>AI</em></span>
        </div>
        <nav className="sidebar-nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="avatar">{initials}</div>
            <div className="sidebar-user-info">
              <strong>{user?.name}</strong>
              <span className="small muted">{user?.email}</span>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm btn-block" onClick={onLogout}>Log out</button>
        </div>
      </aside>

      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      <div className="main-area">
        <header className="topbar">
          <button className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open menu">☰</button>
          <div className="topbar-search">
            <span>🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reels…"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && search.trim()) {
                  navigate(`/dashboard/reels?q=${encodeURIComponent(search.trim())}`);
                }
              }}
            />
          </div>
          <div className="topbar-actions">
            <button className="icon-btn" aria-label="Notifications" onClick={() => navigate('/dashboard/reels')}>
              🔔
              <span className="dot" />
            </button>
            <div className="avatar" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard/settings')} title={user?.name}>
              {initials}
            </div>
          </div>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}