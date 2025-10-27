// src/pages/pages/PageCreate.jsx
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPage } from '../../api/pages.api';
import { listCatalogItemsExtended } from '../../api/catalog.api'; // << use NEW endpoint
import { listAdditions } from '../../api/additions.api';
import { listEmailTemplates } from '../../api/emails.api';

function useDebouncedValue(value, delay = 300) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return v;
}

function moveRow(list, from, to) {
  if (to < 0 || to >= list.length) return list;
  const next = list.slice();
  const [row] = next.splice(from, 1);
  next.splice(to, 0, row);
  return next;
}

export default function PageCreate() {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();

  // ===== General =====
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [isActive, setIsActive] = React.useState(true);

  // Unlimited: if checked => expires_at = null & max_tx = null
  const [isUnlimited, setIsUnlimited] = React.useState(true);
  const [expiresAt, setExpiresAt] = React.useState(''); // local datetime-local value
  const [maxTx, setMaxTx] = React.useState('');
  const [setPw, setSetPw] = React.useState(false);
  const [pw, setPwVal] = React.useState('');
  const [showPw, setShowPw] = React.useState(false);

  // Email templates (payer & merchant)
  const [tplsLoading, setTplsLoading] = React.useState(true);
  const [templates, setTemplates] = React.useState([]); // [{id,name,kind,is_active}]
  const [payerTplId, setPayerTplId] = React.useState('DEFAULT');
  const [merchantTplId, setMerchantTplId] = React.useState('DEFAULT');

  // Discount caps
  const [capAmountEnabled, setCapAmountEnabled] = React.useState(false);
  const [discountCapAmount, setDiscountCapAmount] = React.useState('');
  const [discountCapCurrency, setDiscountCapCurrency] = React.useState('');
  const [capCountEnabled, setCapCountEnabled] = React.useState(false);
  const [discountCapCount, setDiscountCapCount] = React.useState('');

  // ===== Selected Items (leafs) =====
  const [selectedItems, setSelectedItems] = React.useState([]);  // [{ref_kind, ref_id, label, type_label, price, currency, requirement}]
  const [selectedMap, setSelectedMap] = React.useState({});       // key => true

  // ===== Selected Additions =====
  const [selectedAdditions, setSelectedAdditions] = React.useState([]); // [{id, label, type, value, currency}]
  const [selectedAddMap, setSelectedAddMap] = React.useState({});       // id => true

  // ===== Catalog picker state =====
  const page = Number(sp.get('page') || 1);
  const pageSize = Number(sp.get('pageSize') || 25);
  const qRaw = sp.get('q') || '';
  const sort = sp.get('sort') || 'updated_at';
  const dir = sp.get('dir') || 'desc';
  const q = useDebouncedValue(qRaw, 300);

  const [catState, setCatState] = React.useState({
    loading: true, error: null, data: { total: 0, page, pageSize, rows: [] }
  });

  const setParam = (k, v) => {
    const next = new URLSearchParams(sp);
    next.set(k, String(v));
    if (!next.get('page')) next.set('page', String(page));
    if (!next.get('pageSize')) next.set('pageSize', String(pageSize));
    if (!next.get('sort')) next.set('sort', sort);
    if (!next.get('dir')) next.set('dir', dir);
    setSp(next, { replace: true });
  };

  const onMoveItemUp = (idx) => setSelectedItems(prev => moveRow(prev, idx, idx - 1));
  const onMoveItemDown = (idx) => setSelectedItems(prev => moveRow(prev, idx, idx + 1));

  const onMoveAdditionUp = (idx) => setSelectedAdditions(prev => moveRow(prev, idx, idx - 1));
  const onMoveAdditionDown = (idx) => setSelectedAdditions(prev => moveRow(prev, idx, idx + 1));

  // Fetch flattened catalog rows
  React.useEffect(() => {
    let mounted = true;
    setCatState(s => ({ ...s, loading: true, error: null }));
    listCatalogItemsExtended({ page, pageSize, q, isActive: 'ALL', sort, dir })
      .then(data => {
        if (!mounted) return;
        // rows: [{ ref_kind, ref_id, label, type_label, price, currency, is_active, updated_at }]
        const rows = data.rows || [];
        setCatState({ loading: false, error: null, data: { total: data.total, page: data.page, pageSize: data.pageSize, rows } });
      })
      .catch(err => {
        const msg = err?.response?.data?.error || err.message || 'Error';
        if (mounted) setCatState({ loading: false, error: msg, data: { total: 0, page, pageSize, rows: [] } });
      });
    return () => { mounted = false; };
  }, [page, pageSize, q, sort, dir]);

  // Load active email templates for dropdowns
  React.useEffect(() => {
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

  const makeKey = (r) => `${r.ref_kind}:${r.ref_id}`;

  const toggleSelectLeaf = (row) => {
    const key = `${row.ref_kind}:${row.ref_id}`;
    if (selectedMap[key]) return;
    const next = { ...row, requirement: 'OPTIONAL' }; // keeps row.price & row.currency
    setSelectedItems(s => [...s, next]);
    setSelectedMap(m => ({ ...m, [key]: true }));
  };

  const removeSelectedLeaf = (key) => {
    setSelectedItems(s => s.filter(x => makeKey(x) !== key));
    setSelectedMap(m => { const c = { ...m }; delete c[key]; return c; });
  };

  const bulkSetRequirement = (req) => {
    setSelectedItems(s => s.map(x => ({ ...x, requirement: req })));
  };

  // ===== Additions picker state =====
  const addPage = Number(sp.get('apage') || 1);
  const addPageSize = Number(sp.get('apageSize') || 25);
  const addQRaw = sp.get('aq') || '';
  const addSort = sp.get('asort') || 'updated_at';
  const addDir = sp.get('adir') || 'desc';
  const addQ = useDebouncedValue(addQRaw, 300);

  const [addState, setAddState] = React.useState({
    loading: true, error: null, data: { total: 0, page: addPage, pageSize: addPageSize, rows: [] }
  });

  const setAParam = (k, v) => {
    const next = new URLSearchParams(sp);
    next.set(k, String(v));
    if (!next.get('apage')) next.set('apage', String(addPage));
    if (!next.get('apageSize')) next.set('apageSize', String(addPageSize));
    if (!next.get('asort')) next.set('asort', addSort);
    if (!next.get('adir')) next.set('adir', addDir);
    setSp(next, { replace: true });
  };

  React.useEffect(() => {
    let mounted = true;
    setAddState(s => ({ ...s, loading: true, error: null }));
    listAdditions({ page: addPage, pageSize: addPageSize, q: addQ, type: 'ALL', isActive: 'ALL', sort: addSort, dir: addDir })
      .then(data => {
        const items = (data.items || data.rows || []).map(a => ({
          id: a.id,
          label: a.name,
          type: a.type,
          value: a.value ?? a.amount ?? null,
          currency: a.currency ?? null,
          kind: a.kind || null,                 // <— keep kind
          applies_main_only: !!a.applies_main_only,
        }));
        if (mounted) setAddState({ loading: false, error: null, data: { total: data.total, page: data.page ?? addPage, pageSize: data.pageSize ?? addPageSize, rows: items } });
      })
      .catch(err => {
        const msg = err?.response?.data?.error || err.message || 'Error';
        if (mounted) setAddState({ loading: false, error: msg, data: { total: 0, page: addPage, pageSize: addPageSize, rows: [] } });
      });
    return () => { mounted = false; };
  }, [addPage, addPageSize, addQ, addSort, addDir]);

  const addAddition = (row) => {
    if (selectedAddMap[row.id]) return;
    setSelectedAdditions(s => [...s, row]);
    setSelectedAddMap(m => ({ ...m, [row.id]: true }));
  };

  const removeAddition = (id) => {
    setSelectedAdditions(s => s.filter(x => x.id !== id));
    setSelectedAddMap(m => { const c = { ...m }; delete c[id]; return c; });
  };

  // ===== Submit =====
  const [saving, setSaving] = React.useState(false);
  const onSubmit = async (openAfter = false) => {
    if (!name.trim()) return alert('Name is required.');
    if (selectedItems.length === 0) return alert('Select at least one item.');

    // --- discount caps validation ---
    let payloadDiscountCapAmount = null;
    let payloadDiscountCapCurrency = null;
    let payloadDiscountCapCount = null;

    if (capAmountEnabled) {
      const n = Number(discountCapAmount);
      if (!Number.isFinite(n) || n < 0) return alert('Total discount cap amount must be a non-negative number');
      if (!discountCapCurrency || discountCapCurrency.trim().length !== 3) return alert('Currency must be a 3-letter code');
      payloadDiscountCapAmount = n;
      payloadDiscountCapCurrency = discountCapCurrency.trim().toUpperCase();
    }

    if (capCountEnabled) {
      const c = Number(discountCapCount);
      if (!Number.isInteger(c) || c < 0) return alert('Max discount uses must be a non-negative integer');
      payloadDiscountCapCount = c;
    }

    const payload = {
      name: name.trim(),
      description: description || null,
      is_active: !!isActive,
      // code omitted — server auto-generates
      expires_at: isUnlimited ? null : (expiresAt ? new Date(expiresAt).toISOString() : null),
      max_tx: isUnlimited ? null : (maxTx ? Number(maxTx) : null),
      discount_cap_amount: payloadDiscountCapAmount,
      discount_cap_currency: payloadDiscountCapCurrency,
      discount_cap_count: payloadDiscountCapCount,
      payer_email_template_id: payerTplId,        // 'DEFAULT' or uuid
      merchant_email_template_id: merchantTplId,  // 'DEFAULT' or uuid
      ...(setPw ? { set_password: true, password: pw.trim() } : { set_password: false }),
      items: selectedItems.map((x, i) => ({
        ref_kind: x.ref_kind,
        ref_id: x.ref_id,
        is_required: x.requirement === 'REQUIRED',
        position: i,
      })),
      // backend accepts { id } or { addition_id } — we send { id }
      additions: selectedAdditions.map((a, i) => ({ id: a.id, position: i })),
    };

    // validate early so the saving flag isn't stuck

    try {
      if (setPw && !pw.trim()) {
        alert('Password cannot be empty when Set password is checked.');
        return;
      }
      setSaving(true);
      const out = await createPage(payload);
      navigate(`/pages/${out.id}/edit`, { replace: true });
      if (openAfter && out.code) {
        window.open(`/${out.code}`, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      const msg = e?.response?.data?.error || e.message || 'Failed to create page';
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  // ===== UI =====
  const catRows = catState.data.rows || [];
  const catTotal = Number(catState.data.total || 0);
  const catPages = Math.max(1, Math.ceil(catTotal / pageSize));

  const addRows = addState.data.rows || [];
  const addTotal = Number(addState.data.total || 0);
  const addPages = Math.max(1, Math.ceil(addTotal / addPageSize));

  const keyOf = (r) => `${r.ref_kind}:${r.ref_id}`;

  return (
    <div style={{ padding: 16, display: 'grid', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Pages / New</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={saving} onClick={() => onSubmit(false)} style={{ padding: '8px 12px' }}>Save</button>
          <button disabled={saving} onClick={() => onSubmit(true)} style={{ padding: '8px 12px' }}>Save & open</button>
          <button onClick={() => navigate('/pages')} style={{ padding: '8px 12px' }}>Cancel</button>
        </div>
      </div>

      {/* General */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>General</h3>
        <div style={{ display: 'grid', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 600 }}>Name *</div>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Page name" style={{ width: 420, padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }} />
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>Description</div>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" rows={3} style={{ width: 600, padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }} />
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
              Active
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={isUnlimited} onChange={e => setIsUnlimited(e.target.checked)} />
              Unlimited
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={setPw} onChange={e => setSetPw(e.target.checked)} />
              Set password
            </label>
          </div>
          {!isUnlimited && (
            <div style={{ display: 'flex', gap: 16 }}>
              <div>
                <div style={{ fontWeight: 600 }}>Expiration</div>
                <input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} style={{ padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }} />
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>Max transactions</div>
                <input type="number" min="1" value={maxTx} onChange={e => setMaxTx(e.target.value)} placeholder="e.g. 100" style={{ padding: 8, border: '1px solid #cbd5e1', borderRadius: 6, width: 160 }} />
              </div>
            </div>
          )}
          {setPw && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type={showPw ? 'text' : 'password'}
                value={pw}
                onChange={(e) => setPwVal(e.target.value)}
                placeholder="Page password"
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowPw(v => !v)}>
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
          )}

          {/* Email templates */}
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ fontWeight: 600 }}>Payer Email Template</div>
            <select
              value={payerTplId}
              onChange={(e) => setPayerTplId(e.target.value)}
              disabled={tplsLoading}
              style={{ width: 420, padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }}
            >
              <option value="DEFAULT">Default</option>
              {!tplsLoading && templates
                .filter(t => t.kind === 'PAYER_RECEIPT' && !String(t.id).startsWith('default:'))
                .map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>


            <div style={{ fontWeight: 600, marginTop: 8 }}>Merchant Email Template</div>
            <select
              value={merchantTplId}
              onChange={(e) => setMerchantTplId(e.target.value)}
              disabled={tplsLoading}
              style={{ width: 420, padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }}
            >
              <option value="DEFAULT">Default</option>
              {!tplsLoading && templates
                .filter(t => t.kind === 'MERCHANT_NOTIFY' && !String(t.id).startsWith('default:'))
                .map(t => <option key={t.id} value={t.id}>{t.name}{t.is_active ? '' : ' (inactive)'}</option>)}
            </select>
          </div>

          {/* Discount caps */}
          <div style={{ marginTop: 12 }}>
            <h3 style={{ margin: '8px 0' }}>Discount caps</h3>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={capAmountEnabled}
                onChange={(e) => setCapAmountEnabled(e.target.checked)}
              />
              <span>Cap total discount amount</span>
            </label>

            {capAmountEnabled && (
              <div style={{ display: 'flex', gap: 8, margin: '8px 0 12px' }}>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Amount"
                  value={discountCapAmount}
                  onChange={(e) => setDiscountCapAmount(e.target.value)}
                  style={{ width: 160 }}
                />
                <input
                  type="text"
                  placeholder="Currency (e.g., USD)"
                  value={discountCapCurrency}
                  onChange={(e) => setDiscountCapCurrency(e.target.value.toUpperCase())}
                  style={{ width: 160, textTransform: 'uppercase' }}
                  maxLength={3}
                />
              </div>
            )}

            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={capCountEnabled}
                onChange={(e) => setCapCountEnabled(e.target.checked)}
              />
              <span>Cap number of discount applications</span>
            </label>

            {capCountEnabled && (
              <div style={{ margin: '8px 0 12px' }}>
                <input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="Max discount uses"
                  value={discountCapCount}
                  onChange={(e) => setDiscountCapCount(e.target.value)}
                  style={{ width: 200 }}
                />
              </div>
            )}
          </div>
          <div style={{ color: '#64748b' }}>Code is auto-generated by the server.</div>
        </div>
      </div>

      {/* Items */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, display: 'grid', gap: 10 }}>
        <h3 style={{ marginTop: 0 }}>Items</h3>

        {/* Selected items table */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '8px 10px' }}>
            <div style={{ fontWeight: 600 }}>Selected</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => bulkSetRequirement('REQUIRED')} style={{ padding: '6px 8px' }}>All required</button>
              <button onClick={() => bulkSetRequirement('OPTIONAL')} style={{ padding: '6px 8px' }}>All optional</button>
            </div>
          </div>
          {selectedItems.length === 0 ? (
            <div style={{ padding: 10, color: '#64748b' }}>No items selected.</div>
          ) : (
            selectedItems.map((row, index) => {
              const key = keyOf(row);
              return (
                <div key={key} style={{ display: 'grid', gridTemplateColumns: '2fr 0.9fr 0.9fr 0.7fr', padding: '8px 10px', borderTop: '1px solid #eef2f7' }}>
                  <div>
                    {row.label} {row.price != null && row.currency
                      ? <span style={{ color: '#64748b' }}>• {row.price} {row.currency}</span>
                      : null}
                  </div>
                  <div>{row.type_label}</div>
                  <div>
                    <label style={{ marginRight: 8 }}>
                      <input type="radio" checked={row.requirement === 'OPTIONAL'} onChange={() => setSelectedItems(s => s.map(x => keyOf(x) === key ? { ...x, requirement: 'OPTIONAL' } : x))} />
                      {' '}Optional
                    </label>
                    <label>
                      <input type="radio" checked={row.requirement === 'REQUIRED'} onChange={() => setSelectedItems(s => s.map(x => keyOf(x) === key ? { ...x, requirement: 'REQUIRED' } : x))} />
                      {' '}Required
                    </label>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => onMoveItemUp(index)} disabled={index === 0} title="Move up">↑</button>
                    <button type="button" onClick={() => onMoveItemDown(index)} disabled={index === selectedItems.length - 1} title="Move down">↓</button>
                    <button onClick={() => removeSelectedLeaf(key)} style={{ padding: '6px 8px' }}>Remove</button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Picker table */}
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              placeholder="Search catalog…"
              value={qRaw}
              onChange={e => { setParam('q', e.target.value); setParam('page', 1); }}
              style={{ padding: '8px 10px', minWidth: 260, borderRadius: 6, border: '1px solid #cbd5e1' }}
            />
          </div>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 2fr 0.9fr 0.8fr 0.8fr', padding: '8px 10px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>
              <div>Type</div>
              <div>Name</div>
              <div>Price</div>
              <div>Currency</div>
              <div>Action</div>
            </div>
            {catState.loading ? (
              <div style={{ padding: 10 }}>Loading…</div>
            ) : catState.error ? (
              <div style={{ padding: 10, color: '#b91c1c' }}>{catState.error}</div>
            ) : (catRows.length === 0) ? (
              <div style={{ padding: 10, color: '#64748b' }}>No results.</div>
            ) : (
              catRows.map(row => {
                const key = makeKey(row);
                const disabled = !!selectedMap[key];
                return (
                  <div key={key} style={{ display: 'grid', gridTemplateColumns: '1.4fr 2fr 0.9fr 0.8fr 0.8fr', padding: '8px 10px', borderTop: '1px solid #eef2f7' }}>
                    <div>{row.type_label}</div>
                    <div>{row.label}</div>
                    <div>{row.price != null ? row.price : '—'}</div>
                    <div>{row.currency || '—'}</div>
                    <div>
                      <button disabled={disabled} onClick={() => toggleSelectLeaf(row)} style={{ padding: '6px 8px' }}>
                        {disabled ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Catalog pagination */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ color: '#64748b' }}>{catTotal} rows • Page {page} / {catPages}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={pageSize} onChange={e => { setParam('pageSize', Number(e.target.value)); setParam('page', 1); }} style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 6 }}>
                {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
              </select>
              <button disabled={page <= 1} onClick={() => setParam('page', 1)} style={{ padding: '6px 10px' }}>« First</button>
              <button disabled={page <= 1} onClick={() => setParam('page', page - 1)} style={{ padding: '6px 10px' }}>‹ Prev</button>
              <button disabled={page >= catPages} onClick={() => setParam('page', page + 1)} style={{ padding: '6px 10px' }}>Next ›</button>
              <button disabled={page >= catPages} onClick={() => setParam('page', catPages)} style={{ padding: '6px 10px' }}>Last »</button>
            </div>
          </div>
        </div>
      </div>

      {/* Additions */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, display: 'grid', gap: 10 }}>
        <h3 style={{ marginTop: 0 }}>Additions</h3>

        {/* Selected additions table */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 0.8fr 0.6fr', padding: '8px 10px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>
            <div>Name</div>
            <div>Type</div>
            <div>Value</div>
            <div>Main only</div>
            <div>Action</div>
          </div>
          {selectedAdditions.length === 0 ? (
            <div style={{ padding: 10, color: '#64748b' }}>No additions selected.</div>
          ) : selectedAdditions.map((a, index) => (
            <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 0.8fr 0.6fr', padding: '8px 10px', borderTop: '1px solid #eef2f7' }}>
              <div>{a.label}</div>
              <div>{a.type}</div>
              <div>
                {a.value != null
                  ? (a.kind === 'PERCENT' ? `${a.value}%` : `${a.value}${a.currency ? ' ' + a.currency : ''}`)
                  : '—'}
              </div>
              <div>{a.applies_main_only ? 'Yes' : 'No'}</div>
              <div style={{ textAlign: 'right', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => onMoveAdditionUp(index)} disabled={index === 0} title="Move up">↑</button>
                <button type="button" onClick={() => onMoveAdditionDown(index)} disabled={index === selectedAdditions.length - 1} title="Move down">↓</button>
                <button onClick={() => removeAddition(a.id)} style={{ padding: '6px 8px' }}>Remove</button>
              </div>
            </div>
          ))}
        </div>


        {/* Picker table */}
        <AdditionsPicker
          addQRaw={addQRaw}
          setAParam={setAParam}
          addRows={addRows}
          addState={addState}
          addPage={addPage}
          addPageSize={addPageSize}
          addPages={addPages}
          addTotal={addTotal}
          addAddition={addAddition}
        />
      </div>
    </div>
  );
}

function AdditionsPicker({
  addQRaw, setAParam,
  addRows, addState,
  addPage, addPageSize, addPages, addTotal,
  addAddition,
}) {
  return (
    <>
      <div>
        <input
          placeholder="Search additions…"
          value={addQRaw}
          onChange={e => { setAParam('aq', e.target.value); setAParam('apage', 1); }}
          style={{ padding: '8px 10px', minWidth: 260, borderRadius: 6, border: '1px solid #cbd5e1' }}
        />
      </div>
      <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 0.8fr 0.6fr', padding: '8px 10px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>
          <div>Name</div>
          <div>Type</div>
          <div>Value</div>
          <div>Main only</div>
          <div>Action</div>
        </div>
        {addState.loading ? (
          <div style={{ padding: 10 }}>Loading…</div>
        ) : addState.error ? (
          <div style={{ padding: 10, color: '#b91c1c' }}>{addState.error}</div>
        ) : addRows.length === 0 ? (
          <div style={{ padding: 10, color: '#64748b' }}>No results.</div>
        ) : (
          addRows.map(r => (
            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 0.8fr 0.6fr', padding: '8px 10px', borderTop: '1px solid #eef2f7' }}>
              <div>{r.label}</div>
              <div>{r.type}</div>
              <div>
                {r.value != null
                  ? (r.kind === 'PERCENT' ? `${r.value}%` : `${r.value}${r.currency ? ' ' + r.currency : ''}`)
                  : '—'}
              </div>
              <div>{r.applies_main_only ? 'Yes' : 'No'}</div>
              <div style={{ textAlign: 'right' }}>
                <button onClick={() => addAddition(r)} style={{ padding: '6px 8px' }}>Select</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Additions pagination */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ color: '#64748b' }}>{addTotal} rows • Page {addPage} / {addPages}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={addPageSize} onChange={e => { setAParam('apageSize', Number(e.target.value)); setAParam('apage', 1); }} style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 6 }}>
            {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
          </select>
          <button disabled={addPage <= 1} onClick={() => setAParam('apage', 1)} style={{ padding: '6px 10px' }}>« First</button>
          <button disabled={addPage <= 1} onClick={() => setAParam('apage', addPage - 1)} style={{ padding: '6px 10px' }}>‹ Prev</button>
          <button disabled={addPage >= addPages} onClick={() => setAParam('apage', addPage + 1)} style={{ padding: '6px 10px' }}>Next ›</button>
          <button disabled={addPage >= addPages} onClick={() => setAParam('apage', addPages)} style={{ padding: '6px 10px' }}>Last »</button>
        </div>
      </div>
    </>
  );
}
