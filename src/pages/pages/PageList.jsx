// src/pages/pages/PageList.jsx
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { listPages } from '../../api/pages.api';

function useDebouncedValue(value, delay = 300) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

const ACTIVE_OPTIONS = [
  { value: 'ALL', label: 'All' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

function SortHeader({ label, col, sort, dir, onSort, disabled = false }) {
  const is = sort === col;
  const arrow = !is ? '' : (dir === 'asc' ? ' ↑' : ' ↓');
  return (
    <div
      onClick={() => { if (!disabled) onSort(col); }}
      style={{
        fontWeight: 600,
        color: '#0f172a',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.8 : 1,
      }}
      title={disabled ? undefined : 'Sort'}
    >
      {label}{arrow}
    </div>
  );
}

export default function PageList() {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();

  // URL state
  const page = Number(sp.get('page') || 1);
  const pageSize = Number(sp.get('pageSize') || 25);
  const qRaw = sp.get('q') || '';
  const activeParam = sp.get('active') || 'ALL';
  const sort = sp.get('sort') || 'updated_at';
  const dir = sp.get('dir') || 'desc';

  // Debounced search input
  const [qInput, setQInput] = React.useState(qRaw);
  const q = useDebouncedValue(qInput, 300);

  const [state, setState] = React.useState({
    loading: true,
    error: null,
    data: { total: 0, page, pageSize, rows: [] },
  });

  const setParam = (key, value) => {
    const next = new URLSearchParams(sp);
    next.set(key, String(value));
    // keep current query “shape”
    if (!next.get('page')) next.set('page', String(page));
    if (!next.get('pageSize')) next.set('pageSize', String(pageSize));
    if (!next.get('sort')) next.set('sort', sort);
    if (!next.get('dir')) next.set('dir', dir);
    setSp(next, { replace: true });
  };

  const setParams = (entries) => {
    const next = new URLSearchParams(sp);
    for (const [k, v] of entries) next.set(k, String(v));
    if (!next.get('page')) next.set('page', String(page));
    if (!next.get('pageSize')) next.set('pageSize', String(pageSize));
    if (!next.get('sort')) next.set('sort', sort);
    if (!next.get('dir')) next.set('dir', dir);
    setSp(next, { replace: true });
  };

  const onSort = (col) => {
    if (sort === col) {
      setParams([['dir', dir === 'asc' ? 'desc' : 'asc']]);
    } else {
      setParams([['sort', col], ['dir', 'asc']]);
    }
  };

  // Fetch
  React.useEffect(() => {
    let cancelled = false;
    setState(s => ({ ...s, loading: true, error: null }));
    listPages({
      page,
      pageSize,
      q,
      isActive: activeParam, // 'ALL' | 'true' | 'false'
      sort,
      dir,
    })
      .then(data => {
        if (!cancelled) setState({ loading: false, error: null, data });
      })
      .catch(err => {
        const msg = err?.response?.data?.error || err.message || 'Error';
        if (!cancelled) setState({ loading: false, error: msg, data: { total: 0, page, pageSize, rows: [] } });
      });
    return () => { cancelled = true; };
  }, [page, pageSize, q, activeParam, sort, dir]); // include debounced q

  const { loading, error, data } = state;
  const rows = data?.rows || [];
  const total = Number(data?.total || 0);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Pages</h2>
        <button
          onClick={() => navigate('/pages/new')}
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #0ea5e9', background: '#0ea5e9', color: 'white' }}
        >
          New
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          placeholder="Search (name / description / code)…"
          value={qInput}
          onChange={e => { setQInput(e.target.value); setParam('q', e.target.value); setParam('page', 1); }}
          style={{ padding: '8px 10px', minWidth: 260, borderRadius: 6, border: '1px solid #cbd5e1' }}
        />
        <select
          value={activeParam}
          onChange={e => { setParam('active', e.target.value); setParam('page', 1); }}
          style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
        >
          {ACTIVE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {/* (sorting inputs kept implicit via header clicks) */}
      </div>

      {/* Table */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
        {/* Head */}
        <div
          style={{ display: 'grid', gridTemplateColumns: '2fr 1.1fr 0.8fr 1fr 1fr 0.9fr 0.8fr', background: '#f8fafc', padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}
        >
          <SortHeader label="Name" col="name" sort={sort} dir={dir} onSort={onSort} />
          <SortHeader label="Code" col="code" sort={sort} dir={dir} onSort={onSort} />
          <SortHeader label="Active" col="is_active" sort={sort} dir={dir} onSort={onSort} />
          <SortHeader label="Items" col="items_count" sort={sort} dir={dir} onSort={onSort} />
          <SortHeader label="Additions" col="additions_count" sort={sort} dir={dir} onSort={onSort} />
          <SortHeader label="Updated" col="updated_at" sort={sort} dir={dir} onSort={onSort} />
          <div style={{ fontWeight: 600 }}>Open</div> {/* 👈 New column header */}
        </div>

        {/* Body */}
        {loading ? (
          <div style={{ padding: 16 }}>Loading…</div>
        ) : error ? (
          <div style={{ padding: 16, color: '#b91c1c' }}>{error}</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 16, color: '#64748b' }}>No pages found.</div>
        ) : (
          rows.map((r) => (
            <div
              key={r.id}
              onClick={() => navigate(`/pages/${r.id}/edit`)}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1.1fr 0.8fr 1fr 1fr 0.9fr 0.8fr', // 👈 added an extra column
                padding: '10px 12px',
                borderTop: '1px solid #f1f5f9',
                cursor: 'pointer'
              }}
            >
              <div>{r.name}</div>
              <div style={{ fontFamily: 'monospace' }}>{r.code}</div>
              <div>{r.is_active ? 'Yes' : 'No'}</div>
              <div>{r.items_count ?? 0}</div>
              <div>{r.additions_count ?? 0}</div>
              <div>{new Date(r.updated_at).toLocaleString()}</div>
              <div>
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // prevent navigating to edit page
                    window.open(`/${r.code}`, '_blank', 'noopener,noreferrer');
                  }}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid #0ea5e9',
                    background: '#0ea5e9',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  Open
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ color: '#64748b' }}>
          {total} items • Page {page} / {pages}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={pageSize}
            onChange={e => { setParam('pageSize', Number(e.target.value)); setParam('page', 1); }}
            style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 6 }}
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
