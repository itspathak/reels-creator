import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';

const STAGES = [
  { key: 'generating', label: 'Understanding your business', sub: 'Reading your business details', icon: '🧠' },
  { key: 'concept', label: 'Creating Reel concept', sub: 'Designing your scenes and hook', icon: '💡' },
  { key: 'script', label: 'Writing script', sub: 'Crafting the perfect story', icon: '✍️' },
  { key: 'voice', label: 'Creating voiceover', sub: 'Generating narration', icon: '🎙️' },
  { key: 'video', label: 'Building video', sub: 'Rendering vertical 9:16 reel', icon: '🎬' },
  { key: 'final', label: 'Finalizing Reel', sub: 'Adding captions & hashtags', icon: '✅' },
];

const TERMINAL = ['completed', 'failed'];

export default function ReelGenerating() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [reel, setReel] = useState(null);
  const [activeStage, setActiveStage] = useState(0);
  const [error, setError] = useState('');
  const completedRef = useRef(false);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await api.get(`/reels/${id}/status`);
        const r = res.data.reel;
        setReel(r);

        if (TERMINAL.includes(r.status)) {
          completedRef.current = true;
          if (r.status === 'completed') {
            setTimeout(() => navigate(`/dashboard/reels/${id}`, { replace: true }), 800);
          } else {
            setError(r.error || 'Generation failed. Please try again.');
          }
          return;
        }

        if (r.status === 'generating') setActiveStage(0);
        else if (r.status === 'voice_generating') setActiveStage(3);
        else if (r.status === 'rendering') setActiveStage(4);
        else setActiveStage(1);
      } catch (err) {
        if (!completedRef.current) {
          setError(err.message || 'Failed to check generation status');
        }
      }
    };

    poll();
    const t = setInterval(poll, 2500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const currentLabel = STAGES[Math.min(activeStage, STAGES.length - 1)].label;

  return (
    <div className="gen-screen">
      <div style={{ marginBottom: 18 }}>
        <div className="spinner" style={{ width: 56, height: 56 }} />
      </div>
      <h1 style={{ fontSize: 26 }}>{currentLabel}…</h1>
      <p className="muted mt-2">This usually takes under a minute. You can leave this page anytime.</p>

      <div className="gen-stage-list">
        {STAGES.map((s, i) => {
          let cls = 'gen-stage';
          if (i < activeStage) cls += ' done';
          if (i === activeStage) cls += ' active';
          const done = i < activeStage;
          const active = i === activeStage;
          return (
            <div className={cls} key={s.key}>
              <span className="gen-icon">{done ? '✓' : active ? '●' : '○'}</span>
              <div>
                <div>{s.label}</div>
                <div className="small muted">{active ? 'Working…' : s.sub}</div>
              </div>
              {active && <span className="spinner" style={{ marginLeft: 'auto', width: 16, height: 16, borderWidth: 2 }} />}
            </div>
          );
        })}
      </div>

      {reel?.status === 'rendering' && (
        <div className="demo-note">
          🎬 Video rendering is currently in <strong>demo mode</strong>. A real video will be generated when the video
          provider (Creatomate) is configured.
        </div>
      )}

      {error && (
        <div className="alert alert-error mt-3">
          {error}
          <div className="mt-2">
            <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/dashboard/reels`)}>Back to My Reels</button>
          </div>
        </div>
      )}

      {!error && (
        <div style={{ marginTop: 26 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard/reels')}>
            Go to My Reels
          </button>
        </div>
      )}
    </div>
  );
}