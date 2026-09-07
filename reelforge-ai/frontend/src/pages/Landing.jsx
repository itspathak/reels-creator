import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import './landing.css';

const BUSINESS_TYPES = ['Restaurant', 'Cafe', 'Clothing', 'Salon', 'Gym', 'Real Estate', 'Jewellery', 'Electronics', 'Hotel', 'Service Business', 'More'];

const STEPS = [
  { num: '1', title: 'Tell us about your business', desc: 'Name, type, location, offer and audience — takes less than a minute.' },
  { num: '2', title: 'Upload your photos', desc: 'Drag in a few photos or videos of your business. A logo is optional.' },
  { num: '3', title: 'AI creates your Reel', desc: 'We write the script, add the voiceover, captions and hashtags, and render a ready-to-post Reel.' },
];

const FEATURES = [
  { icon: '✍️', title: 'AI Scripts & Hooks', desc: 'Scroll-stopping hooks, scene-by-scene scripts and captions written for your business.' },
  { icon: '🎙️', title: 'AI Voiceover', desc: 'Natural text-to-speech voiceover in English, Hindi, Gujarati and Hinglish.' },
  { icon: '🎬', title: 'Auto Video Rendering', desc: 'Vertical 9:16 Reels with your photos, animated text, logo, music and CTA.' },
  { icon: '🏷️', title: 'Smart Hashtags', desc: 'Relevant, trending hashtags delivered automatically with every Reel.' },
  { icon: '🎨', title: 'Brand Kit', desc: 'Save your colors, logo and CTA once — every future Reel uses your brand.' },
  { icon: '🧑‍💻', title: 'Zero Learning Curve', desc: 'If you can order food online, you can create a Reel. No editing skills needed.' },
];

const EXAMPLES = [
  { visual: '🍜', business: 'Spice Garden Restaurant', desc: 'Viral food reel with a local audience hook.' },
  { visual: '💇‍♀️', business: 'Blush Beauty Salon', desc: 'Before/after reveal with a festive offer.' },
  { visual: '🏠', business: 'Skyline Realty', desc: 'Luxury property walkthrough in 15 seconds.' },
];

const PLANS = [
  {
    name: 'Starter',
    price: '$0',
    desc: 'Perfect to try ReelForge AI.',
    features: ['5 Reels per month', 'All business types', 'AI script + hashtags', 'Demo voiceover', 'Demo video rendering'],
    cta: 'Start Free',
    popular: false,
  },
  {
    name: 'Growth',
    price: '$19',
    desc: 'For growing local businesses.',
    features: ['30 Reels per month', 'Everything in Starter', 'Real AI voiceover', 'Real video rendering', 'Brand Kit', 'Priority support'],
    cta: 'Upgrade to Growth',
    popular: true,
  },
  {
    name: 'Business',
    price: '$49',
    desc: 'For agencies & multi-location brands.',
    features: ['Unlimited Reels', 'Everything in Growth', 'Multiple brand kits', 'Team seats', 'API access', 'Dedicated manager'],
    cta: 'Contact Sales',
    popular: false,
  },
];

const FAQS = [
  { q: 'Do I need any video editing skills?', a: 'No. You fill in a short form, upload a few photos, and ReelForge AI writes the script, generates the voiceover, and renders the video automatically.' },
  { q: 'What business types are supported?', a: 'Restaurants, cafes, salons, gyms, clothing stores, jewellery shops, real estate, hotels, electronics, local services and more.' },
  { q: 'Which languages does the voiceover support?', a: 'English, Hindi, Gujarati and Hinglish. More languages are being added.' },
  { q: 'What size is the final video?', a: 'Every Reel is rendered in a vertical 9:16 format at 1080×1920 — exactly Instagram Reels requirements.' },
  { q: 'Can I customize the output?', a: 'Yes. You can edit the script, regenerate the Reel, save brand colors, and choose from multiple templates and styles.' },
  { q: 'Is my data safe?', a: 'Your uploads and AI content are private and only used to create your Reels. We never sell your data.' },
];

