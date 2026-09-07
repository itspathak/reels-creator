import { useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge.jsx';
import { API_URL_BASE } from '../services/api.js';

const getFullUrl = (u) => (u.startsWith('http') ? u : API_URL_BASE.replace('/api', '') + u);

function thumbnailFor(reel, media) {
  if (media && media.length) {
    const item = media.find((m) => m.file_type === 'image') || media.find((m) => m.file_type === 'video');
    return item || null;
  }
  return null;
}

export default function ReelCard({ reel, media = [], onDelete, onRegenerate, showDownload = true }) {
  const navigate = useNavigate();
  const thumb = thumbnailFor(reel, media);
  const created = new Date(reel.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  const download = (e) => {
    e.stopPropagation();
    if (!reel.video_url) return;
    const a = document.createElement('a');
    a.href = getFullUrl(reel.video_url);
    a.download = `${reel.business_name.replace(/\s+/g, '_')}_reel.mp4`;
    a.target = '_blank';
    a.click();
  };

  return (
    <div className="reel-card">
      <div className="reel-thumb">
        {thumb ? (
          thumb.file_type === 'video' ? (
            <video src={getFullUrl(thumb.file_url)} muted loop />
          ) : (
            <img src={getFullUrl(thumb.file_url)} alt={reel.business_name} />
          )
        ) : (
          <div className="reel-thumb-placeholder">
            <span>🎬</span>
          </div>
        )}
        {reel.status === 'completed' && (
          <button className="reel-play" onClick={() => navigate(`/dashboard/reels/${reel.id}`)} aria-label="Play">
            ▶
          </button>
        )}
      </div>
      <div className="reel-card-body">
        <div className="reel-card-top">
          <h4 title={reel.business_name}>{reel.business_name}</h4>
          <StatusBadge status={reel.status} />
        </div>
        <div className="muted small">
          {reel.style} · {created}
        </div>
        <div className="reel-actions">
          {reel.status === 'completed' && (
            <>
              <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/dashboard/reels/${reel.id}`)}>View</button>
              {showDownload && (
                <button className="btn btn-sm btn-secondary" onClick={download} disabled={!reel.video_url} title={reel.video_url ? 'Download reel' : 'No video file (demo mode)'}>
                  ⬇
                </button>
              )}
            </>
          )}
          {reel.status === 'draft' && (
            <button className="btn btn-sm btn-primary" onClick={() => navigate(`/dashboard/create?reel=${reel.id}`)}>Continue</button>
          )}
          {reel.status === 'failed' && onRegenerate && (
            <button className="btn btn-sm btn-primary" onClick={() => onRegenerate(reel)}>Retry</button>
          )}
          {onDelete && <button className="btn btn-sm btn-danger" onClick={() => onDelete(reel)}>Delete</button>}
        </div>
      </div>
    </div>
  );
}