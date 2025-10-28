import React, { useEffect, useState } from 'react';
import { listOrgs, renameOrg, switchOrg } from '../../api/org.api';
import { useAuth } from '../../auth/AuthContext';
import Button from '../../components/Button';
import ErrorText from '../../components/ErrorText';
import FormInput from '../../components/FormInput';

export default function OrgList() {
  const { activeOrgId, setActiveOrg, loadMe } = useAuth();

  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [renaming, setRenaming] = useState({}); // id -> newName
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true); setErr('');
    try {
      const res = await listOrgs();
      setOrgs(res.data?.organizations || []);
    } catch (ex) {
      setErr(ex?.response?.data?.message || 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const doSwitch = async (id) => {
    if (String(id) === String(activeOrgId)) return;
    setBusyId(id);
    try {
      await switchOrg(id);
      setActiveOrg(String(id));
      await loadMe();
      window.location.href = '/';
    } catch (ex) {
      alert(ex?.response?.data?.message || 'Could not switch organization');
    } finally {
      setBusyId(null);
    }
  };

  const doRename = async (id) => {
    const newName = renaming[id];
    if (!String(newName || '').trim()) return;
    setBusyId(id);
    try {
      await renameOrg(id, newName.trim());
      await load();
    } catch (ex) {
      alert(ex?.response?.data?.message || 'Rename failed');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div style={{ maxWidth: 720, margin: '40px auto', padding: '0 16px' }}>
      <h2>Organizations</h2>
      <ErrorText>{err}</ErrorText>

      {orgs.length === 0 ? (
        <p>No organizations yet. <a href="/org/create">Create one</a>.</p>
      ) : (
        <div>
          {orgs.map((o) => (
            <div key={o.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #eee' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>
                  {o.name} {String(o.id) === String(activeOrgId) && <span style={{ color: '#0a7f2e', fontWeight: 400 }}>(active)</span>}
                </div>
                <div style={{ fontSize: 12, color: '#666' }}>ID: {o.id}</div>
              </div>

              <div style={{ width: 260 }}>
                <FormInput
                  label="Rename"
                  value={renaming[o.id] ?? o.name}
                  onChange={(e) => setRenaming((m) => ({ ...m, [o.id]: e.target.value }))}
                />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <Button onClick={() => doRename(o.id)} loading={busyId === o.id} style={{ width: 'auto' }}>
                  Save
                </Button>
                <Button onClick={() => doSwitch(o.id)} loading={busyId === o.id} style={{ width: 'auto', background: '#333' }}>
                  Switch
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <a href="/org/create">Create new organization</a>
      </div>
      <div style={{ marginTop: 12 }}>
        <a href="/" style={{ textDecoration: 'none', color: '#0a7f2e' }}>← Back to Linkia</a>
      </div>

    </div>
  );
}
