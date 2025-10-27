import React, { useState } from 'react';
import Button from '../../components/Button';
import FormInput from '../../components/FormInput';
import ErrorText from '../../components/ErrorText';
import { changePassword } from '../../api/me.api';
import { useAuth } from '../../auth/AuthContext';

export default function ChangePassword() {
  const { applyTokens } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setOk('');
    if (!currentPassword) return setErr('Current password required');
    if (newPassword.length < 8) return setErr('New password must be at least 8 characters');
    if (newPassword !== confirm) return setErr('Passwords do not match');

    setLoading(true);
    try {
      const res = await changePassword(currentPassword, newPassword);
      if (res?.data?.accessToken || res?.data?.refreshToken) {
        // backend rotates tokens — apply if returned
        applyTokens(res.data);
      }
      setOk('Password changed');
      setCurrentPassword(''); setNewPassword(''); setConfirm('');
    } catch (ex) {
      setErr(ex?.response?.data?.message || 'Could not change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: '0 16px' }}>
      <h2>Change password</h2>
      <form onSubmit={submit}>
        <FormInput label="Current password" type="password" value={currentPassword} onChange={(e)=>setCurrentPassword(e.target.value)} />
        <FormInput label="New password" type="password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} />
        <FormInput label="Confirm new password" type="password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} />
        <Button type="submit" loading={loading} style={{ marginTop: 12, width: 'auto' }}>Update password</Button>
        {ok && <div style={{ color:'#0a7f2e', marginTop:10 }}>{ok}</div>}
        <ErrorText>{err}</ErrorText>
      </form>
    </div>
  );
}
