import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import FormInput from '../../components/FormInput';
import Button from '../../components/Button';
import ErrorText from '../../components/ErrorText';
import { isEmail, notEmpty } from '../../utils/validators';

export default function Login() {
  const nav = useNavigate();
  const { state } = useLocation();
  const { login, activeOrgId } = useAuth();

  const [email, setEmail] = useState(state?.email || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const [errors, setErrors] = useState({});
  const [serverErr, setServerErr] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!isEmail(email)) e.email = 'Enter a valid email';
    if (!notEmpty(password)) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    setServerErr('');
    if (!validate()) return;

    setLoading(true);
    try {
      const data = await login({ email, password, rememberMe });
      const orgId =
        data?.activeOrgId ??
        data?.active_org_id ??
        (Array.isArray(data?.organizations) && data.organizations.find(o => o.is_active)?.id) ??
        (Array.isArray(data?.organizations) && data.organizations[0]?.id) ??
        null;
      nav(orgId ? '/' : '/org/create', { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.message || 'Invalid credentials';
      setServerErr(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <div style={{ width: 360, padding: 24, border: '1px solid #eee', borderRadius: 12 }}>
        <h2 style={{ marginTop: 0 }}>Welcome back</h2>
        <p style={{ color: '#666', marginTop: 6, marginBottom: 18 }}>Sign in to your Linkia account</p>

        <form onSubmit={onSubmit} noValidate>
          <FormInput
            label="Email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            autoComplete="email"
          />
          <FormInput
            label="Password"
            name="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            autoComplete="current-password"
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0 16px' }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Remember me
            </label>

            <Link to="/forgot-password" style={{ fontSize: 14 }}>Forgot password?</Link>
          </div>

          <Button type="submit" loading={loading}>Sign in</Button>
          <ErrorText>{serverErr}</ErrorText>
        </form>

        <div style={{ marginTop: 16, fontSize: 14 }}>
          New here? <Link to="/register">Create an account</Link>
        </div>
      </div>
    </div>
  );
}
