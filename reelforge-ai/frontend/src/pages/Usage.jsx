import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { Skeleton } from '../components/Loaders.jsx';

export default function Usage() {
  const { showToast } = useToast();
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    api
      .get('/usage')
      .then((res) => setUsage(res.data))
      .catch((err) => showToast(err.message, 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!usage) {
    return (
      <div>
        <div className="page-head"><h1>Usage</h1></div>
        <div className="usage-hero"><Skeleton width="120" height={20}/><Skeleton width="60%" height={56} style={{ marginTop: 10 }} /></div>
      </div>
    );
  }

  const pct = usage.reelsLimit > 0 ? Math.min(100, Math.round((usage.reelsUsed / usage.reelsLimit) * 100)) : 0;
  const resetLabel = usage.resetDate ? new Date(usage.resetDate).toLocaleDateString() : 'Monthly';

  return (
    <div>
      <div className="page-head"><h1>Usage</h1></div>

      <div className="usage-hero">
        <div className="plan-name">{usage.plan} plan {usage.plan !== 'free' && '· active'}</div>
        <div className="big-number">{usage.reelsRemaining}</div>
        <div>Reels remaining this cycle</div>
        <div className="progress"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
        <div className="small" style={{ opacity: 0.9 }}>{pct}% of {usage.reelsLimit} used · resets {resetLabel}</div>
      </div>

      <div className="usage-stats">
        <div className="stat-card">
          <div className="stat-label">Reels Used</div>
          <div className="stat-value">{usage.reelsUsed}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Reels Remaining</div>
          <div className="stat-value">{usage.reelsRemaining}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Current Plan</div>
          <div className="stat-value" style={{ fontSize: 24, textTransform: 'capitalize' }}>{usage.plan}</div>
        </div>
      </div>

      <div className="card mt-3" style={{ background: 'linear-gradient(120deg, var(--primary-light), var(--accent-light))', borderColor: 'transparent' }}>
        <h3 style={{ marginBottom: 6 }}>Need more Reels?</h3>
        <p className="muted" style={{ marginBottom: 16 }}>Upgrade to keep creating scroll-stopping content without limits.</p>
        <button className="btn btn-primary" onClick={() => showToast('Upgrade flow coming soon — contact sales@reelforge.ai')}>
          Upgrade Plan ↑
        </button>
      </div>

      {usage.history && usage.history.length > 0 && (
        <div className="card mt-3">
          <h3 style={{ marginBottom: 12 }}>Recent activity</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '8px 6px' }}>Date</th>
                <th style={{ padding: '8px 6px' }}>Operation</th>
                <th style={{ padding: '8px 6px' }}>Count</th>
              </tr>
            </thead>
            <tbody>
              {usage.history.slice(0, 10).map((h) => (
                <tr key={h.date + h.operation} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 6px' }}>{h.date}</td>
                  <td style={{ padding: '10px 6px' }}>{h.operation.replace(/_/g, ' ')}</td>
                  <td style={{ padding: '10px 6px' }}>{h.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}