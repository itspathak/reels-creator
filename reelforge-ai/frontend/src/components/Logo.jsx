import { useNavigate } from 'react-router-dom';

export default function Logo({ size = 34 }) {
  const navigate = useNavigate();
  return (
    <button className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="12" fill="url(#lg1)" />
        <path d="M16 34V14L34 24L16 34Z" fill="white" />
        <defs>
          <linearGradient id="lg1" x1="0" y1="0" x2="48" y2="48">
            <stop stop-color="#6C5CE7" />
            <stop offset="1" stop-color="#00CEA7" />
          </linearGradient>
        </defs>
      </svg>
    </button>
  );
}