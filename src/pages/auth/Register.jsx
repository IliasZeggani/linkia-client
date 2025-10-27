import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import FormInput from '../../components/FormInput';
import Button from '../../components/Button';
import ErrorText from '../../components/ErrorText';
import { isEmail, notEmpty } from '../../utils/validators';
import { checkEmail, register } from '../../api/auth.api';

export default function Register() {
  const nav = useNavigate();
  const [step, setStep] = useState(1); // 1=email, 2=details, 3=done
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const gotoDetails = async (e) => {
    e.preventDefault();
    setErr('');
    if (!isEmail(email)) { setErr('Enter a valid email'); return; }
    try {
      const { available } = await checkEmail(email);
      if (!available) return setErr('This email is already in use.');
      setStep(2);
    } catch {
      setErr('Could not validate email. Try again.');
    }
  };

  const submitAll = async (e) => {
    e.preventDefault();
    setErr('');
    if (!notEmpty(fullName)) return setErr('Full name is required');
    if (!birthday) return setErr('Birthday is required');
    if (!accepted) return setErr('You must accept the terms');

    setLoading(true);
    try {
      await register({ email, full_name: fullName, birthday, acceptedTerms: true });
      setStep(3);
    } catch (ex) {
      setErr(ex?.response?.data?.message || 'Could not complete registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh', display:'grid', placeItems:'center' }}>
      <div style={{ width: 440, padding: 24, border: '1px solid #eee', borderRadius: 12 }}>
        {step === 1 && (
          <form onSubmit={gotoDetails} noValidate>
            <h2 style={{ marginTop: 0 }}>Create your account</h2>
            <FormInput
              label="Email"
              type="email"
              value={email}
              onChange={e=>setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
            <Button type="submit" style={{ marginTop: 12 }}>Continue</Button>
            <ErrorText>{err}</ErrorText>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={submitAll} noValidate>
            <h2 style={{ marginTop: 0 }}>Your details</h2>
            <p style={{ color:'#666' }}>{email}</p>

            <FormInput
              label="Full name"
              value={fullName}
              onChange={e=>setFullName(e.target.value)}
              placeholder="Jane Doe"
            />
            <FormInput
              label="Birthday"
              type="date"
              value={birthday}
              onChange={e=>setBirthday(e.target.value)}
            />
            <label style={{ display:'flex', gap:8, alignItems:'center', margin:'12px 0' }}>
              <input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} />
              I accept the Terms
            </label>

            <div style={{ display:'flex', gap:8 }}>
              <Button type="button" variant="secondary" onClick={()=>setStep(1)}>Back</Button>
              <Button type="submit" loading={loading}>Create account</Button>
            </div>
            <ErrorText>{err}</ErrorText>
          </form>
        )}

        {step === 3 && (
          <div>
            <h2 style={{ marginTop: 0 }}>Confirm your email</h2>
            <p>We’ve sent a confirmation link to <b>{email}</b>. Please check your inbox.</p>
            <div style={{ display:'flex', gap:12, marginTop:16 }}>
             <Button variant="secondary" onClick={()=>nav('/')}>Go back</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
