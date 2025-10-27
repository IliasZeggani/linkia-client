// src/pages/pages/PageEdit.jsx
import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getPageDetails, updatePage } from '../../api/pages.api';
import { listCatalogItemsExtended } from '../../api/catalog.api';
import { listAdditions } from '../../api/additions.api';
import { listEmailTemplates } from '../../api/emails.api';

function useDebouncedValue(value, delay = 300) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return v;
}

function isoToLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  // Pad to "YYYY-MM-DDTHH:MM"
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function moveRow(list, from, to) {
  if (to < 0 || to >= list.length) return list;
  const next = list.slice();
  const [row] = next.splice(from, 1);
  next.splice(to, 0, row);
  return next;
}

export default function PageEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();

  // ===== Form state =====
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [isActive, setIsActive] = React.useState(true);
  const [isUnlimited, setIsUnlimited] = React.useState(true);
  const [expiresAt, setExpiresAt] = React.useState('');
  const [maxTx, setMaxTx] = React.useState('');

  // Discount caps
  const [capAmountEnabled, setCapAmountEnabled] = React.useState(false);
  const [discountCapAmount, setDiscountCapAmount] = React.useState('');
  const [discountCapCurrency, setDiscountCapCurrency] = React.useState('');
  const [capCountEnabled, setCapCountEnabled] = React.useState(false);
  const [discountCapCount, setDiscountCapCount] = React.useState('');

  // Password management
  const [hasPassword, setHasPassword] = React.useState(false); // from server
  const [setPw, setSetPw] = React.useState(false);             // checkbox state
  const [newPw, setNewPw] = React.useState('');                // new page password (optional)
  const [showPw, setShowPw] = React.useState(false);

  // Email templates (payer & merchant)
  const [tplsLoading, setTplsLoading] = React.useState(true);
  const [templates, setTemplates] = React.useState([]); // [{id,name,kind,is_active}]
  const [payerTplId, setPayerTplId] = React.useState('');
  const [merchantTplId, setMerchantTplId] = React.useState('');

  // Items (selected leafs)
  const [selectedItems, setSelectedItems] = React.useState([]); // [{ref_kind, ref_id, label, type_label, price, currency, requirement}]
  const [selectedMap, setSelectedMap] = React.useState({});      // key -> true

  // Additions
  const [selectedAdditions, setSelectedAdditions] = React.useState([]); // [{id, label, type, value, currency}]
  const [selectedAddMap, setSelectedAddMap] = React.useState({});       // id -> true

  const keyOf = (r) => `${r.ref_kind}:${r.ref_id}`;

  const onMoveItemUp = (idx) => setSelectedItems(prev => moveRow(prev, idx, idx - 1));
  const onMoveItemDown = (idx) => setSelectedItems(prev => moveRow(prev, idx, idx + 1));

  const onMoveAdditionUp = (idx) => setSelectedAdditions(prev => moveRow(prev, idx, idx - 1));
  const onMoveAdditionDown = (idx) => setSelectedAdditions(prev => moveRow(prev, idx, idx + 1));

  // ===== Load details =====
  React.useEffect(() => {
    let mounted = true;
    setLoading(true); setError(null);
    (async () => {
      try {
        const d = await getPageDetails(id);
        if (!mounted) return;

        setName(d.name || '');
        setDescription(d.description || '');
        setIsActive(!!d.is_active);

        const unlimited = (d.expires_at == null && d.max_tx == null);
        setIsUnlimited(unlimited);
        setExpiresAt(unlimited ? '' : isoToLocalInput(d.expires_at));
        setMaxTx(unlimited ? '' : (d.max_tx ?? ''));

        // Discount caps (prefill)
        if (d.discount_cap_amount != null && d.discount_cap_currency) {
          setCapAmountEnabled(true);
          setDiscountCapAmount(String(d.discount_cap_amount));
          setDiscountCapCurrency(d.discount_cap_currency || '');
        } else {
          setCapAmountEnabled(false);
          setDiscountCapAmount('');
          setDiscountCapCurrency('');
        }

        if (d.discount_cap_count != null) {
          setCapCountEnabled(true);
          setDiscountCapCount(String(d.discount_cap_count));
        } else {
          setCapCountEnabled(false);
          setDiscountCapCount('');
        }

        // Email templates
        // Email templates (use select-friendly fields from backend)
        setPayerTplId(d?.payer_email_template_select?.value ?? 'DEFAULT');
        setMerchantTplId(d?.merchant_email_template_select?.value ?? 'DEFAULT');


        // password flags
        setHasPassword(!!d.password);
        setSetPw(!!d.password);
        setNewPw(d.password || '');

        // Items from backend:
        // { id, ref_kind, ref_id, is_required, position, label, catalog_type }
        const items = (d.items || []).map(it => {
          // type label based on ref_kind (and catalog_type for CATALOG_ITEM)
          let tlabel = 'Item';
          if (it.ref_kind === 'CATALOG_ITEM') {
            tlabel = (it.catalog_type === 'PLAIN') ? 'Plain price' : 'Product';
          } else if (it.ref_kind === 'PRODUCT_VARIATION') {
            tlabel = 'Product variation';
          } else if (it.ref_kind === 'SERVICE_PLAN') {
            tlabel = 'Service plan';
          } else if (it.ref_kind === 'PLAN_INTERVAL') {
            tlabel = 'Subscription interval';
          }
          return {
            ref_kind: it.ref_kind,
            ref_id: it.ref_id,
            label: it.label ?? '(no label)',
            type_label: tlabel,
            price: it.price ?? null,       // if your detail adds price; otherwise stays null
            currency: it.currency ?? null, // if present
            requirement: it.is_required ? 'REQUIRED' : 'OPTIONAL',
            position: it.position ?? null,
          };
        }).sort((a, b) => {
          const ax = Number.isInteger(a.position) ? a.position : 1e9;
          const bx = Number.isInteger(b.position) ? b.position : 1e9;
          return ax - bx || (a.ref_kind + a.ref_id).localeCompare(b.ref_kind + b.ref_id);
        });
        const map = {};
        for (const r of items) map[keyOf(r)] = true;

        setSelectedItems(items);
        setSelectedMap(map);

        // Additions: { id, name, type }
        const adds = (d.additions || [])
          .map(a => ({
            id: a.id,
            label: a.name,
            type: a.type,
            value: a.value ?? a.amount ?? null,
            currency: a.currency ?? null,
            kind: a.kind || null,
            applies_main_only: !!a.applies_main_only,
            position: Number.isInteger(a.position) ? a.position : null,
          }))
          .sort((x, y) => {
            const ax = Number.isInteger(x.position) ? x.position : 1e9;
            const ay = Number.isInteger(y.position) ? y.position : 1e9;
            return ax - ay || x.id.localeCompare(y.id);
          });
        const amap = {};
        for (const a of adds) amap[a.id] = true;

        setSelectedAdditions(adds);
        setSelectedAddMap(amap);

      } catch (e) {
        setError(e?.response?.data?.error || e.message || 'Failed to load');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  // Load all templates (active + inactive) so existing selections always show
  React.useEffect(() => {
    let mounted = true;
    setTplsLoading(true);
    // active:'ALL' to include inactive templates still linked to this page
    listEmailTemplates({ page: 1, pageSize: 1000, is_active: 'ALL', sort: 'name', dir: 'asc' })
      .then((res) => {
        if (!mounted) return;
        const items = Array.isArray(res?.rows) ? res.rows : (res?.items || []);
        setTemplates(items);
      })
      .finally(() => mounted && setTplsLoading(false));
    return () => { mounted = false; };
  }, []);

  // ===== Catalog picker state =====
  const page = Number(sp.get('page') || 1);
  const pageSize = Number(sp.get('pageSize') || 25);
  const qRaw = sp.get('q') || '';
  const sort = sp.get('sort') || 'updated_at';
  const dir = sp.get('dir') || 'desc';
  const q = useDebouncedValue(qRaw, 300);

  const [catState, setCatState] = React.useState({ loading: true, error: null, data: { total: 0, page, pageSize, rows: [] } });

  const setParam = (k, v) => {
    const next = new URLSearchParams(sp);
    next.set(k, String(v));
    if (!next.get('page')) next.set('page', String(page));
    if (!next.get('pageSize')) next.set('pageSize', String(pageSize));
    if (!next.get('sort')) next.set('sort', sort);
    if (!next.get('dir')) next.set('dir', dir);
    setSp(next, { replace: true });
  };

  React.useEffect(() => {
    let mounted = true;
    setCatState(s => ({ ...s, loading: true, error: null }));
    listCatalogItemsExtended({ page, pageSize, q, isActive: 'ALL', sort, dir })
      .then(data => {
        if (!mounted) return;
        setCatState({ loading: false, error: null, data: { total: data.total, page: data.page, pageSize: data.pageSize, rows: data.rows || [] } });
      })
      .catch(err => {
        const msg = err?.response?.data?.error || err.message || 'Error';
        if (mounted) setCatState({ loading: false, error: msg, data: { total: 0, page, pageSize, rows: [] } });
      });
    return () => { mounted = false; };
  }, [page, pageSize, q, sort, dir]);

  const addLeaf = (row) => {
    const key = keyOf(row);
    if (selectedMap[key]) return;
    const next = { ...row, requirement: 'OPTIONAL' };
    setSelectedItems(s => [...s, next]);
    setSelectedMap(m => ({ ...m, [key]: true }));
  };

  const removeLeaf = (key) => {
    setSelectedItems(s => s.filter(x => keyOf(x) !== key));
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

  const [addState, setAddState] = React.useState({ loading: true, error: null, data: { total: 0, page: addPage, pageSize: addPageSize, rows: [] } });

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

  // ===== Submit (PUT) =====
  const [saving, setSaving] = React.useState(false);
  const onSubmit = async () => {
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
      // code ignored by backend on update (immutable)
      expires_at: isUnlimited ? null : (expiresAt ? new Date(expiresAt).toISOString() : null),
      max_tx: isUnlimited ? null : (maxTx ? Number(maxTx) : null),
      discount_cap_amount: payloadDiscountCapAmount,
      discount_cap_currency: payloadDiscountCapCurrency,
      discount_cap_count: payloadDiscountCapCount,
      payer_email_template_id: payerTplId,        // 'DEFAULT' or uuid
      merchant_email_template_id: merchantTplId,  // 'DEFAULT' or uuid
      // Replace items & additions entirely (backend supports full replace when arrays are provided)
      items: selectedItems.map((x, i) => ({
        ref_kind: x.ref_kind,
        ref_id: x.ref_id,
        is_required: x.requirement === 'REQUIRED',
        position: i, // <- reflect UI order
      })),
      additions: selectedAdditions.map((a, i) => ({
        id: a.id,
        position: i, // <- reflect UI order
      })),
    };

    // Password semantics:
    // - If checkbox is unchecked and page had a password => remove it
    // - If checkbox is checked and newPw provided => set/change password
    // - If checkbox is checked and newPw empty => keep current (send nothing)
    if (!setPw && hasPassword) {
      payload.set_password = false; // remove
    } else if (setPw && newPw.trim()) {
      payload.set_password = true;
      payload.password = newPw.trim();
    }

    if (!hasPassword && setPw && !newPw.trim()) {
      alert('Password cannot be empty when Set password is checked.');
      return;
    }
    try {
      setSaving(true);
      const out = await updatePage(id, payload);
      // reload the form from server response to keep things accurate
      setName(out.name || '');
      setDescription(out.description || '');
      setIsActive(!!out.is_active);
      const unlimited = (out.expires_at == null && out.max_tx == null);
      setIsUnlimited(unlimited);
      setExpiresAt(unlimited ? '' : isoToLocalInput(out.expires_at));
      // Discount caps (refresh from server response)
      if (out.discount_cap_amount != null && out.discount_cap_currency) {
        setCapAmountEnabled(true);
        setDiscountCapAmount(String(out.discount_cap_amount));
        setDiscountCapCurrency(out.discount_cap_currency || '');
      } else {
        setCapAmountEnabled(false);
        setDiscountCapAmount('');
        setDiscountCapCurrency('');
      }

      if (out.discount_cap_count != null) {
        setCapCountEnabled(true);
        setDiscountCapCount(String(out.discount_cap_count));
      } else {
        setCapCountEnabled(false);
        setDiscountCapCount('');
      }
      setMaxTx(unlimited ? '' : (out.max_tx ?? ''));
      setHasPassword(!!out.password);
      setSetPw(!!out.password);
      setNewPw(out.password || '');

      setPayerTplId(out?.payer_email_template_select?.value ?? 'DEFAULT');
      setMerchantTplId(out?.merchant_email_template_select?.value ?? 'DEFAULT');

      const items = (out.items || []).map(it => {
        let tlabel = 'Item';
        if (it.ref_kind === 'CATALOG_ITEM') {
          tlabel = (it.catalog_type === 'PLAIN') ? 'Plain price' : 'Product';
        } else if (it.ref_kind === 'PRODUCT_VARIATION') {
          tlabel = 'Product variation';
        } else if (it.ref_kind === 'SERVICE_PLAN') {
          tlabel = 'Service plan';
        } else if (it.ref_kind === 'PLAN_INTERVAL') {
          tlabel = 'Subscription interval';
        }
        return {
          ref_kind: it.ref_kind,
          ref_id: it.ref_id,
          label: it.label ?? '(no label)',
          type_label: tlabel,
          price: it.price ?? null,
          currency: it.currency ?? null,
          requirement: it.is_required ? 'REQUIRED' : 'OPTIONAL',
          position: it.position ?? null,
        };
      }).sort((a, b) => {
        const ax = Number.isInteger(a.position) ? a.position : 1e9;
        const bx = Number.isInteger(b.position) ? b.position : 1e9;
        return ax - bx || (a.ref_kind + a.ref_id).localeCompare(b.ref_kind + b.ref_id);
      });
      const map = {}; items.forEach(r => { map[keyOf(r)] = true; });
      setSelectedItems(items); setSelectedMap(map);

      const adds = (out.additions || [])
        .map(a => ({
          id: a.id,
          label: a.name,
          type: a.type,
          value: a.value ?? a.amount ?? null,
          currency: a.currency ?? null,
          applies_main_only: !!a.applies_main_only,
          position: Number.isInteger(a.position) ? a.position : null,
        }))
        .sort((x, y) => {
          const ax = Number.isInteger(x.position) ? x.position : 1e9;
          const ay = Number.isInteger(y.position) ? y.position : 1e9;
          return ax - ay || x.id.localeCompare(y.id);
        });

      const amap = {}; adds.forEach(a => { amap[a.id] = true; });
      setSelectedAdditions(adds);
      setSelectedAddMap(amap);

      alert('Page updated.');
    } catch (e) {
      const msg = e?.response?.data?.error || e.message || 'Failed to update page';
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

  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;
  if (error) return <div style={{ padding: 16, color: '#b91c1c' }}>{error}</div>;

  return (
    <div style={{ padding: 16, display: 'grid', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Pages / Edit</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={saving} onClick={onSubmit} style={{ padding: '8px 12px' }}>Save</button>
          <button onClick={() => navigate('/pages')} style={{ padding: '8px 12px' }}>Back</button>
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
            <div style={{ display: 'grid', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 600 }}>
                  {hasPassword ? 'Password (prefilled — edit to change)' : 'Password'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    placeholder="Page password"
                    autoComplete="new-password"
                    style={{ width: 420, padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}>
                    {showPw ? 'Hide' : 'Show'}
                  </button>
                </div>
                {hasPassword && !newPw.trim() && (
                  <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
                    Leave as-is to keep the current password, or uncheck “Set password” to remove it.
                  </div>
                )}
              </div>
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
                .map(t => <option key={t.id} value={t.id}>{t.name}{t.is_active ? '' : ' (inactive)'}</option>)}
            </select>
            {!!payerTplId && !tplsLoading && templates.find(t => t.id === payerTplId && !t.is_active) && (
              <div style={{ color: '#b45309', fontSize: 12 }}>Selected template is inactive.</div>
            )}

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
            {!!merchantTplId && !tplsLoading && templates.find(t => t.id === merchantTplId && !t.is_active) && (
              <div style={{ color: '#b45309', fontSize: 12 }}>Selected template is inactive.</div>
            )}
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
          <div style={{ color: '#64748b' }}>Code is auto-generated and immutable.</div>
        </div>
      </div>

      {/* Items */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, display: 'grid', gap: 10 }}>
        <h3 style={{ marginTop: 0 }}>Items</h3>

        {/* Selected items */}
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
                    {row.label} {row.price != null
                      ? <span style={{ color: '#64748b' }}>• {row.price}{row.currency ? ` ${row.currency}` : ''}</span>
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
                    <button onClick={() => removeLeaf(key)} style={{ padding: '6px 8px' }}>Remove</button>
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
              value={sp.get('q') || ''}
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
            ) : (catState.data.rows || []).length === 0 ? (
              <div style={{ padding: 10, color: '#64748b' }}>No results.</div>
            ) : (
              (catState.data.rows || []).map(row => {
                const key = keyOf(row);
                const disabled = !!selectedMap[key];
                return (
                  <div key={key} style={{ display: 'grid', gridTemplateColumns: '1.4fr 2fr 0.9fr 0.8fr 0.8fr', padding: '8px 10px', borderTop: '1px solid #eef2f7' }}>
                    <div>{row.type_label}</div>
                    <div>{row.label}</div>
                    <div>{row.price != null ? row.price : '—'}</div>
                    <div>{row.currency || '—'}</div>
                    <div><button disabled={disabled} onClick={() => addLeaf(row)} style={{ padding: '6px 8px' }}>{disabled ? 'Selected' : 'Select'}</button></div>
                  </div>
                );
              })
            )}
          </div>

          {/* Catalog pagination */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ color: '#64748b' }}>{catState.data.total} rows • Page {page} / {Math.max(1, Math.ceil((catState.data.total || 0) / pageSize))}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={pageSize} onChange={e => { setParam('pageSize', Number(e.target.value)); setParam('page', 1); }} style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 6 }}>
                {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
              </select>
              <button disabled={page <= 1} onClick={() => setParam('page', 1)} style={{ padding: '6px 10px' }}>« First</button>
              <button disabled={page <= 1} onClick={() => setParam('page', page - 1)} style={{ padding: '6px 10px' }}>‹ Prev</button>
              <button disabled={page >= Math.max(1, Math.ceil((catState.data.total || 0) / pageSize))} onClick={() => setParam('page', page + 1)} style={{ padding: '6px 10px' }}>Next ›</button>
              <button disabled={page >= Math.max(1, Math.ceil((catState.data.total || 0) / pageSize))} onClick={() => setParam('page', Math.max(1, Math.ceil((catState.data.total || 0) / pageSize)))} style={{ padding: '6px 10px' }}>Last »</button>
            </div>
          </div>
        </div>
      </div>

      {/* Additions */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, display: 'grid', gap: 10 }}>
        <h3 style={{ marginTop: 0 }}>Additions</h3>

        {/* Selected additions */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ background: '#f8fafc', padding: '8px 10px', fontWeight: 600 }}>Selected</div>
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

        {/* Additions picker */}
        <AdditionsPicker
          sp={sp}
          setAParam={(k, v) => {
            const next = new URLSearchParams(sp);
            next.set(k, String(v));
            if (!next.get('apage')) next.set('apage', String(addPage));
            if (!next.get('apageSize')) next.set('apageSize', String(addPageSize));
            if (!next.get('asort')) next.set('asort', addSort);
            if (!next.get('adir')) next.set('adir', addDir);
            setSp(next, { replace: true });
          }}
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
  sp, setAParam,
  addRows, addState,
  addPage, addPageSize, addPages, addTotal,
  addAddition,
}) {
  const addQRaw = sp.get('aq') || '';
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
            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 0.8fr 0.8fr', padding: '8px 10px', borderTop: '1px solid #eef2f7' }}>
              <div>{r.label}</div>
              <div>{r.type}</div>
              <div>
                {r.value != null
                  ? (r.kind === 'PERCENT' ? `${r.value}%` : `${r.value}${r.currency ? ' ' + r.currency : ''}`)
                  : '—'}
              </div>
              <div>{r.applies_main_only ? 'Yes' : 'No'}</div>
              <div><button onClick={() => addAddition(r)} style={{ padding: '6px 8px' }}>Select</button></div>
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
