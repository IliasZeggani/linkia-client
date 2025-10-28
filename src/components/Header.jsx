import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Link } from 'react-router-dom';

export default function Header() {
  const {
    user,
    activeOrgId,
    setActiveOrg,
    activeMode,
    setActiveMode,
    logout
  } = useAuth();

  const orgs = user?.organizations || [];

  const [changingOrg, setChangingOrg] = useState(false);
  const [changingMode, setChangingMode] = useState(false);

  const onOrgChange = async (e) => {
    const id = e.target.value;
    setChangingOrg(true);
    try {
      await setActiveOrg(id);
      // 🔄 Hard browser reload after switching organization
      window.location.reload();
    } finally {
      setChangingOrg(false);
    }
  };

  const onModeChange = async (e) => {
    const mode = e.target.value;
    setChangingMode(true);
    try {
      await setActiveMode(mode);
      // 🔄 Hard browser reload after switching mode
      window.location.reload();
    } finally {
      setChangingMode(false);
    }
  };

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        borderBottom: '1px solid #eee',
        background: '#fff',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <Link to="/" style={{ fontWeight: 700 }}>Linkia</Link>

        {/* Organization switcher */}
        <div>
          <label style={{ fontSize: 12, color: '#666', display: 'block' }}>Organization</label>
          <select
            value={activeOrgId || ''}
            onChange={onOrgChange}
            disabled={changingOrg || changingMode || orgs.length === 0}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', minWidth: 220 }}
          >
            {orgs.length === 0 && <option value="">— none —</option>}
            {orgs.map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>

        {/* Mode switcher */}
        <div>
          <label style={{ fontSize: 12, color: '#666', display: 'block' }}>Mode</label>
          <select
            value={activeMode || 'PRODUCTION'}
            onChange={onModeChange}
            disabled={changingMode || changingOrg}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', minWidth: 160 }}
          >
            <option value="PRODUCTION">Production</option>
            <option value="SANDBOX">Sandbox</option>
          </select>
        </div>

        {/* Mode badge */}
        <span
          style={{
            display: 'inline-block',
            marginLeft: 8,
            fontSize: 12,
            padding: '2px 8px',
            borderRadius: 999,
            background: activeMode === 'SANDBOX' ? '#fff3cd' : '#e8f5e9',
            border: '1px solid #eee',
          }}
        >
          {activeMode}
        </span>
      </div>


      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link to="/org" style={{ textDecoration: 'none' }}>Organizations</Link>
        <Link to="/org/create" style={{ textDecoration: 'none' }}>Add Organization</Link>
        <Link to="/me" style={{ textDecoration: 'none' }}>Profile</Link>
        <button
          onClick={logout}
          style={{
            background: '#e74c3c',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '6px 12px',
            cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </div>
    </header>
  );
}
