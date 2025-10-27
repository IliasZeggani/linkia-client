import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCatalogItem } from '../../api/catalog.api';

const CURRENCIES = ['USD', 'EUR', 'MAD'];

export default function PlainPriceForm({ mode = 'create', initialValues = {}, onSubmit }) {
  const navigate = useNavigate();

  // Top-level
  const [name, setName] = useState(initialValues.name ?? '');
  const [description, setDescription] = useState(initialValues.description ?? '');
  const [isActive, setIsActive] = useState(initialValues.is_active ?? initialValues.isActive ?? true);

  // Plain price
  const [price, setPrice] = useState(initialValues.plain?.price ?? '');
  const [currency, setCurrency] = useState(initialValues.plain?.currency ?? 'USD');

  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const errs = [];
    if (!name.trim()) errs.push('Name is required.');
    const p = Number(price);
    if (!Number.isFinite(p) || p < 0) errs.push('Price must be a non-negative number.');
    if (!CURRENCIES.includes(currency)) errs.push('Currency is invalid.');
    setErrors(errs);
    return errs.length === 0;
  }

  async function onSubmitHandler(e) {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      type: 'PLAIN',
      name: name.trim(),
      description: description.trim() || null,
      is_active: !!isActive,
      plain: { price: Number(price), currency }
    };

    if (onSubmit) {
      setSubmitting(true);
      try { await onSubmit(payload); } finally { setSubmitting(false); }
      return;
    }
    try {
      setSubmitting(true);
      const { id } = await createCatalogItem(payload);
      navigate(`/catalog/${id}/edit`, { replace: true, state: { toast: 'Plain price created' } });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to create plain price';
      setErrors([msg]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 560 }}>
      <h1 style={{ marginTop: 0 }}>{mode === 'edit' ? 'Edit Plain Price' : 'New Plain Price'}</h1>

      {errors.length > 0 && (
        <div style={{ background: '#fff3f3', border: '1px solid #f5c2c7', color: '#b4232f', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          <ul style={{ margin: '6px 0 0 18px' }}>
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      <form onSubmit={onSubmitHandler} style={{ display: 'grid', gap: 16 }}>
        <div>
          <label style={label}>Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Setup fee" style={inputStyle} />
        </div>

        <div>
          <label style={label}>Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional" rows={3} style={textareaStyle} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input id="active" type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
          <label htmlFor="active">Active</label>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #eee' }} />

        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={label}>Price *</label>
            <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" style={inputStyle} />
          </div>
          <div style={{ width: 220 }}>
            <label style={label}>Currency *</label>
            <select value={currency} onChange={e => setCurrency(e.target.value)} style={inputStyle}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button type="button" onClick={() => navigate(-1)} style={btnSec}>Cancel</button>
          <button type="submit" disabled={submitting} style={btnPrimary}>
            {submitting ? (mode === 'edit' ? 'Saving…' : 'Creating…') : (mode === 'edit' ? 'Save changes' : 'Create plain price')}
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
