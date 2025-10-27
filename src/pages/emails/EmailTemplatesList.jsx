// src/pages/emails/EmailTemplatesList.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { listEmailTemplates } from '../../api/emails.api';

// tiny debounce like your other lists
function useDebouncedValue(value, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function toBoolBadge(v) {
  return v ? (
    <span style={{ padding: '2px 8px', background: '#e8f5e9', color: '#2e7d32', borderRadius: 12, fontSize: 12 }}>Yes</span>
  ) : (
    <span style={{ padding: '2px 8px', background: '#ffebee', color: '#c62828', borderRadius: 12, fontSize: 12 }}>No</span>
  );
}

function isDefaultRow(row) {
  const id = String(row?.id || '');
  return id === 'default:payer' || id === 'default:merchant';
}

export default function EmailTemplatesList() {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();

  // search params (with defaults)
  const page = parseInt(sp.get('page') || '1', 10);
  const pageSize = parseInt(sp.get('pageSize') || '25', 10);
  const sort = sp.get('sort') || 'updated_at';
  const dir = sp.get('dir') || 'desc';
  const kind = sp.get('kind') || 'ALL';
  const active = sp.get('active') || 'ALL';
  const spQ = sp.get('q') || '';

  const [q, setQ] = useState(spQ);
  const dq = useDebouncedValue(q);

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const params = useMemo(() => ({
    page, pageSize, q: dq, kind, active, sort, dir,
  }), [page, pageSize, dq, kind, active, sort, dir]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    listEmailTemplates(params)
      .then((res) => {
        if (!mounted) return;
        // Handle both shapes: {rows,total} and {items,count}
        const rows = Array.isArray(res?.rows) ? res.rows : (Array.isArray(res?.items) ? res.items : []);
        const total = (res?.total ?? res?.count ?? rows.length) || 0;
        setRows(rows);
        setTotal(total);
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [params]);

  // helpers to update URL params uniformly
  const updateParams = (patch) => {
    const next = new URLSearchParams(sp);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') next.delete(k);
      else next.set(k, String(v));
    });
    // reset page when filters/sort search change
    if (patch.q !== undefined || patch.kind !== undefined || patch.active !== undefined || patch.sort !== undefined || patch.dir !== undefined) {
      next.set('page', '1');
    }
    setSp(next, { replace: true });
  };

  const toggleSort = (key) => {
    if (sort === key) {
      updateParams({ sort: key, dir: dir === 'asc' ? 'desc' : 'asc' });
    } else {
      updateParams({ sort: key, dir: 'asc' });
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Email Templates</h2>
        <button
          onClick={() => navigate('/emails/templates/new')}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, background: '#111', color: '#fff' }}
        >
          New Template
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 180px 180px', gap: 8, marginBottom: 12 }}>
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            updateParams({ q: e.target.value });
          }}
          placeholder="Search by name or subject..."
          style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6 }}
        />
        <select
          value={kind}
          onChange={(e) => updateParams({ kind: e.target.value })}
          style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6 }}
        >
          <option value="ALL">All kinds</option>
          <option value="PAYER_RECEIPT">PAYER_RECEIPT</option>
          <option value="MERCHANT_NOTIFY">MERCHANT_NOTIFY</option>
        </select>
        <select
          value={active}
          onChange={(e) => updateParams({ active: e.target.value })}
          style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6 }}
        >
          <option value="ALL">Active: All</option>
          <option value="true">Active: Yes</option>
          <option value="false">Active: No</option>
        </select>
        <select
          value={pageSize}
          onChange={(e) => updateParams({ pageSize: e.target.value })}
          style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6 }}
        >
          {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '320px 180px 1fr 120px 160px', gap: 0, background: '#fafafa', borderBottom: '1px solid #eee' }}>
          {[
            { key: 'name', label: 'Name' },
            { key: 'kind', label: 'Kind' },
            { key: 'subject', label: 'Subject' },
            { key: 'is_active', label: 'Active' },
            { key: 'updated_at', label: 'Updated' },
          ].map((c) => (
            <div
              key={c.key}
              onClick={() => toggleSort(c.key)}
              style={{ padding: '10px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              title="Sort"
            >
              <span>{c.label}</span>
              {sort === c.key ? <span style={{ fontSize: 11, opacity: 0.7 }}>{dir === 'asc' ? '▲' : '▼'}</span> : null}
            </div>
          ))}
        </div>

        {/* Rows */}
        <div>
          {loading ? (
            <div style={{ padding: 16 }}>Loading…</div>
          ) : rows.length === 0 ? (
            <div style={{ padding: 16 }}>No templates found.</div>
          ) : (
            rows.map((r) => (
              <div
                key={r.id}
                onClick={() => navigate(`/emails/templates/${r.id}`)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '320px 180px 1fr 120px 160px',
                  borderBottom: '1px solid #f2f2f2',
                  padding: '10px 12px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.name}
                  {isDefaultRow(r) && (
                    <span style={{
                      marginLeft: 8, fontSize: 11, padding: '2px 6px',
                      background: '#eef2ff', color: '#3730a3', borderRadius: 10
                    }}>
                      Default • Read-only
                    </span>
                  )}
                </div>
                <div>{r.kind}</div>
                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {isDefaultRow(r) ? 'Built-in default preview' : (r.subject || '')}
                </div>
                <div>{toBoolBadge(r.is_active)}</div>
                <div>{r.updated_at ? new Date(r.updated_at).toLocaleString() : ''}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
        <button
          onClick={() => updateParams({ page: Math.max(1, page - 1) })}
          disabled={page <= 1}
          style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, background: page <= 1 ? '#f5f5f5' : '#fff' }}
        >
          Prev
        </button>
        <div style={{ fontSize: 13 }}>Page {page} / {totalPages}</div>
        <button
          onClick={() => updateParams({ page: Math.min(totalPages, page + 1) })}
          disabled={page >= totalPages}
          style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, background: page >= totalPages ? '#f5f5f5' : '#fff' }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
