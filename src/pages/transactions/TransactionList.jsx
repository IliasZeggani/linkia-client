// client/src/pages/transactions/TransactionsList.jsx
import React from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { listTransactions } from '../../api/transactions.api';

function useDebouncedValue(value, delay = 300) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return v;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'SUCCEEDED', label: 'Succeeded' },
  { value: 'FAILED', label: 'Failed' },
];

export default function TransactionsList() {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();

  // URL state (same pattern as your other lists)
  const page = Number(sp.get('page') || 1);
  const pageSize = Number(sp.get('pageSize') || 25);
  const status = sp.get('status') || '';
  const sort = sp.get('sort') || 'created_at';
  const dir = sp.get('dir') || 'desc';

  const emailRaw = sp.get('email') || '';
  const pageCodeRaw = sp.get('page_code') || '';
  const from = sp.get('from') || '';
  const to = sp.get('to') || '';

  // Local input state so typing doesn't remount the page on every keypress
  const [emailInput, setEmailInput] = React.useState(emailRaw);
  const [pageCodeInput, setPageCodeInput] = React.useState(pageCodeRaw);
  const [fromInput, setFromInput] = React.useState(from);
  const [toInput, setToInput] = React.useState(to);

  // Keep local inputs in sync if URL is changed externally (e.g. Reset)
  React.useEffect(() => { setEmailInput(emailRaw); }, [emailRaw]);
  React.useEffect(() => { setPageCodeInput(pageCodeRaw); }, [pageCodeRaw]);
  React.useEffect(() => { setFromInput(from); }, [from]);
  React.useEffect(() => { setToInput(to); }, [to]);

  const email = useDebouncedValue(emailRaw, 300);
  const page_code = useDebouncedValue(pageCodeRaw, 300);

  // Debounce committing inputs to the URL
  const debouncedEmailInput = useDebouncedValue(emailInput, 300);
  const debouncedPageCodeInput = useDebouncedValue(pageCodeInput, 300);

  // When debounced values change, write them to the URL (and reset to page 1)
  React.useEffect(() => {
    if (debouncedEmailInput !== emailRaw) {
      const next = new URLSearchParams(sp);
      if (debouncedEmailInput) next.set('email', debouncedEmailInput);
      else next.delete('email');
      next.set('page', '1');
      setSp(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedEmailInput]);

  React.useEffect(() => {
    if (debouncedPageCodeInput !== pageCodeRaw) {
      const next = new URLSearchParams(sp);
      if (debouncedPageCodeInput) next.set('page_code', debouncedPageCodeInput);
      else next.delete('page_code');
      next.set('page', '1');
      setSp(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedPageCodeInput]);


  const [state, setState] = React.useState({
    loading: true,
    error: null,
    data: { rows: [], total: 0, page, pageSize },
  });

  const setParam = (key, value) => {
    const next = new URLSearchParams(sp);
    if (value === '' || value == null) next.delete(key);
    else next.set(key, String(value));
    // keep current paging shape
    if (!next.get('page')) next.set('page', String(page));
    if (!next.get('pageSize')) next.set('pageSize', String(pageSize));
    setSp(next, { replace: true });
  };

  // Batch multiple param updates in one navigation (prevents losing the first change)
  const setParams = (updatesOrFn) => {
    const next = new URLSearchParams(sp);
    if (typeof updatesOrFn === 'function') {
      updatesOrFn(next);
    } else {
      Object.entries(updatesOrFn).forEach(([k, v]) => {
        if (v === '' || v == null) next.delete(k);
        else next.set(k, String(v));
      });
    }
    if (!next.get('page')) next.set('page', String(page));
    if (!next.get('pageSize')) next.set('pageSize', String(pageSize));
    setSp(next, { replace: true });
  };


  const onSort = (col) => {
    const isSame = sort === col;
    const nextDir = isSame ? (dir === 'asc' ? 'desc' : 'asc') : 'asc';
    const next = new URLSearchParams(sp);
    next.set('sort', col);
    next.set('dir', nextDir);
    next.set('page', '1');
    setSp(next, { replace: true });
  };

  React.useEffect(() => {
    let cancelled = false;
    setState(s => ({ ...s, loading: true, error: null }));

    listTransactions({ page, pageSize, status, email, page_code, from, to, sort, dir })
      .then(data => {
        if (cancelled) return;
        setState({ loading: false, error: null, data: data || { rows: [], total: 0, page, pageSize } });
      })
      .catch(err => {
        if (cancelled) return;
        setState({ loading: false, error: err?.message || 'Error', data: { rows: [], total: 0, page, pageSize } });
      });

    return () => { cancelled = true; };
  }, [page, pageSize, status, email, page_code, from, to, sort, dir]); // eslint-disable-line

  const { loading, error, data } = state;
  const rows = data.rows || data.items || [];
  const total = Number(data.total || 0);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const SortHeader = ({ label, col, disabled = false }) => {
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
        title={disabled ? '' : 'Sort'}
      >
        {label}{arrow}
      </div>
    );
  };

  const cell = { padding: '10px 12px', borderTop: '1px solid #e5e7eb', verticalAlign: 'top' };
  const th = { ...cell, background: '#f9fafb', fontWeight: 600, cursor: 'default' };

  const fmtMoney = (amt, cur) => {
    if (amt == null || !cur) return '—';
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur }).format(Number(amt)); }
    catch { return `${Number(amt).toFixed(2)} ${cur}`; }
  };
  const fmtDateTime = x => (x ? new Date(x).toLocaleString() : '—');

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>Transactions</h1>
      </div>

      {/* Filters */}
      <div className="card" style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, marginBottom: 12, background: '#fff' }}>
        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'minmax(220px,1fr) 160px minmax(160px,1fr) minmax(160px,1fr) 150px 150px auto' }}>
          <input
            type="text"
            placeholder="Search by email"
            value={emailInput}
            onChange={e => setEmailInput(e.target.value)}
            style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 6 }}
          />
          <select
            value={status}
            onChange={e => setParams({ status: e.target.value, page: 1 })}
            style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 6 }}
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input
            type="text"
            placeholder="Filter by page code"
            value={pageCodeInput}
            onChange={e => setPageCodeInput(e.target.value)}
            style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 6 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="date"
              value={fromInput}
              onChange={e => { const v = e.target.value; setFromInput(v); setParams({ from: v, page: 1 }); }}
              style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 6, width: '100%' }}
            />
            <input
              type="date"
              value={toInput}
              onChange={e => { const v = e.target.value; setToInput(v); setParams({ to: v, page: 1 }); }}
              style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 6, width: '100%' }}
            />
          </div>
          <button
            onClick={() => {
              const next = new URLSearchParams();
              next.set('pageSize', String(pageSize));
              next.set('page', '1');
              setEmailInput('');
              setPageCodeInput('');
              setFromInput('');
              setToInput('');
              setSp(next, { replace: true });
            }}
            style={{ padding: '6px 10px' }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr>
              <th style={th}><SortHeader label="Created" col="created_at" /></th>
              <th style={th}><SortHeader label="Status" col="status" /></th>
              <th style={th}><SortHeader label="Total" col="total_amount" /></th>
              <th style={th}><SortHeader label="Email" col="payer_email" /></th>
              <th style={th}><SortHeader label="Page" col="page_code" /></th>
              <th style={{ ...th, width: 110 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} style={{ ...cell, textAlign: 'center' }}>Loading…</td></tr>
            )}
            {error && !loading && (
              <tr><td colSpan={6} style={{ ...cell, color: '#b91c1c' }}>{String(error)}</td></tr>
            )}
            {!loading && !error && rows.length === 0 && (
              <tr><td colSpan={6} style={{ ...cell, textAlign: 'center' }}>No transactions</td></tr>
            )}
            {!loading && !error && rows.map((tx) => (
              <tr key={tx.id}>
                <td style={cell}>{fmtDateTime(tx.created_at)}</td>
                <td style={cell}>
                  <StatusPill status={tx.status} />
                </td>
                <td style={cell}>{fmtMoney(tx.total_amount, tx.total_currency)}</td>
                <td style={cell}>{tx.payer_email || '—'}</td>
                <td style={cell}>{tx.page_code || '—'}</td>
                <td style={cell}>
                  <Link to={`/transactions/${tx.id}`}>Details</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Paging */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select
              value={pageSize}
              onChange={e => { setParam('pageSize', Number(e.target.value)); setParam('page', 1); }}
              style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 6 }}
            >
              {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>
            <span>Total: {total}</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button disabled={page <= 1} onClick={() => setParam('page', 1)} style={{ padding: '6px 10px' }}>« First</button>
            <button disabled={page <= 1} onClick={() => setParam('page', page - 1)} style={{ padding: '6px 10px' }}>‹ Prev</button>
            <div style={{ padding: '6px 10px' }}>Page {page} / {pages}</div>
            <button disabled={page >= pages} onClick={() => setParam('page', page + 1)} style={{ padding: '6px 10px' }}>Next ›</button>
            <button disabled={page >= pages} onClick={() => setParam('page', pages)} style={{ padding: '6px 10px' }}>Last »</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const s = String(status || '').toUpperCase();
  const color = s === 'SUCCEEDED' ? '#0a7d2a' : s === 'FAILED' ? '#b10000' : '#334155';
  const bg = s === 'SUCCEEDED' ? '#e8f6ed' : s === 'FAILED' ? '#fdeaea' : '#f1f5f9';
  return (
    <span style={{ background: bg, color, padding: '2px 8px', borderRadius: 999, fontSize: 12 }}>
      {s || '—'}
    </span>
  );
}
