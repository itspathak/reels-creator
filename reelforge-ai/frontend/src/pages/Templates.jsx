import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext.jsx';

const TEMPLATES = [
  { name: 'Viral Restaurant Reel', category: 'Restaurant', icon: '🍜', desc: 'Fast-paced food showcase with bold text overlays.' },
  { name: 'Product Spotlight', category: 'Product', icon: '📦', desc: 'Clean product-focused reel with lifestyle shots.' },
  { name: 'Mega Sale Countdown', category: 'Sale', icon: '🏷️', desc: 'Urgent sale announcement with countdown energy.' },
  { name: 'Festival Celebration', category: 'Festival', icon: '🎉', desc: 'Festive themed reel with colors and music.' },
  { name: 'Luxury Showcase', category: 'Luxury', icon: '👑', desc: 'Premium elegant presentation of your offering.' },
  { name: 'Minimal Business Intro', category: 'Minimal', icon: '🤍', desc: 'Simple, clean business introduction.' },
  { name: 'Real Estate Walkthrough', category: 'Real Estate', icon: '🏠', desc: 'Property tour with highlight captions.' },
  { name: 'Local Service Trust', category: 'Service', icon: '🔧', desc: 'Service business credibility and social proof.' },
];

const CATEGORIES = ['All', 'Restaurant', 'Product', 'Sale', 'Festival', 'Luxury', 'Minimal', 'Real Estate', 'Service'];

export default function Templates() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [category, setCategory] = useState('All');

  const filtered = category === 'All' ? TEMPLATES : TEMPLATES.filter((t) => t.category === category);

  const select = (t) => {
    showToast(`"${t.name}" selected. Start building with this template style.`);
    navigate('/dashboard/create');
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 style={{ marginBottom: 4 }}>Reel Templates</h1>
          <p className="muted">Pick a starting point — AI will follow the template's vibe.</p>
        </div>
      </div>

      <div className="filter-tabs">
        {CATEGORIES.map((c) => (
          <button key={c} className={`filter-tab ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>
            {c}
          </button>
        ))}
      </div>

      <div className="template-grid">
        {filtered.map((t) => (
          <div className="template-card" key={t.name} onClick={() => select(t)}>
            <div className="template-preview">{t.icon}</div>
            <div className="template-card-body">
              <h4>{t.name}</h4>
              <span className="badge">{t.category}</span>
              <p className="small muted mt-1">{t.desc}</p>
              <button className="btn btn-sm btn-primary btn-block mt-1">Select Template</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}