import React, { useEffect, useState } from 'react';
import { listOrgs, switchOrg } from '../api/org.api';
import { useAuth } from '../auth/AuthContext';

export default function OrgSwitcher({ onChanged }) {
  const { activeOrgId, setActiveOrg, loadMe } = useAuth();
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await listOrgs();
        if (!mounted) return;
        setOrgs(res.data || []);
      } catch (ex) {
        if (mounted) setErr(ex?.response?.data?.message || 'Failed to load orgs');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const onChange = async (e) => {
    const id = e.target.value;
    if (!id || id === activeOrgId) return;
    try {
      await switchOrg(id);
      setActiveOrg(String(id));
      await loadMe(); // keep /me in sync
      onChanged && onChanged(id);
    } catch (ex) {
      alert(ex?.response?.data?.message || 'Could not switch organization');
    }
  };

  if (loading) return <span>Loading orgs…</span>;
  if (err) return <span style={{ color: 'crimson' }}>{err}</span>;
  if (!orgs.length) return null;

  return (
    <select value={activeOrgId || ''} onChange={onChange} style={{ padding:'6px 8px', borderRadius: 8 }}>
      {orgs.map((o) => (
        <option key={o.id} value={o.id}>{o.name}</option>
      ))}
    </select>
  );
}