export default function Landing() {
  const navigate = useNavigate();
  const [sticky, setSticky] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  const onScroll = () => setSticky(window.scrollY > 10);

  useEffect(() => {
    const onScroll = () => setSticky(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const goCreate = () => (localStorage.getItem('reelforge_token') ? navigate('/dashboard/create') : navigate('/register'));

  return (
    <div className="landing">
      <nav className="landing-nav">
        <button className="brand-lockup" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <Logo size={30} />
          <span>ReelForge <em>AI</em></span>
        </button>
        <div className="nav-buttons">
          <Link to="/login" className="btn btn-ghost">Log in</Link>
          <button className="btn btn-primary btn-sm" onClick={goCreate}>Get Started</button>
        </div>
      </nav>

      <section className="hero">
        <span className="hero-badge">
          <span className="pulse" /> AI-powered Instagram Reels, in minutes
        </span>
        <h1>Turn Your Business Into <span className="grad-text">Scroll-Stopping</span> Reels</h1>
        <p className="hero-sub">
          Tell us about your business, upload your photos, and let AI create your next Instagram Reel.
        </p>
        <div className="hero-ctas">
          <button className="btn btn-primary btn-lg" onClick={goCreate}>✨ Create Your First Reel</button>
          <a href="#how" className="btn btn-secondary btn-lg">See How It Works</a>
        </div>
        <div className="hero-stats">
          <div className="hero-stat"><strong>15 sec</strong><span>Avg. reel runtime</span></div>
          <div className="hero-stat"><strong>9:16</strong><span>Instagram ready</span></div>
          <div className="hero-stat"><strong>4+</strong><span>Languages</span></div>
          <div className="hero-stat"><strong>3 mins</strong><span>From idea to reel</span></div>
        </div>
      </section>

      <section className="section" id="how">
        <div className="section-head">
          <div className="section-eyebrow">How it works</div>
          <h2>From business to Reel in three steps</h2>
          <p>No editing software. No scripts. No design skills. Just your business details and a few photos.</p>
        </div>
        <div className="steps-grid">
          {STEPS.map((s) => (
            <div className="step-card" key={s.num}>
              <div className="step-num">{s.num}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div className="section-eyebrow">Built for every business</div>
          <h2>Any business can go viral</h2>
          <p>From local shops to hotels — ReelForge AI understands your industry and speaks your audience's language.</p>
        </div>
        <div className="business-types">
          {BUSINESS_TYPES.map((b) => (
            <span className="btype-chip" key={b}>🏪 {b}</span>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div className="section-eyebrow">Powered by AI</div>
          <h2>Everything is generated for you</h2>
          <p>A full production team in your pocket — hook, script, voice, video, captions and hashtags.</p>
        </div>
        <div className="features-grid">
          {FEATURES.map((f) => (
            <div className="feature-card" key={f.title}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div className="section-eyebrow">Made with ReelForge AI</div>
          <h2>Sample Reels you can create</h2>
        </div>
        <div className="example-reels">
          {EXAMPLES.map((e) => (
            <div className="example-reel" key={e.business}>
              <div className="example-visual">{e.visual}</div>
              <div className="example-body">
                <h3>{e.business}</h3>
                <p>{e.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div className="section-eyebrow">Pricing</div>
          <h2>Start free. Grow from there.</h2>
          <p>Simple plans that scale with your content needs. No credit card required to start.</p>
        </div>
        <div className="pricing-grid">
          {PLANS.map((p) => (
            <div className={`price-card ${p.popular ? 'popular' : ''}`} key={p.name}>
              {p.popular && <span className="popular-tag">Most Popular</span>}
              <div className="price-name">{p.name}</div>
              <div className="price-amount">{p.price}<span> / month</span></div>
              <div className="price-desc">{p.desc}</div>
              <ul className="price-features">
                {p.features.map((f) => (
                  <li key={f}><span className="check">✓</span>{f}</li>
                ))}
              </ul>
              <button className="btn btn-block btn-primary" onClick={() => navigate('/register')}>{p.cta}</button>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div className="section-eyebrow">FAQ</div>
          <h2>Frequently asked questions</h2>
        </div>
        <div className="faq-list">
          {FAQS.map((f, i) => (
            <div className={`faq-item ${openFaq === i ? 'open' : ''}`} key={f.q}>
              <button className="faq-q" onClick={() => setOpenFaq(openFaq === i ? -1 : i)}>
                {f.q}
                <span className="chev">▾</span>
              </button>
              <div className="faq-a">{f.a}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="final-cta">
        <h2>Ready to create your first Reel?</h2>
        <p>Join businesses creating scroll-stopping Instagram content with AI.</p>
        <button className="btn btn-lg" onClick={goCreate}>✨ Create Your First Reel — Free</button>
      </div>

      <footer className="footer">
        <div className="brand-lockup" style={{ justifyContent: 'center', marginBottom: 8 }}>
          <Logo size={24} />
          <span style={{ fontSize: 16 }}>ReelForge <em>AI</em></span>
        </div>
        © {new Date().getFullYear()} ReelForge AI. All rights reserved.
      </footer>
    </div>
  );
}