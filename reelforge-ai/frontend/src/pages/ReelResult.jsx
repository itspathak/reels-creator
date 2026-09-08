import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, API_URL_BASE, getToken } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { Spinner, Skeleton } from '../components/Loaders.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Modal from '../components/Modal.jsx';

const API_BASE = API_URL_BASE.replace(/\/api$/, '');

function CopyRow({ label, text }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  };
  return (
    <div className="script-section">
      <h3>{label}</h3>
      <div className="copy-row">
        <p>{text}</p>
        <button className="copy-btn" onClick={copy}>Copy</button>
      </div>
    </div>
  );
}

export default function ReelResult() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [reel, setReel] = useState(null);
  const [scenes, setScenes] = useState([]);
  const [hashtags, setHashtags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('script');
  const [regenerating, setRegenerating] = useState(false);
  const [showRegen, setShowRegen] = useState(false);
  const [dl, setDl] = useState(null);
  const dlRef = useRef(null);

  const mb = (b) => (b / (1024 * 1024)).toFixed(1);

  useEffect(() => {
    api
      .get(`/reels/${id}`)
      .then((res) => {
        const r = res.data.reel;
        setReel(r);
        setScenes(res.data.scenes || []);
        try {
          setHashtags(JSON.parse(r.hashtags) || []);
        } catch {
          setHashtags(r.hashtags ? r.hashtags.split(',') : []);
        }
      })
      .catch((err) => {
        showToast(err.message, 'error');
        navigate('/dashboard/reels', { replace: true });
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const doRegenerate = async () => {
    setRegenerating(true);
    setShowRegen(false);
    try {
      await api.post(`/reels/${id}/regenerate`, {});
      navigate(`/dashboard/reels/${id}/generating`, { replace: true });
    } catch (err) {
      showToast(err.message, 'error');
      setRegenerating(false);
    }
  };

  const download = async () => {
    if (!reel.video_url) {
      showToast('No video file available yet. Connect a video provider or check generation status.', 'info');
      return;
    }
    const url = reel.video_url.startsWith('http') ? reel.video_url : API_BASE + reel.video_url;
    const filename = `${(reel.business_name || 'reel').replace(/\s+/g, '_')}_reel.mp4`;
    const controller = new AbortController();
    dlRef.current = controller;
    setDl({ percent: 0, received: 0, total: 0, filename, done: false, error: null });
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` }, signal: controller.signal });
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const total = Number(res.headers.get('Content-Length')) || 0;
      const reader = res.body.getReader();
      const chunks = [];
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        setDl({ percent: total ? Math.min(99, Math.round((received / total) * 100)) : -1, received, total, filename, done: false, error: null });
      }
      const blob = new Blob(chunks, { type: 'video/mp4' });
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objUrl), 4000);
      setDl({ percent: 100, received, total, filename, done: true, error: null });
      showToast('Download complete');
    } catch (err) {
      if (err.name === 'AbortError') return;
      setDl((d) => (d ? { ...d, error: err.message || 'Download failed' } : null));
      showToast(err.message || 'Download failed', 'error');
    } finally {
      dlRef.current = null;
    }
  };

  const share = async () => {
    const data = {
      title: `${reel.business_name} — Reel`,
      text: reel.caption || `${reel.hook} — ${reel.business_name}`,
    };
    try {
      if (navigator.share) {
        await navigator.share(data);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(reel.caption || `${reel.hook} — ${reel.business_name}`);
        showToast('Caption copied to clipboard');
      }
    } catch {
      /* share cancelled */
    }
  };

  if (loading) {
    return (
      <div>
        <div className="page-head"><h1>Reel</h1></div>
        <div className="result-layout">
          <Skeleton width="100%" height={560} borderRadius={24} />
          <div><Skeleton width="70%" height={24} /><Skeleton width="100%" height={140} style={{ marginTop: 16 }} /><Skeleton width="100%" height={140} style={{ marginTop: 12 }} /></div>
        </div>
      </div>
    );
  }

  if (!reel) return <div className="screen-loader"><Spinner size={32} /></div>;

  const demoMode = !reel.video_url;
  const videoSrc = reel.video_url ? (reel.video_url.startsWith('http') ? reel.video_url : API_BASE + reel.video_url) : null;

  const voiceoverText = scenes.map((s) => s.voiceover).filter(Boolean).join(' ') || reel.script?.replace(/<[^>]+>/g, '');

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 style={{ marginBottom: 4 }}>{reel.business_name}</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <StatusBadge status={reel.status} />
            <span className="badge">{reel.style}</span>
            <span className="badge">{reel.language}</span>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/dashboard/reels')}>← Back</button>
      </div>

      <div className="result-layout">
        <div className="result-video-col">
          <div className="phone-frame">
            {videoSrc ? (
              <video src={videoSrc} controls poster={undefined} playsInline />
            ) : (
              <div style={{ padding: 20, textAlign: 'center', color: '#fff' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: '100%' }}>
                  <span style={{ fontSize: 54 }}>{scenes.length ? scenes[0].text : '🎬'}</span>
                  <div className="badge">Demo preview</div>
                  <p className="small" style={{ opacity: 0.7 }}>Hook: {reel.hook}</p>
                </div>
              </div>
            )}
          </div>

          {demoMode && (
            <div className="demo-note" style={{ marginTop: 16 }}>
              🎬 Video rendering is currently in <strong>demo mode</strong>. The script, voiceover, caption and hashtags
              are generated — connect Creatomate to render the actual video.
            </div>
          )}

          <div className="result-actions">
            <button className="btn btn-primary" onClick={download}>⬇ Download Reel</button>
            <button className="btn btn-secondary" onClick={() => navigate('/dashboard/create')}>+ Create Another</button>
            <button className="btn btn-secondary" onClick={() => navigate(`/dashboard/create?reel=${id}`)}>✏️ Edit Reel</button>
            <button className="btn btn-secondary" onClick={share}>🔗 Share</button>
          </div>
        </div>

        <div>
          <div className="tabs-scroll">
            {['script', 'hook', 'voiceover', 'caption', 'hashtags', 'cta'].map((t) => (
              <button key={t} className={`tab-btn ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>

          {activeTab === 'script' && (
            <>
              <div className="script-section">
                <h3>Concept</h3>
                <p>{reel.script ? (JSON.parse(reel.script).concept || '') : ''}</p>
              </div>
              <h3 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)', marginBottom: 10 }}>Scenes</h3>
              {scenes.map((s) => (
                <div className="scene-card" key={s.scene}>
                  <div className="scene-head">
                    <span>Scene {s.scene}</span>
                    <span>{s.duration}s</span>
                  </div>
                  <div className="scene-text">{s.text}</div>
                  <div className="scene-visual">{s.visual}</div>
                  <div className="small muted" style={{ marginTop: 6 }}>🎙️ {s.voiceover}</div>
                </div>
              ))}
            </>
          )}

          {activeTab === 'hook' && <CopyRow label="Hook" text={reel.hook || ''} />}
          {activeTab === 'voiceover' && <CopyRow label="Voiceover script" text={voiceoverText || ''} />}
          {activeTab === 'caption' && <div className="script-section"><h3>Caption</h3><div className="copy-row"><p style={{ whiteSpace: 'pre-wrap' }}>{reel.caption}</p><button className="copy-btn" onClick={() => { navigator.clipboard.writeText(reel.caption || ''); showToast('Caption copied'); }}>Copy</button></div></div>}
          {activeTab === 'hashtags' && (
            <div className="script-section">
              <h3>Hashtags ({hashtags.length})</h3>
              <ul>{hashtags.map((h) => <li key={h}>#{h.replace('#', '')}</li>)}</ul>
              <button className="copy-btn" style={{ marginTop: 12 }} onClick={() => { navigator.clipboard.writeText(hashtags.map((h) => '#' + h.replace('#', '')).join(' ')); showToast('Hashtags copied'); }}>Copy all</button>
            </div>
          )}
          {activeTab === 'cta' && <CopyRow label="Call to Action" text={reel.cta || ''} />}

          <div className="mt-3" style={{ borderTop: '1px solid var(--border)', paddingTop: 18 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowRegen(true)} disabled={regenerating}>
              {regenerating ? <Spinner size={16} /> : '🔄 Regenerate Reel'}
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={showRegen}
        title="Regenerate this Reel?"
        message="AI will create a fresh concept, script and voiceover based on the same business details."
        confirmLabel="Regenerate"
        onConfirm={doRegenerate}
        onCancel={() => setShowRegen(false)}
      />

      {dl && (
        <div className="modal-overlay" onClick={() => { if (dl.done || dl.error) setDl(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{dl.done ? 'Download complete' : 'Downloading Reel'}</h3>
            <p style={{ marginBottom: 12, wordBreak: 'break-all' }}>{dl.filename}</p>
            <div className="progress">
              <div
                className={`progress-fill ${dl.percent === -1 ? 'indeterminate' : ''}`}
                style={{ width: dl.percent === -1 ? '40%' : `${dl.percent}%` }}
              />
            </div>
            <div className="dl-meta">
              {dl.error ? (
                <span style={{ color: 'var(--danger)' }}>{dl.error}</span>
              ) : dl.done ? (
                <span>✓ Done — saved to your Downloads</span>
              ) : dl.percent === -1 ? (
                <span>Starting download…</span>
              ) : (
                <span>{dl.percent}% · {mb(dl.received)}{dl.total ? ` / ${mb(dl.total)} MB` : ' MB'}</span>
              )}
            </div>
            <div className="modal-actions">
              {!dl.done && !dl.error && (
                <button className="btn btn-secondary" onClick={() => { dlRef.current && dlRef.current.abort(); setDl(null); }}>Cancel</button>
              )}
              {(dl.done || dl.error) && (
                <button className="btn btn-primary" onClick={() => setDl(null)}>Close</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}