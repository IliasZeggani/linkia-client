import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { forgotStart, forgotVerify, forgotComplete } from '../../api/auth.api';
import { useAuth } from '../../auth/AuthContext';

const STEP = {
  EMAIL: 1,
  CODE: 2,
  PASSWORD: 3,
};

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { applyTokens, loadMe } = useAuth();

  const [step, setStep] = useState(STEP.EMAIL);

  // shared state
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // step 2 (code)
  const [code, setCode] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState(null);
  const [verifyDisabled, setVerifyDisabled] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [justResent, setJustResent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  // step 3 (password)
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // secure handoff
  const [resetToken, setResetToken] = useState('');

  // simple 30s cooldown for resend UX
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => {
      setResendCooldown(s => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const toEmailStep = useCallback(() => {
    setStep(STEP.EMAIL);
    setError('');
    setCode('');
    setAttemptsLeft(null);
    setResetToken('');
    setVerifyDisabled(false);
  }, []);

  const toCodeStep = useCallback(() => {
    setStep(STEP.CODE);
    setError('');
    setAttemptsLeft(3);
    setCode('');
    setVerifyDisabled(false);
    setJustResent(false);
  }, []);

  const toPasswordStep = useCallback(() => {
    setStep(STEP.PASSWORD);
    setError('');
    setPassword('');
    setConfirmPassword('');
    setVerifyDisabled(false);
  }, []);

  // STEP 1 — request code
  const handleStart = async (e) => {
    e?.preventDefault?.();
    setLoading(true);
    setError('');
    try {
      await forgotStart(email.trim().toLowerCase());
      toCodeStep();
      setResendCooldown(30);
      setJustResent(false);
    } catch (err) {
      setError(err?.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // STEP 2 — verify code
  const handleVerify = async (e) => {
    e?.preventDefault?.();
    setLoading(true);
    setError('');
    try {
      const data = await forgotVerify(email.trim().toLowerCase(), code.trim());
      // success → we get reset_token and attempts_remaining
      setResetToken(data.reset_token);
      toPasswordStep();
    } catch (err) {
      const d = err?.response?.data || {};
      setError(d.error || 'Invalid code');
      if (typeof d.attempts_remaining === 'number') {
        setAttemptsLeft(d.attempts_remaining);
      } else {
        // No count from server? Decrement locally (defensive UX).
        setAttemptsLeft(prev => Math.max(0, (typeof prev === 'number' ? prev : 3) - 1));
      }
      // Disable verify when out of attempts or reset is expired/closed
      const reason = d.reason || '';
      const msg = (d.error || '').toLowerCase();
      if (
        (typeof d.attempts_remaining === 'number' && d.attempts_remaining <= 0) ||
        reason === 'attempts_exceeded' ||
        reason === 'expired' ||
        msg.includes('no active reset')
      ) {
        setVerifyDisabled(true);
      }
      // If attempts exceeded, force user back to step 1
      if (d.reason === 'attempts_exceeded') {
        // small pause so they can see the message
        setTimeout(() => toEmailStep(), 800);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setResendLoading(true);
    try {
      await forgotStart(email.trim().toLowerCase());
      setResendCooldown(30);
      setAttemptsLeft(3);
      setCode('');
      setVerifyDisabled(false);
      setJustResent(true);
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not resend code');
    } finally {
      setResendLoading(false);
    }
  };

  // STEP 3 — set password (auto-login)
  const handleComplete = async (e) => {
    e?.preventDefault?.();
    setLoading(true);
    setError('');
    try {
      if (password !== confirmPassword) throw new Error('Passwords do not match');
      const data = await forgotComplete(resetToken, password);
      // Expected: { accessToken, refreshToken, activeOrgId }
      if (typeof applyTokens === 'function') {
        await applyTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      }
      if (typeof loadMe === 'function') {
        await loadMe(); // sync user context
      }
      navigate(data.activeOrgId ? '/' : '/org/create', { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || 'Could not set password';
      setError(msg);
      // If reset token expired, send them back to enter a code again
      if (err?.response?.data?.reason === 'invalid_token') {
        setResetToken('');
        toCodeStep();
      }
    } finally {
      setLoading(false);
    }
  };

  // Basic layout (no lib deps)
  return (
    <div style={{ maxWidth: 420, margin: '40px auto', padding: 24, border: '1px solid #e6e6e6', borderRadius: 12 }}>
      <h2 style={{ marginTop: 0 }}>Forgot password</h2>

      <Progress step={step} />

      {step === STEP.EMAIL && (
        <form onSubmit={handleStart}>
          <label style={{ display: 'block', marginBottom: 6 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            style={inputStyle}
          />
          {error && <div style={errorStyle}>{error}</div>}
          <div style={row}>
            <button type="submit" disabled={loading || !email} style={btnPrimary}>
              {loading ? 'Sending…' : 'Send code'}
            </button>
            <button type="button" onClick={() => navigate('/login')} style={btnGhost}>Back to login</button>
          </div>
        </form>
      )}

      {step === STEP.CODE && (
        <form onSubmit={handleVerify}>
          <div style={{ marginBottom: 8, color: '#666' }}>
            We emailed a 6-digit code to <b>{email}</b>. Code expires in 15 minutes.
          </div>
          <label style={{ display: 'block', marginBottom: 6 }}>6-digit code</label>
          <input
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
            required
            style={inputStyle}
          />
          {typeof attemptsLeft === 'number' && (
            <div style={{ margin: '6px 0 8px', fontSize: 13, color: attemptsLeft === 0 ? '#b00020' : '#666' }}>
              Attempts left: {attemptsLeft}
            </div>
          )}
          {error && <div style={errorStyle}>{error}</div>}

          <div style={row}>
            <button
              type="submit"
              disabled={loading || code.length !== 6 || verifyDisabled || attemptsLeft === 0}
              style={btnPrimary}
              title={
                verifyDisabled || attemptsLeft === 0
                  ? 'Verification disabled. Request a new code.'
                  : undefined
              }
            >
              {loading ? 'Verifying…' : 'Verify'}
            </button>
            <button type="button" onClick={toEmailStep} style={btnGhost}>Back</button>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {resendCooldown === 0 ? (
                resendLoading ? (
                  <span style={{ color: '#667085', fontSize: 14 }}>Loading…</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    style={btnLink}
                    title="Send a new code"
                  >
                    Resend code
                  </button>
                )
              ) : (
                <span style={{ fontSize: 13 }}>
                  {justResent && (
                    <span style={{ color: '#1a7f37', fontWeight: 600, marginRight: 6 }}>
                      Code sent!
                    </span>
                  )}
                  <span style={{ color: '#667085' }}>
                    Resend code in {resendCooldown}s
                  </span>
                </span>
              )}
            </div>
          </div>

        </form>
      )}

      {step === STEP.PASSWORD && (
        <form onSubmit={handleComplete}>
          <label style={{ display: 'block', marginBottom: 6 }}>New password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => setShowPassword(s => !s)}
              style={{ ...btnLink, position: 'absolute', right: 6, top: 6 }}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={{ display: 'block', marginBottom: 6 }}>Confirm password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={inputStyle}
            />
          </div>
          {error && <div style={errorStyle}>{error}</div>}
          <div style={row}>
            <button
              type="submit"
              disabled={loading || !password || !confirmPassword || password !== confirmPassword}
              style={btnPrimary}
            >
              {loading ? 'Saving…' : 'Set password'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

const row = { display: 'flex', gap: 12, marginTop: 16 };
const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #ddd',
  borderRadius: 8,
  outline: 'none',
};
const btnPrimary = {
  padding: '10px 14px',
  border: '1px solid #111',
  background: '#111',
  color: '#fff',
  borderRadius: 8,
  cursor: 'pointer',
};
const btnGhost = {
  padding: '10px 14px',
  border: '1px solid #ddd',
  background: '#fff',
  color: '#333',
  borderRadius: 8,
  cursor: 'pointer',
};
const btnLink = {
  padding: 0,
  border: 'none',
  background: 'transparent',
  color: '#0b5fff',
  cursor: 'pointer',
};
const errorStyle = {
  background: '#ffefef',
  color: '#b00020',
  padding: '8px 10px',
  borderRadius: 8,
  marginTop: 8,
  border: '1px solid #ffd8d8',
};

function Progress({ step }) {
  const item = (n, label) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 20, height: 20, lineHeight: '20px', textAlign: 'center',
        borderRadius: '50%',
        background: step >= n ? '#111' : '#eee',
        color: step >= n ? '#fff' : '#666',
        fontSize: 12, fontWeight: 600
      }}>{n}</div>
      <div style={{ color: '#333' }}>{label}</div>
    </div>
  );
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 8,
      padding: '6px 0 16px',
      marginBottom: 10,
      borderBottom: '1px solid #eee'
    }}>
      {item(1, 'Email')}
      {item(2, 'Code')}
      {item(3, 'Password')}
    </div>
  );
}
