import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCatalogItem } from '../../api/catalog.api';

const CURRENCIES = ['USD', 'EUR', 'MAD'];

export default function ProductForm({ mode = 'create', initialValues = {}, onSubmit }) {
  const navigate = useNavigate();

  // Top-level fields
  const [name, setName] = useState(initialValues.name ?? '');
  const [description, setDescription] = useState(initialValues.description ?? '');
  const [isActive, setIsActive] = useState(
    initialValues.is_active ?? initialValues.isActive ?? true
  );

  // Product-specific toggles
  const [hasVariations, setHasVariations] = useState(
    initialValues.product?.has_variations ?? false
  );
  const [isQuantityless, setIsQuantityless] = useState(
    initialValues.product?.is_quantityless ?? false
  );

  // Base product (when hasVariations = false)
  const [quantity, setQuantity] = useState(
    initialValues.product?.quantity ?? 1
  );
  const [basePrice, setBasePrice] = useState(
    initialValues.product?.base_price ?? ''
  );
  const [baseCurrency, setBaseCurrency] = useState(
    initialValues.product?.base_currency ?? 'USD'
  );

  // Variations (when hasVariations = true)
  const [varsList, setVarsList] = useState(
    initialValues.product?.variations?.length
      ? initialValues.product.variations.map(v => ({
        name: v.name ?? '',
        sku_code: v.sku_code ?? '',
        price: v.price ?? '',
        currency: v.currency ?? 'USD',
        description: v.description ?? '',
        quantity: (v.quantity ?? '') === null ? '' : v.quantity ?? '',
        is_quantityless: !!v.is_quantityless,   // carry through
        position: Number.isFinite(+v.position) ? Number(v.position) : 0, // carry through
        is_active: v.is_active ?? true
      }))
      : [{ name: '', sku_code: '', price: '', currency: 'USD', description: '', quantity: '', is_quantityless: false, position: 0, is_active: true }]
  );

  // UX
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState([]);

  function moveVar(from, to) {
    setVarsList(prev => {
      const next = [...prev];
      if (to < 0 || to >= next.length) return prev;
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }
  const moveVarUp = idx => moveVar(idx, idx - 1);
  const moveVarDown = idx => moveVar(idx, idx + 1);

  // Drag & Drop
  const [dragIdx, setDragIdx] = React.useState(null);
  const onDragStartVar = idx => () => setDragIdx(idx);
  const onDragOverVar = e => e.preventDefault();
  const onDropVar = idx => e => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    moveVar(dragIdx, idx);
    setDragIdx(null);
  };


  function updateVar(idx, patch) {
    setVarsList(prev => prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  }
  function addVar() {
    setVarsList(prev => [
      ...prev,
      { name: '', sku_code: '', price: '', currency: 'USD', description: '', quantity: '', is_quantityless: false, position: 0, is_active: true }
    ]);
  }
  function removeVar(idx) {
    setVarsList(prev => prev.filter((_, i) => i !== idx));
  }

  function validate() {
    const errs = [];
    if (!name.trim()) errs.push('Name is required.');

    if (!hasVariations) {
      if (!isQuantityless) {
        const q = Number(quantity);
        if (!Number.isFinite(q) || q < 0) errs.push('Quantity must be a non-negative number.');
      }
      const p = Number(basePrice);
      if (!Number.isFinite(p) || p < 0) errs.push('Base price must be a non-negative number.');
      if (!CURRENCIES.includes(baseCurrency)) errs.push('Base currency is invalid.');
    } else {
      if (!varsList.length) errs.push('Add at least one variation.');
      varsList.forEach((v, i) => {
        if (!v.name.trim()) errs.push(`Variation #${i + 1}: name is required.`);
        const p = Number(v.price);
        if (!Number.isFinite(p) || p < 0) errs.push(`Variation #${i + 1}: price must be a non-negative number.`);
        if (!CURRENCIES.includes(v.currency)) errs.push(`Variation #${i + 1}: currency is invalid.`);
        if (v.quantity !== '' && (!Number.isFinite(Number(v.quantity)) || Number(v.quantity) < 0)) {
          errs.push(`Variation #${i + 1}: quantity must be a non-negative number.`);
        }
        if (v.is_quantityless && v.quantity !== '' && v.quantity != null) {
          errs.push(`Variation #${i + 1}: quantityless must not have a quantity.`);
        }
      });
    }

    setErrors(errs);
    return errs.length === 0;
  }

  async function onSubmitHandler(e) {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      type: 'PRODUCT',
      name: name.trim(),
      description: description.trim() || null,
      is_active: !!isActive,
      product: {
        has_variations: !!hasVariations,
        is_quantityless: !!isQuantityless
      }
    };

    if (!hasVariations) {
      payload.product.quantity = isQuantityless ? null : Number(quantity);
      payload.product.base_price = Number(basePrice);
      payload.product.base_currency = baseCurrency;
    } else {
      payload.product.variations = varsList.map(v => ({
        name: v.name.trim(),
        sku_code: v.sku_code.trim() || null,
        price: Number(v.price),
        currency: v.currency,
        description: v.description.trim() || null,
        quantity: v.is_quantityless ? null : (v.quantity === '' ? null : Number(v.quantity)),
        is_quantityless: !!v.is_quantityless,
        is_active: !!v.is_active
      }));
    }


    if (onSubmit) {
      setSubmitting(true);
      try { await onSubmit(payload); } finally { setSubmitting(false); }
      return;
    }
    try {
      setSubmitting(true);
      const { id } = await createCatalogItem(payload);
      navigate(`/catalog/${id}/edit`, { replace: true, state: { toast: 'Product created' } });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to create product';
      setErrors([msg]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 760 }}>
      <h1 style={{ marginTop: 0 }}>{mode === 'edit' ? 'Edit Product' : 'New Product'}</h1>

      {/* Errors */}
      {errors.length > 0 && (
        <div style={{ background: '#fff3f3', border: '1px solid #f5c2c7', color: '#b4232f', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          <ul style={{ margin: '6px 0 0 18px' }}>
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      <form onSubmit={onSubmitHandler} style={{ display: 'grid', gap: 16 }}>
        {/* Basics */}
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Name *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g., Hoodie"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Optional"
            rows={3}
            style={textareaStyle}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input id="active-switch" type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
          <label htmlFor="active-switch">Active</label>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #eee' }} />

        {/* Has variations */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            id="hv"
            type="checkbox"
            checked={hasVariations}
            onChange={e => setHasVariations(e.target.checked)}
          />
          <label htmlFor="hv">Has variations (e.g., Size/Color)</label>
        </div>

        {!hasVariations ? (
          <>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Base price *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={basePrice}
                  onChange={e => setBasePrice(e.target.value)}
                  placeholder="0.00"
                  style={inputStyle}
                />
              </div>
              <div style={{ width: 220 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Currency *</label>
                <select value={baseCurrency} onChange={e => setBaseCurrency(e.target.value)} style={inputStyle}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                id="iq"
                type="checkbox"
                checked={isQuantityless}
                onChange={e => setIsQuantityless(e.target.checked)}
              />
              <label htmlFor="iq">Quantityless product (no stock tracking)</label>
            </div>

            {!isQuantityless && (
              <div style={{ width: 220 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Quantity *</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  style={inputStyle}
                />
              </div>
            )}
          </>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontWeight: 600 }}>Variations *</div>
              <button type="button" onClick={addVar} style={btnSec}>+ Add variation</button>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              {varsList.map((v, idx) => (
                <div
                  key={idx}
                  style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}
                  draggable
                  onDragStart={onDragStartVar(idx)}
                  onDragOver={onDragOverVar}
                  onDrop={onDropVar(idx)}
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button type="button" onClick={() => moveVarUp(idx)} style={btnSec}>↑</button>
                    <button type="button" onClick={() => moveVarDown(idx)} style={btnSec}>↓</button>
                    <span draggable
                      onDragStart={onDragStartVar(idx)}
                      onDragOver={onDragOverVar}
                      onDrop={onDropVar(idx)}
                      title="Drag to reorder"
                      style={{ cursor: 'grab', padding: '4px 8px', border: '1px dashed #ddd', borderRadius: 6 }}
                    >⠿</span>
                  </div>
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <label style={label}>Name *</label>
                        <input value={v.name} onChange={e => updateVar(idx, { name: e.target.value })} placeholder="e.g., Red / M" style={inputStyle} />
                      </div>
                      <div style={{ width: 220 }}>
                        <label style={label}>SKU</label>
                        <input value={v.sku_code} onChange={e => updateVar(idx, { sku_code: e.target.value })} placeholder="Optional" style={inputStyle} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <label style={label}>Price *</label>
                        <input type="number" min="0" step="0.01" value={v.price} onChange={e => updateVar(idx, { price: e.target.value })} style={inputStyle} />
                      </div>
                      <div style={{ width: 220 }}>
                        <label style={label}>Currency *</label>
                        <select value={v.currency} onChange={e => updateVar(idx, { currency: e.target.value })} style={inputStyle}>
                          {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      {/* Quantityless toggle */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <input
                          id={`v-isql-${idx}`}
                          type="checkbox"
                          checked={!!v.is_quantityless}
                          onChange={e => updateVar(idx, { is_quantityless: e.target.checked, quantity: '' })}
                        />
                        <label htmlFor={`v-isql-${idx}`}>Quantityless</label>
                      </div>

                      {/* Quantity (only when not quantityless) */}
                      {!v.is_quantityless && (
                        <div>
                          <label style={label}>Quantity</label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={v.quantity}
                            onChange={e => updateVar(idx, { quantity: e.target.value })}
                            style={inputStyle}
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label style={label}>Description</label>
                      <textarea value={v.description} onChange={e => updateVar(idx, { description: e.target.value })} rows={2} style={textareaStyle} />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input id={`var-active-${idx}`} type="checkbox" checked={v.is_active} onChange={e => updateVar(idx, { is_active: e.target.checked })} />
                        <label htmlFor={`var-active-${idx}`}>Active</label>
                      </div>
                      <button type="button" onClick={() => removeVar(idx)} style={btnDanger}>Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button type="button" onClick={() => navigate(-1)} style={btnSec}>Cancel</button>
          <button type="submit" disabled={submitting} style={btnPrimary}>
            {submitting ? (mode === 'edit' ? 'Saving…' : 'Creating…') : (mode === 'edit' ? 'Save changes' : 'Create product')}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none' };
const textareaStyle = { ...inputStyle, resize: 'vertical' };
const label = { display: 'block', fontWeight: 600, marginBottom: 6 };
const btnPrimary = { padding: '10px 14px', border: '1px solid #111827', background: '#111827', color: '#fff', borderRadius: 8, cursor: 'pointer' };
const btnSec = { padding: '10px 14px', border: '1px solid #e5e7eb', background: '#fff', color: '#111827', borderRadius: 8, cursor: 'pointer' };
const btnDanger = { padding: '8px 12px', border: '1px solid #fca5a5', background: '#fff5f5', color: '#b4232f', borderRadius: 8, cursor: 'pointer' };
