// src/pages/additions/AdditionList.jsx
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { listAdditions } from '../../api/additions.api';

function useDebouncedValue(value, delay = 300) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return v;
}

const TYPE_OPTIONS = [
  { value: 'ALL', label: 'All types' },
  { value: 'DISCOUNT', label: 'Discount' },
  { value: 'TAXFEE', label: 'Tax/Fee' },
  { value: 'PROMOTION', label: 'Promotion' },
];

const ACTIVE_OPTIONS = [
  { value: 'ALL', label: 'All' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

export default function AdditionList() {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();

  // url state
  const page = Number(sp.get('page') || 1);
  const pageSize = Number(sp.get('pageSize') || 25);
  const q = sp.get('q') || '';
  const type = sp.get('type') || 'ALL';
  const isActive = sp.get('active') || 'ALL';
  const sort = sp.get('sort') || 'updated_at';
  const dir = sp.get('dir') || 'desc';

  const [data, setData] = React.useState({ items: [], total: 0, limit: pageSize, offset: (page - 1) * pageSize });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const dq = useDebouncedValue(q, 300);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const out = await listAdditions({ page, pageSize, q: dq, type, isActive, sort, dir });
        if (!cancelled) setData(out);
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.error || e.message || 'Error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // include dq (debounced q) so we don’t fetch on every keystroke
  }, [page, pageSize, dq, type, isActive, sort, dir]);

  const setParam = (key, value) => {
    const next = new URLSearchParams(sp);
    if (value === undefined || value === null || value === '' || value === 'ALL') next.delete(key);
    else next.set(key, String(value));
    // reset to first page on filter/sort/search change
    if (['q', 'type', 'active', 'sort', 'dir', 'pageSize'].includes(key)) next.set('page', '1');
    setSp(next, { replace: true });
  };

  const setParams = (updates = {}) => {
    const next = new URLSearchParams(sp);
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === null || value === '' || value === 'ALL') next.delete(key);
      else next.set(key, String(value));
    }
    if (Object.keys(updates).some(k => ['q', 'type', 'active', 'sort', 'dir', 'pageSize'].includes(k))) {
      next.set('page', '1');
    }
    setSp(next, { replace: true });
  };

  const onHeaderClick = (field) => {
    if (sort !== field) {
      setParams({ sort: field, dir: 'asc' });
      return;
    }
    setParams({ dir: dir === 'asc' ? 'desc' : 'asc' });
  };

  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'type', label: 'Type', sortable: true },
    { key: 'is_active', label: 'Active', sortable: true },
    { key: 'updated_at', label: 'Updated', sortable: true },
  ];

  const items = data.items || [];
  const total = data.total || 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Catalog additions</h1>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '12px 0 16px' }}>
        <input
          value={q}
          onChange={e => setParam('q', e.target.value)}
          placeholder="Search by name…"
          style={{ padding: '8px 10px', border: '1px solid #ccc', borderRadius: 6, minWidth: 260 }}
        />
        <select value={type} onChange={e => setParam('type', e.target.value)} style={{ padding: '8px 10px', border: '1px solid #ccc', borderRadius: 6 }}>
          {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={isActive} onChange={e => setParam('active', e.target.value)} style={{ padding: '8px 10px', border: '1px solid #ccc', borderRadius: 6 }}>
          {ACTIVE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        {/* Create menu will be wired in next steps to go to /additions/new/... */}
        <button onClick={() => navigate('/additions/new/discount')} style={{ padding: '8px 12px' }}>New Discount</button>
        <button onClick={() => navigate('/additions/new/taxfee')} style={{ padding: '8px 12px' }}>New Tax/Fee</button>
        <button onClick={() => navigate('/additions/new/promotion')} style={{ padding: '8px 12px' }}>New Promotion</button>
      </div>

      {/* Table */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.8fr 1.2fr', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
          {columns.map(col => (
            <div
              key={col.key}
              onClick={() => col.sortable && onHeaderClick(col.key)}
              style={{ padding: '10px 12px', fontWeight: 600, cursor: col.sortable ? 'pointer' : 'default', userSelect: 'none' }}
            >
              {col.label}
              {sort === col.key ? (dir === 'asc' ? ' ▲' : ' ▼') : ''}
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 16 }}>Loading…</div>
        ) : error ? (
          <div style={{ padding: 16, color: '#b91c1c' }}>{error}</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 16, color: '#666' }}>No additions found.</div>
        ) : (
          items.map(row => (
            <div
              key={row.id}
              onClick={() => navigate(`/additions/${row.id}/edit`)}
              style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.8fr 1.2fr', borderTop: '1px solid #f1f5f9', padding: '10px 12px', cursor: 'pointer' }}
            >
              <div>{row.name}</div>
              <div>{row.type}</div>
              <div>{row.is_active ? 'Yes' : 'No'}</div>
              <div>{new Date(row.updated_at).toLocaleString()}</div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
        <div style={{ color: '#666' }}>
          {total} items • Page {page} / {pages}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={pageSize}
            onChange={e => setParam('pageSize', Number(e.target.value))}
            style={{ padding: '6px 8px', border: '1px solid #ccc', borderRadius: 6 }}
          >
            {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
          </select>
          <button disabled={page <= 1} onClick={() => setParam('page', 1)} style={{ padding: '6px 10px' }}>« First</button>
          <button disabled={page <= 1} onClick={() => setParam('page', page - 1)} style={{ padding: '6px 10px' }}>‹ Prev</button>
          <button disabled={page >= pages} onClick={() => setParam('page', page + 1)} style={{ padding: '6px 10px' }}>Next ›</button>
          <button disabled={page >= pages} onClick={() => setParam('page', pages)} style={{ padding: '6px 10px' }}>Last »</button>
        </div>
      </div>
    </div>
  );
}
