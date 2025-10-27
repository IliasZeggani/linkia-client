import React, { useEffect, useState } from 'react';
import { createInitialOrg, createOrg, listOrgs, renameOrg } from '../../api/org.api';
import { useAuth } from '../../auth/AuthContext';
import Button from '../../components/Button';
import ErrorText from '../../components/ErrorText';
import FormInput from '../../components/FormInput';
import { useNavigate } from 'react-router-dom';

export default function OrgCreate() {
  const nav = useNavigate();
  const { activeOrgId, setActiveOrg, loadMe } = useAuth();

  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await listOrgs();
        if (!mounted) return;
        setOrgs(res.data || []);
      } catch (ex) {
        if (mounted) setErr(ex?.response?.data?.message || 'Failed to load organizations');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); if (!name.trim()) return setErr('Organization name is required');
    setSaving(true);
    try {
      const isFirst = orgs.length === 0;
      const res = isFirst ? await createInitialOrg(name.trim()) : await createOrg(name.trim());
      // server responds with activeOrgId; fall back to id if needed
      const newId = res?.data?.activeOrgId ?? res?.data?.id ?? res?.data?.org?.id;
      if (newId) setActiveOrg(String(newId));
      // keep client-side user/org in sync (reads user.last_org_id)
      await loadMe();
      // go to dashboard
      nav('/', { replace: true });
    } catch (ex) {
      setErr(ex?.response?.data?.message || 'Could not create organization');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;

  const firstTime = orgs.length === 0;

  return (
    <div style={{ maxWidth: 520, margin: '40px auto', padding: '0 16px' }}>
      <h2>{firstTime ? 'Create your first organization' : 'Create a new organization'}</h2>
      <form onSubmit={submit}>
        <FormInput label="Organization name" value={name} onChange={(e)=>setName(e.target.value)} placeholder="Acme Inc." />
        <Button type="submit" loading={saving} style={{ marginTop: 12, width:'auto' }}>
          {firstTime ? 'Create & Continue' : 'Create organization'}
        </Button>
        <ErrorText>{err}</ErrorText>
      </form>

      {!firstTime && (
        <>
          <hr style={{ margin: '24px 0' }} />
          <p style={{ color:'#666' }}>You already have organizations. You can also rename existing ones from the list page.</p>
          <Button onClick={() => nav('/org', { replace: true })} style={{ width:'auto' }}>Go to organizations list</Button>
        </>
      )}
    </div>
  );
}
