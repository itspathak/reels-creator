import { useEffect, useState } from 'react';
import { api, API_URL_BASE } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { Spinner } from '../components/Loaders.jsx';

const API_BASE = API_URL_BASE.replace(/\/api$/, '');

const FONT_PREFS = ['Modern', 'Classic', 'Bold', 'Elegant', 'Playful'];

export default function BrandKit() {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    business_name: '',
    logo_url: '',
    primary_color: '#6C5CE7',
    secondary_color: '#00CEA7',
    font_preference: 'Modern',
    instagram_username: '',
    website: '',
    phone: '',
    address: '',
    default_cta: 'Visit us today',
  });

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  useEffect(() => {
    api
      .get('/brand-kit')
      .then((res) => {
        const b = res.data.brandKit;
        if (b) {
          setForm({
            business_name: b.business_name || '',
            logo_url: b.logo_url || '',
            primary_color: b.primary_color || '#6C5CE7',
            secondary_color: b.secondary_color || '#00CEA7',
            font_preference: b.font_preference || 'Modern',
            instagram_username: b.instagram_username || '',
            website: b.website || '',
            phone: b.phone || '',
            address: b.address || '',
            default_cta: b.default_cta || 'Visit us today',
          });
        }
      })
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/brand-kit', form);
      showToast('Brand kit saved. It will be used in all future Reels.');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const initials = (form.business_name || 'B')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (loading) return <div className="screen-loader"><Spinner size={32} /></div>;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 style={{ marginBottom: 4 }}>Brand Kit</h1>
          <p className="muted">Save your brand once — every Reel you generate automatically uses it.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24, alignItems: 'start' }}>
        <div className="card">
          <div className="form-grid-2">
            <div className="field">
              <label>Business Name</label>
              <input className="input" placeholder="Your business name" value={form.business_name} onChange={set('business_name')} />
            </div>
            <div className="field">
              <label>Instagram Username</label>
              <input className="input" placeholder="@yourhandle" value={form.instagram_username} onChange={set('instagram_username')} />
            </div>
            <div className="field">
              <label>Website</label>
              <input className="input" placeholder="https://" value={form.website} onChange={set('website')} />
            </div>
            <div className="field">
              <label>Phone</label>
              <input className="input" placeholder="+91…" value={form.phone} onChange={set('phone')} />
            </div>
          </div>

          <div className="field">
            <label>Address</label>
            <input className="input" placeholder="Street, city" value={form.address} onChange={set('address')} />
          </div>

          <div className="field">
            <label>Default CTA</label>
            <input className="input" placeholder="e.g. Visit us today" value={form.default_cta} onChange={set('default_cta')} />
          </div>

          <div className="field">
            <label>Brand Colors</label>
            <div className="color-input-row">
              <input type="color" className="color-swatch" value={form.primary_color} onChange={set('primary_color')} title="Primary color" />
              <span>Primary — {form.primary_color}</span>
            </div>
            <div className="color-input-row" style={{ marginTop: 10 }}>
              <input type="color" className="color-swatch" value={form.secondary_color} onChange={set('secondary_color')} title="Secondary color" />
              <span>Secondary — {form.secondary_color}</span>
            </div>
          </div>

          <div className="field">
            <label>Font Preference</label>
            <select className="select" value={form.font_preference} onChange={set('font_preference')}>
              {FONT_PREFS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div className="mt-2">
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? <Spinner size={16} /> : 'Save Brand Kit'}
            </button>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 14 }}>Preview</h3>
          <div className="brand-preview" style={{ borderTop: `8px solid ${form.primary_color}` }}>
            <div className="brand-preview-logo" style={{ background: form.primary_color, color: '#fff' }}>
              {form.logo_url ? <img src={form.logo_url} alt="logo" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: '50%' }} /> : initials}
            </div>
            {form.business_name ? (
              <div className="brand-preview-name" style={{ fontFamily: form.font_preference === 'Classic' ? 'Georgia, serif' : 'var(--font-display)' }}>
                {form.business_name}
              </div>
            ) : (
              <p className="muted small">Add your business name</p>
            )}
            {form.instagram_username && <p className="small" style={{ color: form.secondary_color, fontWeight: 600 }}>{form.instagram_username}</p>}
            <p className="muted small mt-1">Reels generated with this brand kit will use these colors and CTA automatically.</p>
            <div className="mt-2">
              <span className="badge" style={{ background: form.primary_color, color: '#fff' }}>{form.default_cta || 'Visit us today'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}