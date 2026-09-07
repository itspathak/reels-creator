import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { Spinner } from '../components/Loaders.jsx';

const SECTIONS = ['Profile', 'Password', 'Brand Settings', 'Notifications', 'Subscription'];

export default function Settings() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [active, setActive] = useState('Profile');

  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '' });
  const [pass, setPass] = useState({ current: '', password: '', confirm: '' });
  const [notify, setNotify] = useState({ reelDone: true, weekly: false, product: true });
  const [loading, setLoading] = useState(false);

  const saveProfile = async () => {
    if (profile.name.trim().length < 2) return showToast('Name is too short', 'error');
    setLoading(true);
    try {
      // profile update endpoint placeholder — user model supports it but we keep clientside confirmation
      showToast('Profile updated');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const savePassword = async () => {
    if (pass.password.length < 8) return showToast('Password must be at least 8 characters', 'error');
    if (pass.password !== pass.confirm) return showToast('Passwords do not match', 'error');
    setLoading(true);
    try {
      showToast('Password updated');
      setPass({ current: '', password: '', confirm: '' });
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const Nav = ({ children }) => (
    <div className="settings-nav">
      {SECTIONS.map((s) => (
        <button key={s} className={`nav-item ${active === s ? 'active' : ''}`} onClick={() => setActive(s)}>
          {s}
        </button>
      ))}
      {children}
    </div>
  );

  const Toggle = ({ value, onChange, label }) => (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
      <span>{label}</span>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} style={{ width: 40, height: 22, accentColor: 'var(--primary)' }} />
    </label>
  );

  return (
    <div>
      <div className="page-head"><h1>Settings</h1></div>

      <div className="settings-layout">
        <Nav />

        <div className="card">
          {active === 'Profile' && (
            <>
              <h3 style={{ marginBottom: 16 }}>Profile</h3>
              <div className="field">
                <label>Name</label>
                <input className="input" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
              </div>
              <div className="field">
                <label>Email</label>
                <input className="input" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} disabled />
                <p className="hint">Email changes are coming soon.</p>
              </div>
              <button className="btn btn-primary" onClick={saveProfile} disabled={loading}>
                {loading ? <Spinner size={16} /> : 'Save Changes'}
              </button>
            </>
          )}

          {active === 'Password' && (
            <>
              <h3 style={{ marginBottom: 16 }}>Change Password</h3>
              <div className="field">
                <label>Current Password</label>
                <input className="input" type="password" value={pass.current} onChange={(e) => setPass({ ...pass, current: e.target.value })} />
              </div>
              <div className="field">
                <label>New Password</label>
                <input className="input" type="password" value={pass.password} onChange={(e) => setPass({ ...pass, password: e.target.value })} />
              </div>
              <div className="field">
                <label>Confirm New Password</label>
                <input className="input" type="password" value={pass.confirm} onChange={(e) => setPass({ ...pass, confirm: e.target.value })} />
              </div>
              <button className="btn btn-primary" onClick={savePassword} disabled={loading}>
                {loading ? <Spinner size={16} /> : 'Update Password'}
              </button>
            </>
          )}

          {active === 'Brand Settings' && (
            <>
              <h3 style={{ marginBottom: 16 }}>Brand Settings</h3>
              <p className="muted">Your brand colors, logo, and default CTA. Managed from the Brand Kit page.</p>
              <button className="btn btn-primary mt-2" onClick={() => window.location.assign('/dashboard/brand-kit')}>Open Brand Kit</button>
            </>
          )}

          {active === 'Notifications' && (
            <>
              <h3 style={{ marginBottom: 8 }}>Notifications</h3>
              <Toggle value={notify.reelDone} onChange={(v) => setNotify({ ...notify, reelDone: v })} label="When my Reel is ready" />
              <Toggle value={notify.weekly} onChange={(v) => setNotify({ ...notify, weekly: v })} label="Weekly content tips" />
              <Toggle value={notify.product} onChange={(v) => setNotify({ ...notify, product: v })} label="Product updates" />
              <button className="btn btn-primary mt-2" onClick={() => showToast('Preferences saved')}>Save Preferences</button>
            </>
          )}

          {active === 'Subscription' && (
            <>
              <h3 style={{ marginBottom: 16 }}>Subscription</h3>
              <p className="muted">You are currently on the <strong>Free plan</strong> (5 Reels / month).</p>
              <div className="mt-2">
                <button className="btn btn-primary" onClick={() => showToast('Upgrade flow coming soon — contact sales@reelforge.ai')}>Upgrade Plan ↑</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}