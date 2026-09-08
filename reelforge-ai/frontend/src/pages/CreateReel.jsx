import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, API_URL_BASE } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { Spinner } from '../components/Loaders.jsx';

const BUSINESS_TYPES = ['Restaurant', 'Cafe', 'Pizza / Fast Food', 'Bakery', 'Clothing / Fashion', 'Salon / Beauty', 'Gym / Fitness', 'Real Estate', 'Jewellery', 'Electronics', 'Travel / Hill Station', 'Hotel / Resort', 'Catering', 'Service Business', 'Other'];

const FESTIVALS = [
  { name: '', label: 'No specific theme', icon: '🎯' },
  { name: 'Diwali', label: 'Diwali', icon: '🪔' },
  { name: 'Navratri', label: 'Navratri', icon: '💃' },
  { name: 'Holi', label: 'Holi', icon: '🪅' },
  { name: 'Christmas', label: 'Christmas', icon: '🎄' },
  { name: 'New Year', label: 'New Year', icon: '🎆' },
];

const LANGUAGES = ['English', 'Hindi', 'Gujarati', 'Hinglish'];

const VOICES = [
  { name: 'auto', icon: '🎙️', label: 'Auto' },
  { name: 'male', icon: '👨', label: 'Male' },
  { name: 'female', icon: '👩', label: 'Female' },
  { name: 'child', icon: '🧒', label: 'Child' },
];

const STYLES = [
  { name: 'Viral', icon: '🔥' },
  { name: 'Premium', icon: '💎' },
  { name: 'Funny', icon: '😂' },
  { name: 'Luxury', icon: '👑' },
  { name: 'Minimal', icon: '⚪' },
  { name: 'Promotional', icon: '📣' },
  { name: 'Festive', icon: '🎉' },
];

const GOALS = [
  { name: 'Get More Customers', icon: '🤝' },
  { name: 'Promote Offer', icon: '🎁' },
  { name: 'Launch Product', icon: '🚀' },
  { name: 'Brand Awareness', icon: '💡' },
  { name: 'Increase Engagement', icon: '❤️' },
];

const STEP_LABELS = ['Business Details', 'Reel Preferences', 'Review & Generate'];

