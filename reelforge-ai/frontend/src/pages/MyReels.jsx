import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import ReelCard from '../components/ReelCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Modal from '../components/Modal.jsx';
import { Skeleton } from '../components/Loaders.jsx';

const FILTERS = ['all', 'completed', 'processing', 'failed'];

export default function MyReels() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { showToast } = useToast();

  const filter = params.get('status') || 'all';
  const q = params.get('q') || '';

  const [reels, setReels] = useState([]);
  const [mediaMap, setMediaMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/reels`)
      .then(async (res) => {
        const list = res.data.reels || [];
        const mm = {};
        await Promise.all(
          list.map(async (r) => {
            try {
              const m = await api.get(`/reels/${r.id}`);
              mm[r.id] = m.data.media || [];
            } catch {
              mm[r.id] = [];
            }
          })
        );
        setMediaMap(mm);
        setReels(list);
      })
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const statusToFilter = (status) => {
    if (status === 'completed') return 'completed';
    if (['generating', 'voice_generating', 'rendering'].includes(status)) return 'processing';
    if (status === 'failed') return 'failed';
    return 'all';
  };

  let filtered = reels;
  if (filter !== 'all') {
    filtered = filtered.filter((r) => (filter === 'processing' ? statusToFilter(r.status) === 'processing' : statusToFilter(r.status) === filter));
  }
  if (q) {
    filtered = filtered.filter((r) => r.business_name.toLowerCase().includes(q.toLowerCase()) || (r.business_type || '').toLowerCase().includes(q.toLowerCase()));
  }

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/reels/${deleteTarget.id}`);
      setReels((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      showToast('Reel deleted');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const regenerate = async (reel) => {
    try {
      await api.post(`/reels/${reel.id}/regenerate`, {});
      navigate(`/dashboard/reels/${reel.id}/generating`);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div>
      <div className="page-head">
        <h1>My Reels</h1>
      </div>

      <div className="filter-tabs">
        {FILTERS.map((f) => (
          <button key={f} className={`filter-tab ${filter === f ? 'active' : ''}`} onClick={() => setParams(f === 'all' ? {} : { status: f })}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="reel-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div className="reel-card" key={i}>
              <Skeleton width="100%" height={200} borderRadius={0} />
              <div style={{ padding: 14 }}><Skeleton width="70%" height={16} /><Skeleton width="45%" height={12} style={{ marginTop: 8 }} /></div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="🎬"
            title={q ? `No reels match "${q}"` : 'No reels yet'}
            message="Create your first AI-powered Instagram Reel — it only takes a few minutes."
            action={!q && <button className="btn btn-primary" onClick={() => navigate('/dashboard/create')}>+ Create Reel</button>}
          />
        </div>
      ) : (
        <div className="reel-grid">
          {filtered.map((reel) => (
            <ReelCard key={reel.id} reel={reel} media={mediaMap[reel.id] || []} onDelete={setDeleteTarget} onRegenerate={regenerate} />
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