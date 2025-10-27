import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import Button from '../../components/Button';
import ErrorText from '../../components/ErrorText';
import FormInput from '../../components/FormInput';
import { activationCheck, activationComplete } from '../../api/auth.api';
import { useAuth } from '../../auth/AuthContext';

export default function Confirm() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const token = sp.get('token');
  const { applyTokens, loadMe } = useAuth();

  const [phase, setPhase] = useState('checking'); // checking | form | error | done
  const [msg, setMsg] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      nav('/login', { replace: true });
      return;
    }
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await activationCheck(token);
        if (!mounted) return;
        setEmail(res.email);
        setPhase('form');
      } catch (ex) {
        if (!mounted) return;
        const m = ex?.response?.data?.message || 'Invalid or expired link';
        setMsg(m);
        setPhase('error');
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [token, nav]);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      setMsg('Password must be at least 8 characters');
      return;
    }
    if (password !== password2) {
      setMsg('Passwords do not match');
      return;
    }
    setLoading(true);
    setMsg('');
    try {
      const out = await activationComplete({ token, password, rememberMe: remember });
      const { accessToken, refreshToken } = out || {};
      if (!accessToken || !refreshToken) throw new Error('Missing tokens');
      applyTokens({ accessToken, refreshToken }, { remember });
      await loadMe?.();
      setPhase('done');
      nav('/', { replace: true });
    } catch (ex) {
      setMsg(ex?.response?.data?.message || 'Could not complete activation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <div style={{ width: 420, padding: 24, border: '1px solid #eee', borderRadius: 12 }}>
        <h2 style={{ marginTop: 0 }}>Activate your account</h2>

        {phase === 'checking' && <p>Checking your link…</p>}
        {phase === 'error' && (
          <>
            <ErrorText>{msg}</ErrorText>
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <Link to="/login">Back to login</Link>
            </div>
          </>
        )}

        {phase === 'form' && (
          <form onSubmit={submit}>
            <p style={{ marginTop: 0, color: '#555' }}>
              Email: <strong>{email}</strong>
            </p>
            <FormInput
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Create a strong password"
              required
            />
            <FormInput
              label="Confirm password"
              type="password"
              value={password2}
              onChange={e => setPassword2(e.target.value)}
              placeholder="Re-enter your password"
              required
            />
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '8px 0 16px' }}>
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
              Keep me signed in (Remember me)
            </label>
            {msg && <ErrorText>{msg}</ErrorText>}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
              <Button type="submit" loading={loading} disabled={loading}>Set password & continue</Button>
              <Link to="/login">Back to login</Link>
            </div>
          </form>
        )}

        {phase === 'done' && <p style={{ color: '#0a7f2e' }}>All set! Redirecting…</p>}
      </div>
    </div>
  );
}
