import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { listCatalogItems } from '../../api/catalog.api';

function useDebouncedValue(value, delay = 300) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

const TYPE_OPTIONS = [
  { value: 'ALL', label: 'All types' },
  { value: 'PRODUCT', label: 'Product' },
  { value: 'SUBSCRIPTION', label: 'Subscription' },
  { value: 'SERVICE', label: 'Service' },
  { value: 'PLAIN', label: 'Plain price' },
];

const ACTIVE_OPTIONS = [
  { value: 'ALL', label: 'All' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

export default function CatalogList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 25);
  const qRaw = searchParams.get('q') || '';
  const type = searchParams.get('type') || 'ALL';
  const activeParam = searchParams.get('active') || 'ALL';
  const sort = searchParams.get('sort') || 'updated_at'; // reserved for later server sorting
  const dir = searchParams.get('dir') || 'desc';

  // Local input state for search (debounced)
  const [qInput, setQInput] = React.useState(qRaw);
  const q = useDebouncedValue(qInput, 300);

  const isActive = activeParam === 'ALL' ? null : activeParam === 'true';

  const [state, setState] = React.useState({
    loading: true,
    error: null,
    data: { items: [], total: 0, limit: pageSize, offset: (page - 1) * pageSize },
  });

  // Fetch data whenever query state changes
  React.useEffect(() => {
    let mounted = true;
    setState(s => ({ ...s, loading: true, error: null }));
    listCatalogItems({
      page, pageSize, q, type, isActive,
      sort, dir,
    })
      .then(data => mounted && setState({ loading: false, error: null, data }))
      .catch(err => mounted && setState({ loading: false, error: err, data: { items: [], total: 0, limit: pageSize, offset: 0 } }));
    return () => { mounted = false; };
  }, [page, pageSize, q, type, isActive, sort, dir]);

  // Keep URL in sync when inputs change
  const updateParams = (updates) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => {
      if (v === null || v === undefined || v === '') next.delete(k);
      else next.set(k, String(v));
    });
    setSearchParams(next, { replace: false });
  };

  const total = state.data?.total || 0;
  const items = state.data?.items || [];

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  // Table helpers
  const onHeaderClick = (key) => {
    // Sorting reserved for server support; still reflect in URL so we’re ready.
    let nextDir = 'asc';
    if (sort === key && dir === 'asc') nextDir = 'desc';
    updateParams({ sort: key, dir: nextDir, page: 1 });
  };

  const headerSortIndicator = (key) => {
    if (sort !== key) return '';
    return dir === 'asc' ? ' ▲' : ' ▼';
  };

  const fmtDate = (iso) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch { return '—'; }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'type', label: 'Type' },
    { key: 'is_active', label: 'Active' },
    { key: 'updated_at', label: 'Updated' },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Catalog</h1>

      {/* Toolbar (match Additions style + New buttons) */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '12px 0 16px' }}>
        {/* Search */}
        <input
          placeholder="Search by name/description…"
          value={qInput}
          onChange={(e) => {
            setQInput(e.target.value);
            // Whenever search text changes, reset to page 1 in URL (debounced fetch uses `q`)
            updateParams({ q: e.target.value, page: 1 });
          }}
          style={{ padding: '8px 10px', border: '1px solid #ccc', borderRadius: 6, minWidth: 260 }}
        />

        {/* Type filter */}
        <select
          value={type}
          onChange={(e) => updateParams({ type: e.target.value, page: 1 })}
          style={{ padding: '8px 10px', border: '1px solid #ccc', borderRadius: 6 }}
        >
          {TYPE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Active filter */}
        <select
          value={activeParam}
          onChange={(e) => updateParams({ active: e.target.value, page: 1 })}
          style={{ padding: '8px 10px', border: '1px solid #ccc', borderRadius: 6 }}
        >
          {ACTIVE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* spacer */}
        <div style={{ flex: 1 }} />
        {/* New buttons (like Additions) */}
        <button onClick={() => navigate('/catalog/new/product')} style={{ padding: '8px 12px' }}>New Product</button>
        <button onClick={() => navigate('/catalog/new/subscription')} style={{ padding: '8px 12px' }}>New Subscription</button>
        <button onClick={() => navigate('/catalog/new/service')} style={{ padding: '8px 12px' }}>New Service</button>
        <button onClick={() => navigate('/catalog/new/plain')} style={{ padding: '8px 12px' }}>New Plain</button>
      </div>

      {/* Table */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.8fr 1.2fr', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
          {columns.map(col => (
            <div
              key={col.key}
              onClick={() => onHeaderClick(col.key)}
              style={{ padding: '10px 12px', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
            >
              {col.label}{headerSortIndicator(col.key)}
            </div>
          ))}
        </div>

        {state.loading && (
          <div style={{ padding: 16 }}>Loading…</div>
        )}

        {state.error && (
          <div style={{ padding: 16, color: 'crimson' }}>
            Error: {state.error.message || 'Failed to load'}
          </div>
        )}

        {!state.loading && !state.error && items.length === 0 && (
          <div style={{ padding: 16, color: '#666' }}>No items found.</div>
        )}

        {!state.loading && !state.error && items.map((it) => (
          <div
            key={it.id}
            onClick={() => navigate(`/catalog/${it.id}/edit`)}
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 0.8fr 1.2fr',
              padding: '10px 12px',
              borderTop: '1px solid #f1f5f9',
              cursor: 'pointer'
            }}
          >
            <div style={{ fontWeight: 500 }}>{it.name}</div>
            <div style={{ color: '#555', textTransform: 'capitalize' }}>{(it.type || '').toLowerCase()}</div>
            <div>{it.is_active ? 'Yes' : 'No'}</div>
            <div style={{ color: '#555' }}>{fmtDate(it.updated_at || it.created_at)}</div>
          </div>
        ))}
      </div>

      {/* Pagination — match Additions (with First/Last) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
        <div style={{ color: '#666' }}>
          {total} items • Page {page} / {totalPages}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={pageSize}
            onChange={e => updateParams({ pageSize: Number(e.target.value), page: 1 })}
            style={{ padding: '6px 8px', border: '1px solid #ccc', borderRadius: 6 }}
          >
            {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
          </select>
          <button disabled={!canPrev} onClick={() => updateParams({ page: 1 })} style={{ padding: '6px 10px' }}>« First</button>
          <button disabled={!canPrev} onClick={() => updateParams({ page: page - 1 })} style={{ padding: '6px 10px' }}>‹ Prev</button>
          <button disabled={!canNext} onClick={() => updateParams({ page: page + 1 })} style={{ padding: '6px 10px' }}>Next ›</button>
          <button disabled={!canNext} onClick={() => updateParams({ page: totalPages })} style={{ padding: '6px 10px' }}>Last »</button>
        </div>
      </div>
    </div>
  );
}
