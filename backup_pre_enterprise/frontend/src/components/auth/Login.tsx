import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAppDispatch } from '@/hooks';
import { setCredentials } from '@/store/authSlice';
import { api, AUTH } from '@/services/api';
import AuthLayout from './AuthLayout';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please fill in all fields'); return; }
    setLoading(true);
    try {
      const data = await api.mutation(AUTH.LOGIN, { email, password });
      dispatch(setCredentials({ user: data.login.user, token: data.login.token }));
      toast.success(`Welcome back, ${data.login.user.name}!`);
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ color: '#7c3aed', fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.1em', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Sign In</div>
        <h2 className="auth-title">Welcome back.</h2>
        <p className="auth-subtitle" style={{ margin: 0 }}>Access your MageOS workspace.</p>
      </div>

      <form onSubmit={handleSubmit} id="login-form">
        <div className="form-group">
          <label className="form-label" htmlFor="login-email">Work email</label>
          <input
            id="login-email"
            type="email"
            className="form-input"
            placeholder="admin@company.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            required
            style={{ background: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)', color: '#f1f5f9' }}
          />
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label className="form-label" htmlFor="login-password" style={{ margin: 0 }}>Password</label>
            <a href="#" className="auth-link" style={{ fontSize: '0.75rem' }}>Forgot password?</a>
          </div>
          <input
            id="login-password"
            type="password"
            className="form-input"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            style={{ background: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)', color: '#f1f5f9' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <input type="checkbox" id="keep-signed-in" style={{ cursor: 'pointer' }} />
          <label htmlFor="keep-signed-in" style={{ fontSize: '0.875rem', color: '#94a3b8', cursor: 'pointer' }}>Keep me signed in on this device</label>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-lg"
          style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', background: '#7c3aed' }}
          disabled={loading}
          id="login-submit"
        >
          {loading ? (
            <><span className="spinner" style={{ width: 18, height: 18 }} /> Signing in...</>
          ) : 'Sign in →'}
        </button>
      </form>

      <div className="auth-divider">or continue with</div>

      <div className="auth-sso-grid">
        <button className="btn-sso">
          <img src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" alt="Microsoft" width="16" height="16" />
          Microsoft
        </button>
        <button className="btn-sso">
          <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" width="16" height="16" />
          Google
        </button>
        <button className="btn-sso">
          <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid #0ea5e9' }}></div>
          SAML
        </button>
      </div>

      <p className="text-center" style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '2rem' }}>
        New to MageOS?{' '}
        <Link to="/register" className="auth-link">
          Request workspace access
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Login;
