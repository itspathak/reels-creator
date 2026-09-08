import { useNavigate } from 'react-router-dom';

export default function Logo({ size = 34 }) {
  const navigate = useNavigate();
  return (
    <button className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="12" fill="url(#gplg1)" />
        <path d="M14 12C20.6274 12 26 17.3726 26 24H20C20 20.6863 17.3137 18 14 18V12Z" fill="white" />
        <path d="M14 27C16.4853 27 18.5 29.0147 18.5 31.5C18.5 33.9853 16.4853 36 14 36V30.75H10.5V27H14Z" fill="white" fillOpacity="0.92" />
        <text x="30" y="34" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="19" fill="white">P</text>
        <defs>
          <linearGradient id="gplg1" x1="0" y1="0" x2="48" y2="48">
            <stop stop-color="#6C5CE7" />
            <stop offset="1" stop-color="#00CEA7" />
          </linearGradient>
        </defs>
      </svg>
    </button>
  );
}