// src/pages/emails/EmailOutboxList.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { listEmailOutbox, listEmailTemplates } from '../../api/emails.api';

// debounce helper (same approach you use elsewhere)
function useDebouncedValue(value, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function statusBadge(s) {
  const base = { padding: '2px 8px', borderRadius: 12, fontSize: 12 };
  if (s === 'SENT') {
    return <span style={{ ...base, background: '#e8f5e9', color: '#2e7d32' }}>SENT</span>;
  }
  if (s === 'FAILED') {
    return <span style={{ ...base, background: '#ffebee', color: '#c62828' }}>FAILED</span>;
  }
  return <span style={{ ...base, background: '#eceff1', color: '#455a64' }}>{s || '—'}</span>;
}

export default function EmailOutboxList() {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();

  // URL params with defaults
  const page = parseInt(sp.get('page') || '1', 10);
  const pageSize = parseInt(sp.get('pageSize') || '25', 10);
  const sort = sp.get('sort') || 'sent_at';
  const dir = sp.get('dir') || 'desc';

  const spQ = sp.get('q') || '';
  const status = sp.get('status') || '';          // '' | SENT | FAILED
  const templateId = sp.get('templateId') || '';  // uuid or ''
  const from = sp.get('from') || '';              // YYYY-MM-DD
  const to = sp.get('to') || '';                  // YYYY-MM-DD

  const [q, setQ] = useState(spQ);
  const dq = useDebouncedValue(q);

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  // templates for filter dropdown
  const [tplsLoading, setTplsLoading] = useState(false);
  const [templates, setTemplates] = useState([]);

  // param object
  const params = useMemo(() => ({
    page, pageSize, q: dq, status, templateId, from, to, sort, dir,
  }), [page, pageSize, dq, status, templateId, from, to, sort, dir]);

  // fetch list
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    listEmailOutbox(params)
      .then((res) => {
        if (!mounted) return;
        const rows = Array.isArray(res?.rows) ? res.rows : (Array.isArray(res?.items) ? res.items : []);
        const total = (res?.total ?? res?.count ?? rows.length) || 0;
        setRows(rows);
        setTotal(total);
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [params]);

  // fetch active templates once for dropdown
  useEffect(() => {
    let mounted = true;
    setTplsLoading(true);
    listEmailTemplates({ page: 1, pageSize: 1000, is_active: 'true', sort: 'name', dir: 'asc' })
      .then((res) => {
        if (!mounted) return;
        const items = Array.isArray(res?.rows) ? res.rows : (res?.items || []);
        setTemplates(items);
      })
      .finally(() => mounted && setTplsLoading(false));
    return () => { mounted = false; };
  }, []);

  // helpers to set URL params
  const updateParams = (patch) => {
    const next = new URLSearchParams(sp);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') next.delete(k);
      else next.set(k, String(v));
    });
    // reset page when filters/search/sort change
    if (
      patch.q !== undefined || patch.status !== undefined || patch.templateId !== undefined ||
      patch.from !== undefined || patch.to !== undefined || patch.sort !== undefined || patch.dir !== undefined
    ) {
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
        <h2 style={{ margin: 0 }}>Email Outbox</h2>
      </div>

      {/* Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 240px 150px 150px 120px', gap: 8, marginBottom: 12 }}>
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); updateParams({ q: e.target.value }); }}
          placeholder="Search by recipient or subject…"
          style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6 }}
        />
        <select
          value={status}
          onChange={(e) => updateParams({ status: e.target.value })}
          style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6 }}
        >
          <option value="">All status</option>
          <option value="SENT">SENT</option>
          <option value="FAILED">FAILED</option>
        </select>

        <select
          value={templateId}
          onChange={(e) => updateParams({ templateId: e.target.value })}
          style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6 }}
        >
          <option value="">{tplsLoading ? 'Loading templates…' : 'All templates'}</option>
          <option value="DEFAULT">Default</option>
          {!tplsLoading && templates
            .filter(t => !String(t.id).startsWith('default:')) // exclude virtual default rows
            .map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
        </select>

        <input
          type="date"
          value={from}
          onChange={(e) => updateParams({ from: e.target.value })}
          style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6 }}
        />
        <input
          type="date"
          value={to}
          onChange={(e) => updateParams({ to: e.target.value })}
          style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6 }}
        />

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
        <div style={{
          display: 'grid',
          gridTemplateColumns: '260px 120px 220px 1fr 110px 180px',
          gap: 0, background: '#fafafa', borderBottom: '1px solid #eee'
        }}>
          {[
            { key: 'to_email', label: 'To' },
            { key: 'status', label: 'Status' },
            { key: 'template_name', label: 'Template' }, // fallback to template_id in row render
            { key: 'subject', label: 'Subject' },
            { key: 'attempts', label: 'Attempts' },
            { key: 'sent_at', label: 'Sent At' },
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
            <div style={{ padding: 16 }}>No emails.</div>
          ) : (
            rows.map((r) => (
              <div
                key={r.id}
                onClick={() => navigate(`/emails/outbox/${r.id}`)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '260px 120px 220px 1fr 110px 180px',
                  borderBottom: '1px solid #f2f2f2',
                  padding: '10px 12px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.to_email || '—'}
                </div>
                <div>{statusBadge(r.status)}</div>
                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.template_id
                    ? (r.template_name || templates.find(t => t.id === r.template_id)?.name || r.template_id)
                    : <span style={{ padding: '2px 6px', borderRadius: 10, background: '#eef2ff', color: '#3730a3', fontSize: 11 }}>
                      Default
                    </span>
                  }
                </div>
                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.subject || '—'}
                </div>
                <div>{r.attempts ?? 0}</div>
                <div>{r.sent_at ? new Date(r.sent_at).toLocaleString() : ''}</div>
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
        <div style={{ fontSize: 13 }}>Page {page} / {Math.max(1, Math.ceil(total / pageSize))}</div>
        <button
          onClick={() => updateParams({ page: Math.min(Math.max(1, Math.ceil(total / pageSize)), page + 1) })}
          disabled={page >= Math.max(1, Math.ceil(total / pageSize))}
          style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, background: page >= Math.max(1, Math.ceil(total / pageSize)) ? '#f5f5f5' : '#fff' }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
