import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Logo from '../components/Logo.jsx';
import { Spinner } from '../components/Loaders.jsx';

export default function Register() {
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
    if (errors[key]) setErrors({ ...errors, [key]: undefined });
  };

  const validate = () => {
    const e = {};
    if (form.name.trim().length < 2) e.name = 'Name must be at least 2 characters';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    setErrorMsg('');
    if (!validate()) return;
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.confirmPassword);
      showToast('Account created — welcome to ReelForge AI!');
      navigate('/dashboard');
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="brand-lockup"><Logo size={34} /><span>ReelForge <em>AI</em></span></div>
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Start creating scroll-stopping Reels for free</p>

        {errorMsg && <div className="alert alert-error">{errorMsg}</div>}

        <form onSubmit={onSubmit} noValidate>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" className={`input ${errors.name ? 'invalid' : ''}`} placeholder="Your name" value={form.name} onChange={set('name')} />
            {errors.name && <div className="field-error">{errors.name}</div>}
          </div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" className={`input ${errors.email ? 'invalid' : ''}`} placeholder="you@business.com" value={form.email} onChange={set('email')} />
            {errors.email && <div className="field-error">{errors.email}</div>}
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" className={`input ${errors.password ? 'invalid' : ''}`} placeholder="At least 8 characters" value={form.password} onChange={set('password')} />
            {errors.password && <div className="field-error">{errors.password}</div>}
          </div>

          <div className="field">
            <label htmlFor="confirm">Confirm Password</label>
            <input id="confirm" type="password" className={`input ${errors.confirmPassword ? 'invalid' : ''}`} placeholder="Repeat password" value={form.confirmPassword} onChange={set('confirmPassword')} />
            {errors.confirmPassword && <div className="field-error">{errors.confirmPassword}</div>}
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ marginTop: 6 }}>
            {loading ? <Spinner size={18} /> : 'Create Account'}
          </button>
        </form>

        <div className="divider">or</div>

        <button className="google-btn" disabled>
          <svg className="google-logo" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 11.99c0 1.78.43 3.46 1.18 4.92l2.85-2.22.81-.6z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.85c.87-2.6 3.3-4.54 6.16-4.54z"/></svg>
          Continue with Google
          <span className="small muted">(coming soon)</span>
        </button>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Log in</Link>
        </div>
      </div>
    </div>
  );
}