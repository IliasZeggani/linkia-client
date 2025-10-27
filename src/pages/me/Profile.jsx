import React, { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { getMe, updateMe } from '../../api/me.api';
import FormInput from '../../components/FormInput';
import Button from '../../components/Button';
import ErrorText from '../../components/ErrorText';

export default function Profile() {
  const { user: userFromCtx, loadMe, logout } = useAuth();
  const [user, setUser] = useState(userFromCtx || null);
  const [fullName, setFullName] = useState(userFromCtx?.full_name|| '');
  const [birthday, setBirthday] = useState(userFromCtx?.birthday || '');
  const [loading, setLoading] = useState(!userFromCtx);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => {
    let mounted = true;
    if (!userFromCtx) {
      (async () => {
        try {
          const res = await getMe();
          if (!mounted) return;
          setUser(res.data?.user || res.data);
          setFullName(res.data?.user?.full_name || res.data?.full_name || '');
          setBirthday(res.data?.user?.birthday || res.data?.birthday || '');
        } catch (ex) {
          setErr(ex?.response?.data?.message || 'Failed to load profile');
        } finally {
          if (mounted) setLoading(false);
        }
      })();
    } else {
      setLoading(false);
    }
    return () => { mounted = false; };
  }, [userFromCtx]);

  const save = async (e) => {
    e.preventDefault();
    setErr(''); setOk('');
    setSaving(true);
    try {
      await updateMe({ fullName, birthday });
      await loadMe();
      setOk('Profile updated');
    } catch (ex) {
      setErr(ex?.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: '0 16px' }}>
      <h2>My Profile</h2>

      <form onSubmit={save}>
        <FormInput label="Full name" value={fullName} onChange={(e)=>setFullName(e.target.value)} />
        <FormInput label="Birthday" type="date" value={birthday || ''} onChange={(e)=>setBirthday(e.target.value)} />

        <Button type="submit" loading={saving} style={{ marginTop: 12, width: 'auto' }}>Save</Button>
        {ok && <div style={{ color:'#0a7f2e', marginTop:10 }}>{ok}</div>}
        <ErrorText>{err}</ErrorText>
      </form>

      <hr style={{ margin: '24px 0' }} />
      <button onClick={logout}>Logout</button>
    </div>
  );
}