export default function CreateReel() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { showToast } = useToast();

  const [step, setStep] = useState(1);
  const [reelId, setReelId] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [loadingInit, setLoadingInit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    business_name: '',
    business_type: '',
    description: '',
    festival: '',
    location: '',
    shop_number: '',
    address: '',
    offer: '',
    target_audience: '',
    language: 'English',
    style: 'Viral',
    goal: 'Get More Customers',
    voice: 'auto',
  });
  const [media, setMedia] = useState([]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  useEffect(() => {
    const existingId = params.get('reel');
    if (!existingId) return;
    setLoadingInit(true);
    api
      .get(`/reels/${existingId}`)
      .then((res) => {
        const r = res.data.reel;
        setReelId(r.id);
        setEditMode(true);
        setStep(2);
        setForm({
          business_name: r.business_name || '',
          business_type: r.business_type || '',
          description: r.description || '',
          festival: r.festival || '',
          location: r.location || '',
          shop_number: r.shop_number || '',
          address: r.address || '',
          offer: r.offer || '',
          target_audience: r.target_audience || '',
          language: r.language || 'English',
          style: r.style || 'Viral',
          goal: r.goal || 'Get More Customers',
          voice: r.voice_preference || 'auto',
        });
        setMedia(
          (res.data.media || []).map((m) => ({
            id: m.id,
            file_url: m.file_url,
            file_type: m.file_type,
            original_name: m.original_name,
          }))
        );
      })
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setLoadingInit(false));
  }, [params]);

  const step1Valid = form.business_name.trim().length >= 2 && form.business_type;

  const saveDraft = async () => {
    const body = {
      business_name: form.business_name,
      business_type: form.business_type,
      description: form.description,
      festival: form.festival,
      location: form.location,
      shop_number: form.shop_number,
      address: form.address,
      offer: form.offer,
      target_audience: form.target_audience,
      language: form.language,
      style: form.style,
      goal: form.goal,
      voice_preference: form.voice,
    };
    let id = reelId;
    if (id) {
      await api.put(`/reels/${id}`, body);
    } else {
      const res = await api.post('/reels', body);
      id = res.data.reel.id;
      setReelId(id);
    }
    return id;
  };

  const next = async () => {
    if (step === 1 && !step1Valid) {
      showToast('Please fill in your business name and type', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const id = await saveDraft();
      setReelId(id);
      setStep((s) => s + 1);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const back = () => setStep((s) => Math.max(1, s - 1));

  const toSummary = async () => {
    setSubmitting(true);
    try {
      const id = await saveDraft();
      setReelId(id);
      setStep(3);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const generate = async () => {
    setSubmitting(true);
    try {
      await api.post(`/reels/${reelId}/generate`, {});
      navigate(`/dashboard/reels/${reelId}/generating`);
    } catch (err) {
      if (err.status === 403) {
        showToast(err.message, 'error');
        navigate('/dashboard/usage');
      } else {
        showToast(err.message, 'error');
      }
      setSubmitting(false);
    }
  };

  if (loadingInit) {
    return (
      <div className="wizard">
        <div className="screen-loader" style={{ minHeight: '50vh' }}><Spinner size={32} /></div>
      </div>
    );
  }

  return (
    <div className="wizard">
      <div className="page-head">
        <h1>{editMode ? 'Continue Reel' : 'Create a New Reel'}</h1>
      </div>

      <div className="wizard-steps">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const cls = n === step ? 'active' : n < step ? 'done' : '';
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {n > 1 && <div className="step-separator" />}
              <div className={`step-chip ${cls}`}>
                <span className="step-num">{n < step ? '✓' : n}</span>
                {label}
              </div>
            </div>
          );
        })}
      </div>

      <div className="wizard-body">
        {step === 1 && (
          <>
            <h2 className="wizard-title">Tell us about your business</h2>
            <p className="wizard-subtitle">Pick the type + festival theme. Photos/videos are optional — AI creates visuals itself.</p>
            <div className="card">
              <div className="form-grid-2">
                <div className="field">
                  <label>Business Name *</label>
                  <input className="input" placeholder="e.g. Spice Garden Restaurant" value={form.business_name} onChange={set('business_name')} />
                </div>
                <div className="field">
                  <label>Business Type *</label>
                  <select className="select" value={form.business_type} onChange={set('business_type')}>
                    <option value="">Select type…</option>
                    {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Business Description <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional — AI can create it)</span></label>
                <textarea className="textarea" placeholder="Optional: what makes your business special? Or leave empty and let AI write everything." value={form.description} onChange={set('description')} />
              </div>
              <div className="field">
                <label>Festival / Occasion Theme</label>
                <div className="option-grid">
                  {FESTIVALS.map((f) => (
                    <div
                      key={f.name || 'none'}
                      className={`option-card ${form.festival === f.name ? 'selected' : ''}`}
                      onClick={() => setForm({ ...form, festival: f.name })}
                    >
                      <div className="option-icon">{f.icon}</div>
                      <div className="option-label">{f.label}</div>
                    </div>
                  ))}
                </div>
                <p className="hint" style={{ marginTop: 8, color: 'var(--text-muted)' }}>
                  Pick Diwali, Navratri, Holi, Christmas, New Year — or leave none. Themes change colors, music, visuals &amp; script automatically.
                </p>
              </div>
              <div className="form-grid-2">
                <div className="field">
                  <label>Location</label>
                  <input className="input" placeholder="City, area" value={form.location} onChange={set('location')} />
                  <div className="field-row">
                    <div>
                      <label>Shop / Unit Number</label>
                      <input className="input" placeholder="Shop No. 12" value={form.shop_number} onChange={set('shop_number')} />
                    </div>
                    <div>
                      <label>Full Address</label>
                      <input className="input" placeholder="MG Road, Opp. Central Mall" value={form.address} onChange={set('address')} />
                    </div>
                  </div>
                </div>
                <div className="field">
                  <label>Special Offer</label>
                  <input className="input" placeholder="e.g. 20% off first visit" value={form.offer} onChange={set('offer')} />
                </div>
              </div>
              <div className="field">
                <label>Target Audience</label>
                <input className="input" placeholder="e.g. Young professionals in Ahmedabad" value={form.target_audience} onChange={set('target_audience')} />
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="wizard-title">How should your Reel feel?</h2>
            <p className="wizard-subtitle">Pick the language, style and goal — AI will match the tone.</p>
            <div className="card">
              <div className="field">
                <label>Language</label>
                <select className="select" value={form.language} onChange={set('language')}>
                  {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Voice</label>
                <div className="option-grid">
                  {VOICES.map((v) => (
                    <div
                      key={v.name}
                      className={`option-card ${form.voice === v.name ? 'selected' : ''}`}
                      onClick={() => setForm({ ...form, voice: v.name })}
                    >
                      <div className="option-icon">{v.icon}</div>
                      <div className="option-label">{v.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="field">
                <label>Reel Style</label>
                <div className="option-grid">
                  {STYLES.map((s) => (
                    <div
                      key={s.name}
                      className={`option-card ${form.style === s.name ? 'selected' : ''}`}
                      onClick={() => setForm({ ...form, style: s.name })}
                    >
                      <div className="option-icon">{s.icon}</div>
                      <div className="option-label">{s.name}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="field">
                <label>Main Goal</label>
                <div className="option-grid">
                  {GOALS.map((g) => (
                    <div
                      key={g.name}
                      className={`option-card ${form.goal === g.name ? 'selected' : ''}`}
                      onClick={() => setForm({ ...form, goal: g.name })}
                    >
                      <div className="option-icon">{g.icon}</div>
                      <div className="option-label">{g.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="wizard-title">Ready to generate?</h2>
            <p className="wizard-subtitle">Review your details, then let AI do its magic.</p>
            <div className="card">
              <div className="summary-grid">
                <div className="summary-item"><div className="k">Business</div><div className="v">{form.business_name}</div></div>
                <div className="summary-item"><div className="k">Business Type</div><div className="v">{form.business_type}</div></div>
                <div className="summary-item"><div className="k">Festival / Theme</div><div className="v">{form.festival || 'None'}</div></div>
                <div className="summary-item"><div className="k">Location</div><div className="v">{form.location || '—'}</div></div>
                {form.shop_number || form.address ? (
                  <div className="summary-item"><div className="k">Address</div><div className="v">{[form.shop_number, form.address].filter(Boolean).join(', ')}</div></div>
                ) : null}
                <div className="summary-item"><div className="k">Special Offer</div><div className="v">{form.offer || '—'}</div></div>
                <div className="summary-item"><div className="k">Target Audience</div><div className="v">{form.target_audience || '—'}</div></div>
                <div className="summary-item"><div className="k">Description</div><div className="v">{form.description || '—'}</div></div>
                <div className="summary-item"><div className="k">Language</div><div className="v">{form.language}</div></div>
                <div className="summary-item"><div className="k">Voice</div><div className="v">{VOICES.find((v) => v.name === form.voice)?.label || form.voice}</div></div>
                <div className="summary-item"><div className="k">Style</div><div className="v">{form.style}</div></div>
                <div className="summary-item"><div className="k">Goal</div><div className="v">{form.goal}</div></div>
              </div>
              <div className="mt-3">
                <button className="btn btn-primary btn-lg btn-block" onClick={generate} disabled={submitting}>
                  {submitting ? <Spinner size={18} /> : '✨ Generate Reel'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {step < 3 && (
        <div className="wizard-nav">
          <button className="btn btn-secondary" onClick={back} disabled={step === 1 || submitting}>
            ← Back
          </button>
          {step === 1 && (
            <button className="btn btn-primary" onClick={next} disabled={submitting}>
              {submitting ? <Spinner size={18} /> : 'Continue →'}
            </button>
          )}
          {step === 2 && (
            <button className="btn btn-primary" onClick={toSummary} disabled={submitting}>
              {submitting ? <Spinner size={18} /> : 'Review & Generate →'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}