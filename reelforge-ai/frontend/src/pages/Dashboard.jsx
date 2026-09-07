import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { Skeleton } from '../components/Loaders.jsx';
import ReelCard from '../components/ReelCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Modal from '../components/Modal.jsx';

export default function Dashboard() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [stats, setStats] = useState(null);
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/reels'), api.get('/usage'), api.get('/auth/me')])
      .then(([reelsRes, usageRes, meRes]) => {
        setReels(reelsRes.data.reels || []);
        setUsage(usageRes.data);
        const totalGens = reelsRes.data.reels.length;
        const completed = reelsRes.data.reels.filter((r) => r.status === 'completed').length;
        const thisMonth = reelsRes.data.reels.filter(
          (r) => {
            const d = new Date(r.created_at);
            const now = new Date();
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && r.status !== 'draft';
          }
        ).length;
        setStats({ reelsCreated: totalGens, completed, thisMonth, totalGens });
      })
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/reels/${deleteTarget.id}`);
      setReels((r) => r.filter((x) => x.id !== deleteTarget.id));
      showToast('Reel deleted');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const statsCards = [
    { label: 'Reels Created', value: stats?.reelsCreated ?? '—', icon: '🎬' },
    { label: 'Reels Remaining', value: usage?.reelsRemaining ?? '—', icon: '✨' },
    { label: 'This Month', value: stats?.thisMonth ?? '—', icon: '📅' },
    { label: 'Total Generations', value: stats?.totalGens ?? '—', icon: '🤖' },
  ];

  return (
    <div>
      <div className="page-head">
        <h1>Dashboard</h1>
      </div>

      {loading ? (
        <div className="stat-grid">
          {[1, 2, 3, 4].map((i) => (
            <div className="stat-card" key={i}><Skeleton width="60%" height={16} /><Skeleton width="40%" height={30} style={{ marginTop: 10 }} /></div>
          ))}
        </div>
      ) : (
        <div className="stat-grid">
          {statsCards.map((s) => (
            <div className="stat-card" key={s.label}>
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="hero-create">
        <div>
          <h2>Create Your Next Reel</h2>
          <p>Let AI turn your business into a scroll-stopping Instagram Reel in minutes.</p>
        </div>
        <button className="btn btn-lg" onClick={() => navigate('/dashboard/create')}>+ Create Reel</button>
      </div>

      <div className="section-title">
        <h3>Recent Reels</h3>
        <button className="btn btn-sm btn-ghost" onClick={() => navigate('/dashboard/reels')}>View all →</button>
      </div>

      {loading ? (
        <div className="reel-grid">
          {[1, 2, 3].map((i) => (
            <div className="reel-card" key={i}>
              <Skeleton width="100%" height={200} borderRadius={0} />
              <div style={{ padding: 14 }}><Skeleton width="70%" height={16} /><Skeleton width="45%" height={12} style={{ marginTop: 8 }} /></div>
            </div>
          ))}
        </div>
      ) : reels.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="🎬"
            title="No reels yet"
            message="Create your first AI-powered Instagram Reel — it only takes a few minutes."
            action={<button className="btn btn-primary" onClick={() => navigate('/dashboard/create')}>+ Create Reel</button>}
          />
        </div>
      ) : (
        <div className="reel-grid">
          {reels.slice(0, 6).map((reel) => (
            <ReelCard key={reel.id} reel={reel} onDelete={setDeleteTarget} />
          ))}
        </div>
      )}

      <Modal
        open={!!deleteTarget}
        title="Delete this Reel?"
        message={`"${deleteTarget?.business_name}" and its media will be permanently removed.`}
        danger
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}