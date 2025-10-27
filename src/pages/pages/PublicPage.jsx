// src/pages/pages/PublicPage.jsx
import React from 'react';
import { useParams } from 'react-router-dom';
import { getPublicPageByCode, lookupPublicDiscount, createPublicTransaction } from '../../api/pages.api';

// safest helpers for amounts
function toNumber(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

// sign helper by type
function signedAmount(type, raw) {
  const t = (type || '').toUpperCase();
  if (t === 'DISCOUNT' || t === 'PROMOTION') return -Math.abs(raw);
  if (t === 'TAXFEE') return Math.abs(raw);
  return 0;
}

// compute one line against a given base, respecting kind
function computeLineAmount(add, base) {
  const kind = (add.kind || '').toUpperCase();   // 'PERCENT' | 'AMOUNT'
  const amt = Number(add.amount) || 0;
  let line = 0;
  if (kind === 'PERCENT') {
    line = Math.round((base * (amt / 100)) * 100) / 100; // 2 decimals
  } else {
    line = Math.round(amt * 100) / 100;                  // fixed amount, 2 decimals
  }
  return signedAmount(add.type, line);
}

// run group in sequence (respect position) starting from base
function runGroupSequenced(groupSorted, baseStart) {
  let running = baseStart;
  const lines = [];
  for (const a of groupSorted) {
    const delta = computeLineAmount(a, running);
    running += delta;
    lines.push({ ...a, _amount: delta });
  }
  return { lines, end: running };
}

export default function PublicPage() {
  const { code } = useParams();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [needsPassword, setNeedsPassword] = React.useState(false);
  const [pw, setPw] = React.useState('');
  const [pwErr, setPwErr] = React.useState(null);

  // page details
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');

  // items from server (required/optional + price/currency + stable ids)
  const [items, setItems] = React.useState([]); // [{ ref_kind, ref_id, label, is_required, price, currency, position }]
  const [additions, setAdditions] = React.useState([]); // [{ id, name, type, kind, amount, currency, applies_main_only, position, code_used? }]

  // selection state: key = `${ref_kind}:${ref_id}` -> boolean
  const [selected, setSelected] = React.useState({});

  // discount input + applied discounts
  const [discountInput, setDiscountInput] = React.useState('');
  const [discountError, setDiscountError] = React.useState(null);
  const [discountLoading, setDiscountLoading] = React.useState(false);

  // Discount caps (display only)
  const [capAmount, setCapAmount] = React.useState(null);
  const [capCurrency, setCapCurrency] = React.useState(null);
  const [capCount, setCapCount] = React.useState(null);

  // Email input for payer
  const [payerEmail, setPayerEmail] = React.useState('');
  const [payerEmailErr, setPayerEmailErr] = React.useState(null);

  // Pay request state
  const [paying, setPaying] = React.useState(false);
  const [payErr, setPayErr] = React.useState(null);
  const [receipt, setReceipt] = React.useState(null); // { id, status, total_amount, total_currency }

  // Load page
  React.useEffect(() => {
    let mounted = true;
    setLoading(true); setError(null);
    setNeedsPassword(false); setPwErr(null);
    setReceipt(null); setPayErr(null);

    (async () => {
      try {
        // First attempt without password
        const data = await getPublicPageByCode(code);

        if (!mounted) return;
        setTitle(data.name || data.title || '');
        setDescription(data.description || '');
        setCapAmount(data.discount_cap_amount ?? null);
        setCapCurrency(data.discount_cap_currency ?? null);
        setCapCount(data.discount_cap_count ?? null);

        // Items
        const its = (data.items || [])
          .map((it) => ({
            ref_kind: it.ref_kind,
            ref_id: it.ref_id,
            label: it.label ?? '(no label)',
            is_required: !!it.is_required,
            price: toNumber(it.price),
            currency: it.currency || it.curr || null,
            position: Number.isInteger(it.position) ? it.position : null,
          }))
          .sort((a, b) => {
            const ax = Number.isInteger(a.position) ? a.position : 1e9;
            const bx = Number.isInteger(b.position) ? b.position : 1e9;
            return ax - bx || a.ref_kind.localeCompare(b.ref_kind) || a.ref_id.localeCompare(b.ref_id);
          });
        setItems(its);

        // Default selection: required items checked
        const sel = {};
        for (const r of its) if (r.is_required) sel[`${r.ref_kind}:${r.ref_id}`] = true;
        setSelected(sel);

        // Additions
        const adds = (data.additions || [])
          .map(a => ({
            id: a.id,
            name: a.name,
            type: (a.type || '').toUpperCase(),           // 'DISCOUNT' | 'TAXFEE' | 'PROMOTION'
            kind: (a.kind || '').toUpperCase(),           // 'PERCENT' | 'AMOUNT'
            amount: a.amount ?? a.value ?? null,          // numeric
            currency: a.currency ?? null,                 // null for PERCENT
            applies_main_only: !!a.applies_main_only,
            position: Number.isInteger(a.position) ? a.position : null,
          }))
          .sort((a, b) => {
            const ax = Number.isInteger(a.position) ? a.position : 1e9;
            const bx = Number.isInteger(b.position) ? b.position : 1e9;
            return ax - bx || a.id.localeCompare(b.id);
          });
        setAdditions(adds);

      } catch (e) {
        const msg = e?.response?.data?.error || e.message || 'Failed to load.';
        if (/password required/i.test(msg)) {
          if (mounted) { setNeedsPassword(true); setLoading(false); }
        } else {
          setError(msg);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [code]);

  async function handleUnlock(e) {
    e.preventDefault();
    setPwErr(null);
    try {
      setLoading(true);
      const data = await getPublicPageByCode(code, { password: pw });
      setCapAmount(data.discount_cap_amount ?? null);
      setCapCurrency(data.discount_cap_currency ?? null);
      setCapCount(data.discount_cap_count ?? null);

      setTitle(data.name || data.title || '');
      setDescription(data.description || '');
      const its = (data.items || [])
        .map((it) => ({
          ref_kind: it.ref_kind,
          ref_id: it.ref_id,
          label: it.label ?? '(no label)',
          is_required: !!it.is_required,
          price: toNumber(it.price),
          currency: it.currency || it.curr || null,
          position: Number.isInteger(it.position) ? it.position : null,
        }))
        .sort((a, b) => {
          const ax = Number.isInteger(a.position) ? a.position : 1e9;
          const bx = Number.isInteger(b.position) ? b.position : 1e9;
          return ax - bx || a.ref_kind.localeCompare(b.ref_kind) || a.ref_id.localeCompare(b.ref_id);
        });
      setItems(its);
      const sel = {}; for (const r of its) if (r.is_required) sel[`${r.ref_kind}:${r.ref_id}`] = true;
      setSelected(sel);
      const adds = (data.additions || [])
        .map(a => ({
          id: a.id,
          name: a.name,
          type: (a.type || '').toUpperCase(),
          kind: (a.kind || '').toUpperCase(),
          amount: a.amount ?? a.value ?? null,
          currency: a.currency ?? null,
          applies_main_only: !!a.applies_main_only,
          position: Number.isInteger(a.position) ? a.position : null,
        }))
        .sort((a, b) => {
          const ax = Number.isInteger(a.position) ? a.position : 1e9;
          const bx = Number.isInteger(b.position) ? b.position : 1e9;
          return ax - bx || a.id.localeCompare(b.id);
        });
      setAdditions(adds);
      setNeedsPassword(false);
    } catch (err) {
      const m = err?.response?.data?.error || err.message || 'Invalid password';
      setPwErr(m);
    } finally {
      setLoading(false);
    }
  }

  const toggle = (rk, id, disabled) => {
    if (disabled) return;
    const k = `${rk}:${id}`;
    setSelected((s) => ({ ...s, [k]: !s[k] }));
  };

  const discountCapReached = React.useMemo(
    () => capCount != null && Number(capCount) === 0,
    [capCount]
  );

  async function handleApplyDiscount(e) {
    e.preventDefault();

    const codeInput = (discountInput || '').trim();
    if (!codeInput) return;

    if (capCount != null && Number(capCount) === 0) {
      setDiscountError('Discount limit reached for this page');
      return;
    }

    setDiscountLoading(true);
    setDiscountError(null);
    try {
      const disc = await lookupPublicDiscount(code, codeInput);

      // Enforce single discount code (optional): replace previous discounts
      setAdditions((prev) => {
        const withoutPrevDiscounts = prev.filter(a => (a.type || '').toUpperCase() !== 'DISCOUNT');
        return withoutPrevDiscounts.concat({
          id: disc.id,
          name: disc.name,
          type: (disc.type || '').toUpperCase(),   // DISCOUNT
          kind: (disc.kind || '').toUpperCase(),   // PERCENT | AMOUNT
          amount: disc.amount,
          currency: disc.currency ?? null,
          applies_main_only: !!disc.applies_main_only,
          position: Number.isInteger(disc.position) ? disc.position : null,
          code_used: codeInput,                    // keep the original code to send to backend
        });
      });
      setDiscountInput('');
    } catch (err) {
      setDiscountError(err?.response?.data?.error || err.message || 'Invalid discount code');
    } finally {
      setDiscountLoading(false);
    }
  }

  // Computed helpers
  const discounts = React.useMemo(
    () => additions.filter(a => (a.type || '').toUpperCase() === 'DISCOUNT'),
    [additions]
  );

  function handleRemoveDiscount(id) {
    setAdditions(prev =>
      prev.filter(a => !((a.type || '').toUpperCase() === 'DISCOUNT' && a.id === id))
    );
  }

  // Compute pricing (sequenced & grouped)
  const selectedRows = items.filter(r => selected[`${r.ref_kind}:${r.ref_id}`]);

  const subtotalAll = selectedRows.reduce((acc, r) => acc + toNumber(r.price), 0);
  const subtotalMain = selectedRows
    .filter(r => r.is_required)
    .reduce((acc, r) => acc + toNumber(r.price), 0);

  // split & order by position (null/undefined at the end)
  const excl = additions
    .filter(a => !!a.applies_main_only)
    .sort((a, b) => {
      const ax = Number.isInteger(a.position) ? a.position : 1e9;
      const bx = Number.isInteger(b.position) ? b.position : 1e9;
      return ax - bx || a.id.localeCompare(b.id);
    });

  const incl = additions
    .filter(a => !a.applies_main_only)
    .sort((a, b) => {
      const ax = Number.isInteger(a.position) ? a.position : 1e9;
      const bx = Number.isInteger(b.position) ? b.position : 1e9;
      return ax - bx || a.id.localeCompare(b.id);
    });

  // 1) run “Items only (exclude additions)” against required-items subtotal
  const seqExcl = runGroupSequenced(excl, subtotalMain);

  // 2) run “Items + additions” against (all items + excl results so far)
  const baseForIncl = subtotalAll + seqExcl.lines.reduce((s, x) => s + x._amount, 0);
  const subtotalAfterExcl = subtotalAll + seqExcl.lines.reduce((s, x) => s + x._amount, 0);
  const seqIncl = runGroupSequenced(incl, baseForIncl);

  // final total is the end of the second sequence, clamped at zero
  const total = Math.max(0, seqIncl.end);

  // Submit transaction
  async function handlePay(e) {
    e.preventDefault();
    setPayErr(null);
    setReceipt(null);

    // simple email check
    const email = (payerEmail || '').trim();
    if (!email) {
      setPayerEmailErr('Email is required');
      return;
    }
    // (optional) basic pattern
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setPayerEmailErr('Enter a valid email');
      return;
    }
    setPayerEmailErr(null);

    // selections map
    const selections = {};
    for (const r of items) {
      const k = `${r.ref_kind}:${r.ref_id}`;
      selections[k] = !!selected[k];
    }

    // Only one discount code is allowed server-side; send the first if present
    const discountCode = discounts[0]?.code_used || null;

    try {
      setPaying(true);
      const res = await createPublicTransaction(code, {
        email,
        selections,
        discountCode,
      });
      setReceipt(res); // { id, status, total_amount, total_currency }
    } catch (err) {
      setPayErr(err?.response?.data?.error || err.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  }

  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;
  if (error) return <div style={{ padding: 16, color: '#b91c1c' }}>{error}</div>;
  if (needsPassword) {
    return (
      <div style={{ padding: 16, maxWidth: 480, margin: '64px auto', border: '1px solid #e2e8f0', borderRadius: 12 }}>
        <h2 style={{ marginTop: 0 }}>This page is protected</h2>
        <form onSubmit={handleUnlock} style={{ display: 'grid', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 600 }}>Password</div>
            <input
              type="password"
              value={pw}
              onChange={e => setPw(e.target.value)}
              placeholder="Enter password"
              style={{ width: '100%', padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }}
            />
            {pwErr && <div style={{ color: '#b91c1c', fontSize: 12, marginTop: 6 }}>{pwErr}</div>}
          </div>
          <button
            type="submit"
            style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#111827', color: '#fff' }}
          >
            Unlock
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 980, margin: '0 auto', display: 'grid', gap: 16 }}>
      {/* Title & description */}
      <div>
        <h1 style={{ margin: '0 0 8px' }}>{title}</h1>
        {description ? <p style={{ margin: 0, color: '#475569', whiteSpace: 'pre-wrap' }}>{description}</p> : null}
      </div>

      {/* Receipt */}
      {receipt && (
        <div style={{ border: '1px solid #10b981', background: '#ecfdf5', color: '#065f46', borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Payment recorded</div>
          <div style={{ fontSize: 14 }}>
            Status: <strong>{receipt.status}</strong><br />
            Total: <strong>{Number(receipt.total_amount).toFixed(2)} {receipt.total_currency}</strong><br />
            Ref:&nbsp;
            <span title={receipt.id} style={{ fontFamily: 'monospace' }}>
              {String(receipt.id).slice(0, 8)}…{String(receipt.id).slice(-6)}
            </span>
          </div>
        </div>
      )}

      {!receipt ? (
        // ---------- BEFORE PAYMENT (existing two-column UI) ----------
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
          {/* Items list */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ background: '#f8fafc', padding: '10px 12px', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>Items</div>
            {items.length === 0 ? (
              <div style={{ padding: 12, color: '#64748b' }}>No items available.</div>
            ) : items.map((r) => {
              const key = `${r.ref_kind}:${r.ref_id}`;
              const checked = !!selected[key];
              const disabled = r.is_required;
              return (
                <label key={key} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, alignItems: 'center', padding: '10px 12px', borderTop: '1px solid #eef2f7', cursor: disabled ? 'not-allowed' : 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggle(r.ref_kind, r.ref_id, disabled)}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>{r.label}</div>
                    {disabled ? <div style={{ fontSize: 12, color: '#64748b' }}>Required</div> : null}
                  </div>
                  <div style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {r.price != null ? `${r.price.toFixed ? r.price.toFixed(2) : r.price} ${r.currency || ''}` : '—'}
                  </div>
                </label>
              );
            })}
          </div>

          {/* Checkout */}
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ background: '#f8fafc', padding: '10px 12px', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>Checkout</div>

              {/* Selected items */}
              <div style={{ padding: 12, display: 'grid', gap: 8 }}>
                {selectedRows.length === 0 ? (
                  <div style={{ color: '#64748b' }}>No items selected.</div>
                ) : selectedRows.map((r) => (
                  <div key={`${r.ref_kind}:${r.ref_id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ color: '#0f172a' }}>{r.label}</div>
                    <div style={{ fontVariantNumeric: 'tabular-nums' }}>{r.price != null ? `${r.price.toFixed ? r.price.toFixed(2) : r.price} ${r.currency || ''}` : '—'}</div>
                  </div>
                ))}
              </div>

              {/* Subtotal */}
              <div style={{ padding: '8px 12px', borderTop: '1px solid #eef2f7', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                <div>Subtotal</div>
                <div style={{ fontVariantNumeric: 'tabular-nums' }}>{subtotalAll.toFixed(2)}</div>
              </div>

              {/* Items-only additions */}
              {seqExcl.lines.length > 0 && (
                <div style={{ padding: '8px 12px', borderTop: '1px solid #eef2f7', display: 'grid', gap: 6 }}>
                  {seqExcl.lines.map((a) => {
                    const sign = a._amount >= 0 ? '+' : '−';
                    const absAmt = Math.abs(a._amount).toFixed(2);
                    const percentDetail = a.kind === 'PERCENT' ? ` • ${Number(a.amount || 0).toFixed(2)}%` : '';
                    return (
                      <div key={`ex-${a.id}`} style={{
                        display: 'flex', justifyContent: 'space-between',
                        color: (a.type === 'DISCOUNT' || a.type === 'PROMOTION') ? '#b91c1c' : '#0f172a'
                      }}>
                        <div>
                          <strong>{a.name}</strong>
                          <span style={{ fontSize: 12, color: '#64748b' }}> • Items only{percentDetail}</span>
                        </div>
                        <div style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {sign} {absAmt}{a.currency ? ` ${a.currency}` : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Discount caps (info) */}
              {(capAmount != null && capCurrency) || (capCount != null) ? (
                <div style={{ padding: '8px 12px', borderTop: '1px solid #eef2f7', fontSize: 12, color: '#475569', display: 'grid', gap: 4 }}>
                  {capAmount != null && capCurrency ? (
                    <div>Max total discount: <strong>{Number(capAmount).toFixed(2)} {capCurrency}</strong></div>
                  ) : null}
                  {capCount != null ? (
                    <div>Max discount applications: <strong>{capCount}</strong></div>
                  ) : null}
                </div>
              ) : null}

              {/* Discount code form */}
              {!receipt && (
                <div style={{ padding: 12, borderTop: '1px solid #eef2f7' }}>
                  <form onSubmit={handleApplyDiscount} style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value)}
                      placeholder="Discount code"
                      disabled={discountCapReached || discountLoading}
                      style={{ flex: 1, padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }}
                    />
                    <button
                      type="submit"
                      disabled={discountLoading || !discountInput.trim() || discountCapReached}
                      style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#111827', color: '#fff' }}
                    >
                      {discountLoading ? 'Checking…' : 'Apply'}
                    </button>
                    {discountCapReached && (
                      <div style={{ marginTop: 6, color: '#b91c1c', fontSize: 12 }}>
                        Discount limit reached for this page.
                      </div>
                    )}
                  </form>
                  {discountError && (
                    <div style={{ marginTop: 6, color: '#b91c1c', fontSize: 12 }}>
                      {discountError}
                    </div>
                  )}
                </div>
              )}

              {/* Subtotal after items-only additions */}
              <div
                style={{
                  padding: '8px 12px',
                  borderTop: '1px solid #eef2f7',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 600,
                }}
              >
                <div>Subtotal after items-only additions</div>
                <div style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {baseForIncl.toFixed(2)}
                </div>
              </div>

              {discounts.length > 0 && (
                <div style={{ padding: 12, borderTop: '1px solid #eef2f7', display: 'grid', gap: 8 }}>
                  <div style={{
                    fontSize: 12, color: '#475569', textTransform: 'uppercase',
                    letterSpacing: 0.5, fontWeight: 600
                  }}>
                    Applied discount
                  </div>

                  {discounts.map(d => (
                    <div
                      key={d.id}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 10px', border: '1px dashed #cbd5e1', borderRadius: 8
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontWeight: 600 }}>{d.name}</span>
                        <span style={{ fontSize: 12, color: '#64748b' }}>
                          {(d.kind || '').toUpperCase() === 'PERCENT'
                            ? `-${Number(d.amount).toFixed(2)}%`
                            : `-${Number(d.amount).toFixed(2)} ${d.currency || ''}`
                          }
                          {d.applies_main_only ? ' · main only' : ''}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveDiscount(d.id)}
                        aria-label={`Remove ${d.name}`}
                        title="Remove"
                        style={{
                          border: '1px solid #e2e8f0', background: '#fff',
                          borderRadius: 999, width: 28, height: 28,
                          lineHeight: '26px', textAlign: 'center', cursor: 'pointer'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Additions on Items + prior additions */}
              {seqIncl.lines.length > 0 && (
                <div style={{ padding: 12, display: 'grid', gap: 6, borderTop: '1px solid #eef2f7' }}>
                  {seqIncl.lines.map((a) => {
                    const sign = a._amount >= 0 ? '+' : '−';
                    const absAmt = Math.abs(a._amount).toFixed(2);
                    const percentDetail = a.kind === 'PERCENT' ? ` • ${Number(a.amount || 0).toFixed(2)}%` : '';
                    return (
                      <div key={`in-${a.id}`} style={{
                        display: 'flex', justifyContent: 'space-between',
                        color: (a.type === 'DISCOUNT' || a.type === 'PROMOTION') ? '#b91c1c' : '#0f172a'
                      }}>
                        <div>
                          <strong>{a.name}</strong>
                          <span style={{ fontSize: 12, color: '#64748b' }}> • Items + additions{percentDetail}</span>
                        </div>
                        <div style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {sign} {absAmt}{a.currency ? ` ${a.currency}` : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Total */}
              <div style={{ padding: '10px 12px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                <div>Total</div>
                <div style={{ fontVariantNumeric: 'tabular-nums' }}>{total.toFixed(2)}</div>
              </div>
            </div>

            {/* Payment form */}
            <form onSubmit={handlePay} style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ background: '#f8fafc', padding: '10px 12px', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>Payment</div>
              <div style={{ padding: 12, display: 'grid', gap: 10 }}>
                {/* Email */}
                <div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Email</div>
                  <input
                    value={payerEmail}
                    onChange={(e) => setPayerEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={{ width: '100%', padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }}
                    disabled={paying}
                  />
                  {payerEmailErr && <div style={{ marginTop: 6, color: '#b91c1c', fontSize: 12 }}>{payerEmailErr}</div>}
                </div>

                {/* Fake card fields (display only) */}
                <div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Card number</div>
                  <input placeholder="4242 4242 4242 4242" style={{ width: '100%', padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} disabled />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Expiry</div>
                    <input placeholder="MM / YY" style={{ width: '100%', padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} disabled />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>CVC</div>
                    <input placeholder="CVC" style={{ width: '100%', padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} disabled />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Name on card</div>
                  <input placeholder="John Doe" style={{ width: '100%', padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} disabled />
                </div>

                <button
                  type="submit"
                  disabled={paying || selectedRows.length === 0 || !payerEmail.trim()}
                  style={{ marginTop: 4, padding: '10px 12px', borderRadius: 8, border: '1px solid #0ea5e9', background: '#0ea5e9', color: 'white', fontWeight: 600, opacity: paying ? 0.7 : 1 }}
                >
                  {paying ? 'Saving…' : 'Pay'}
                </button>

                {/* Result / errors */}
                {payErr && <div style={{ fontSize: 12, color: '#b91c1c' }}>{payErr}</div>}
                {receipt && (
                  <div style={{ padding: 10, border: '1px solid #10b981', background: '#ecfdf5', color: '#065f46', borderRadius: 8 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Payment recorded</div>
                    <div style={{ fontSize: 14 }}>
                      Status: <strong>{receipt.status}</strong><br />
                      Total: <strong>{Number(receipt.total_amount).toFixed(2)} {receipt.total_currency}</strong><br />
                      Ref: <span title={receipt.id} style={{ fontFamily: 'monospace' }}>
                        {String(receipt.id).slice(0, 8)}…{String(receipt.id).slice(-6)}
                      </span>
                    </div>
                  </div>
                )}

                <div style={{ fontSize: 12, color: '#64748b' }}>(Demo form — not processing cards; saves transaction server-side)</div>
              </div>
            </form>
          </div>
        </div>
      ) : (
        // ---------- AFTER PAYMENT (read-only summary) ----------
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ background: '#f8fafc', padding: '10px 12px', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>
              Checkout summary
            </div>

            {/* Selected items (read-only — reuse selectedRows) */}
            <div style={{ padding: 12, display: 'grid', gap: 8 }}>
              {selectedRows.length === 0 ? (
                <div style={{ color: '#64748b' }}>No items selected.</div>
              ) : selectedRows.map((r) => (
                <div key={`${r.ref_kind}:${r.ref_id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ color: '#0f172a' }}>{r.label}</div>
                  <div style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {r.price != null ? `${r.price.toFixed ? r.price.toFixed(2) : r.price} ${r.currency || ''}` : '—'}
                  </div>
                </div>
              ))}
            </div>

            {/* Subtotal */}
            <div style={{ padding: '8px 12px', borderTop: '1px solid #eef2f7', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
              <div>Subtotal</div>
              <div style={{ fontVariantNumeric: 'tabular-nums' }}>{subtotalAll.toFixed(2)}</div>
            </div>

            {/* Items-only additions (seqExcl) */}
            {seqExcl.lines.length > 0 && (
              <div style={{ padding: '8px 12px', borderTop: '1px solid #eef2f7', display: 'grid', gap: 6 }}>
                {seqExcl.lines.map((a) => {
                  const sign = a._amount >= 0 ? '+' : '−';
                  const absAmt = Math.abs(a._amount).toFixed(2);
                  const percentDetail = a.kind === 'PERCENT' ? ` • ${Number(a.amount || 0).toFixed(2)}%` : '';
                  return (
                    <div key={`ex-${a.id}`} style={{
                      display: 'flex', justifyContent: 'space-between',
                      color: (a.type === 'DISCOUNT' || a.type === 'PROMOTION') ? '#b91c1c' : '#0f172a'
                    }}>
                      <div>
                        <strong>{a.name}</strong>
                        <span style={{ fontSize: 12, color: '#64748b' }}> • Items only{percentDetail}</span>
                      </div>
                      <div style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {sign} {absAmt}{a.currency ? ` ${a.currency}` : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Subtotal after items-only additions */}
            <div
              style={{
                padding: '8px 12px',
                borderTop: '1px solid #eef2f7',
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 600,
              }}
            >
              <div>Subtotal after items-only additions</div>
              <div style={{ fontVariantNumeric: 'tabular-nums' }}>
                {baseForIncl.toFixed(2)}
              </div>
            </div>


            {/* Additions on Items + prior additions (seqIncl) */}
            {seqIncl.lines.length > 0 && (
              <div style={{ padding: 12, display: 'grid', gap: 6, borderTop: '1px solid #eef2f7' }}>
                {seqIncl.lines.map((a) => {
                  const sign = a._amount >= 0 ? '+' : '−';
                  const absAmt = Math.abs(a._amount).toFixed(2);
                  const percentDetail = a.kind === 'PERCENT' ? ` • ${Number(a.amount || 0).toFixed(2)}%` : '';
                  return (
                    <div key={`in-${a.id}`} style={{
                      display: 'flex', justifyContent: 'space-between',
                      color: (a.type === 'DISCOUNT' || a.type === 'PROMOTION') ? '#b91c1c' : '#0f172a'
                    }}>
                      <div>
                        <strong>{a.name}</strong>
                        <span style={{ fontSize: 12, color: '#64748b' }}> • Items + additions{percentDetail}</span>
                      </div>
                      <div style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {sign} {absAmt}{a.currency ? ` ${a.currency}` : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Total */}
            <div style={{ padding: '10px 12px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
              <div>Total</div>
              <div style={{ fontVariantNumeric: 'tabular-nums' }}>{total.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
