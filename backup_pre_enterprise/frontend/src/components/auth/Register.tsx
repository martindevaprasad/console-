import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAppDispatch } from '@/hooks';
import { setCredentials } from '@/store/authSlice';
import { api, AUTH } from '@/services/api';
import AuthLayout from './AuthLayout';

const ORG_TYPES = [
  { value: 'RESTAURANT', label: '🍽️ Restaurant' },
  { value: 'BAKERY', label: '🥐 Bakery' },
  { value: 'CAFE', label: '☕ Café' },
  { value: 'QUICK_SERVICE', label: '⚡ Quick Service' },
];

export const Register: React.FC = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    organizationName: '',
    orgType: 'RESTAURANT',
  });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const nextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { toast.error('Please fill all fields'); return; }
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.organizationName) { toast.error('Organization name is required'); return; }
    setLoading(true);
    try {
      const data = await api.mutation(AUTH.REGISTER, {
        email: form.email,
        password: form.password,
        name: form.name,
        organizationName: form.organizationName,
        orgType: form.orgType,
      });
      dispatch(setCredentials({ user: data.register.user, token: data.register.token }));
      toast.success('Welcome to MageOS! Your workspace is ready 🎉');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ color: '#7c3aed', fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.1em', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Sign Up</div>
        <h2 className="auth-title">Create workspace.</h2>
        <p className="auth-subtitle" style={{ margin: 0 }}>Join MageOS to get started.</p>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {[1, 2].map(s => (
          <div
            key={s}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: step >= s ? '#7c3aed' : 'rgba(255,255,255,0.1)',
              transition: 'all 0.3s',
            }}
          />
        ))}
      </div>

      {step === 1 ? (
        <form onSubmit={nextStep} id="register-step1">
          <div className="form-group">
            <label className="form-label" htmlFor="reg-name">Full name</label>
            <input
              id="reg-name"
              type="text"
              className="form-input"
              placeholder="John Doe"
              value={form.name}
              onChange={e => update('name', e.target.value)}
              required
              style={{ background: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)', color: '#f1f5f9' }}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Work email</label>
            <input
              id="reg-email"
              type="email"
              className="form-input"
              placeholder="admin@company.com"
              value={form.email}
              onChange={e => update('email', e.target.value)}
              required
              style={{ background: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)', color: '#f1f5f9' }}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              type="password"
              className="form-input"
              placeholder="Min 6 characters"
              value={form.password}
              onChange={e => update('password', e.target.value)}
              required
              style={{ background: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)', color: '#f1f5f9' }}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-confirm">Confirm password</label>
            <input
              id="reg-confirm"
              type="password"
              className="form-input"
              placeholder="Repeat password"
              value={form.confirmPassword}
              onChange={e => update('confirmPassword', e.target.value)}
              required
              style={{ background: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)', color: '#f1f5f9' }}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', background: '#7c3aed' }} id="reg-next">
            Continue →
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} id="register-step2">
          <div className="form-group">
            <label className="form-label" htmlFor="reg-org-name">Organization name</label>
            <input
              id="reg-org-name"
              type="text"
              className="form-input"
              placeholder="My Restaurant Group"
              value={form.organizationName}
              onChange={e => update('organizationName', e.target.value)}
              required
              style={{ background: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)', color: '#f1f5f9' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Business type</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {ORG_TYPES.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => update('orgType', type.value)}
                  style={{
                    padding: '12px',
                    border: `2px solid ${form.orgType === type.value ? '#7c3aed' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '8px',
                    background: form.orgType === type.value ? 'rgba(124, 58, 237, 0.15)' : 'transparent',
                    color: form.orgType === type.value ? '#9d6ff0' : '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                  }}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setStep(1)} style={{ flex: 1, padding: '0.75rem' }}>
              ← Back
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 2, padding: '0.75rem', background: '#7c3aed' }}
              disabled={loading}
              id="reg-submit"
            >
              {loading ? (
                <><span className="spinner" style={{ width: 18, height: 18 }} /> Creating...</>
              ) : 'Create Workspace'}
            </button>
          </div>
        </form>
      )}

      <p className="text-center" style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '2rem' }}>
        Already have an account?{' '}
        <Link to="/login" className="auth-link">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Register;
