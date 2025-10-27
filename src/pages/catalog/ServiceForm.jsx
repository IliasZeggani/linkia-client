import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCatalogItem } from '../../api/catalog.api';

const CURRENCIES = ['USD', 'EUR', 'MAD'];

export default function ServiceForm({ mode = 'create', initialValues = {}, onSubmit }) {
  const navigate = useNavigate();

  // Top-level
  const [name, setName] = useState(initialValues.name ?? '');
  const [description, setDescription] = useState(initialValues.description ?? '');
  const [isActive, setIsActive] = useState(initialValues.is_active ?? initialValues.isActive ?? true);

  // Plans (flat list)
  const [plans, setPlans] = useState(
    initialValues.service?.plans?.length
      ? initialValues.service.plans.map(p => ({
        name: p.name ?? '',
        description: p.description ?? '',
        price: p.price ?? '',
        currency: p.currency ?? 'USD',
        position: p.position ?? 0,
        is_active: p.is_active ?? true
      }))
      : [{ name: '', description: '', price: '', currency: 'USD', position: 0, is_active: true }]
  );

  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Helpers
  function updatePlan(idx, patch) {
    setPlans(prev => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  }
  function addPlan() {
    setPlans(prev => [
      ...prev,
      { name: '', description: '', price: '', currency: 'USD', is_active: true }
    ]);
  }
  function removePlan(idx) {
    setPlans(prev => prev.filter((_, i) => i !== idx));
  }

  function movePlan(from, to) {
    setPlans(prev => {
      const next = [...prev];
      if (to < 0 || to >= next.length) return prev;
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }
  const movePlanUp = idx => movePlan(idx, idx - 1);
  const movePlanDown = idx => movePlan(idx, idx + 1);

  const [dragPlanIdx, setDragPlanIdx] = React.useState(null);
  const onDragStartPlan = idx => () => setDragPlanIdx(idx);
  const onDragOverPlan = e => e.preventDefault();
  const onDropPlan = idx => e => {
    e.preventDefault();
    if (dragPlanIdx === null || dragPlanIdx === idx) return;
    movePlan(dragPlanIdx, idx);
    setDragPlanIdx(null);
  };

  function validate() {
    const errs = [];
    if (!name.trim()) errs.push('Name is required.');
    if (!plans.length) errs.push('Add at least one plan.');
    plans.forEach((p, i) => {
      if (!p.name.trim()) errs.push(`Plan #${i + 1}: name is required.`);
      const pr = Number(p.price);
      if (!Number.isFinite(pr) || pr < 0) errs.push(`Plan #${i + 1}: price must be a non-negative number.`);
      if (!CURRENCIES.includes(p.currency)) errs.push(`Plan #${i + 1}: currency is invalid.`);
    });
    setErrors(errs);
    return errs.length === 0;
  }

  async function onSubmitHandler(e) {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      type: 'SERVICE',
      name: name.trim(),
      description: description.trim() || null,
      is_active: !!isActive,
      service: {
        plans: plans.map(p => ({
          name: p.name.trim(),
          description: p.description.trim() || null,
          price: Number(p.price),
          currency: p.currency,
          is_active: !!p.is_active
        }))
      }
    };

    if (onSubmit) {
      setSubmitting(true);
      try { await onSubmit(payload); } finally { setSubmitting(false); }
      return;
    }
    try {
      setSubmitting(true);
      const { id } = await createCatalogItem(payload);
      navigate(`/catalog/${id}/edit`, { replace: true, state: { toast: 'Service created' } });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to create service';
      setErrors([msg]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 820 }}>
      <h1 style={{ marginTop: 0 }}>{mode === 'edit' ? 'Edit Service' : 'New Service'}</h1>

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
          <label style={label}>Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Setup & Installation" style={inputStyle} />
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

        {/* Plans */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 600 }}>Plans *</div>
          <button type="button" onClick={addPlan} style={btnSec}>+ Add plan</button>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          {plans.map((p, i) => (
            <div
              key={i}
              style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}
              draggable
              onDragStart={onDragStartPlan(i)}
              onDragOver={onDragOverPlan}
              onDrop={onDropPlan(i)}
            >
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => movePlanUp(i)} style={btnSec}>↑</button>
                <button type="button" onClick={() => movePlanDown(i)} style={btnSec}>↓</button>
                <span draggable
                  onDragStart={onDragStartPlan(i)}
                  onDragOver={onDragOverPlan}
                  onDrop={onDropPlan(i)}
                  title="Drag to reorder"
                  style={{ cursor: 'grab', padding: '4px 8px', border: '1px dashed #ddd', borderRadius: 6 }}
                >⠿</span>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={label}>Plan name *</label>
                    <input value={p.name} onChange={e => updatePlan(i, { name: e.target.value })} placeholder="e.g., Basic" style={inputStyle} />
                  </div>
                  <div style={{ width: 160 }}>
                    <label style={label}>Price *</label>
                    <input type="number" min="0" step="0.01" value={p.price} onChange={e => updatePlan(i, { price: e.target.value })} style={inputStyle} />
                  </div>
                  <div style={{ width: 160 }}>
                    <label style={label}>Currency *</label>
                    <select value={p.currency} onChange={e => updatePlan(i, { currency: e.target.value })} style={inputStyle}>
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={label}>Description</label>
                  <textarea value={p.description} onChange={e => updatePlan(i, { description: e.target.value })} rows={2} style={textareaStyle} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input id={`p-active-${i}`} type="checkbox" checked={p.is_active} onChange={e => updatePlan(i, { is_active: e.target.checked })} />
                  <label htmlFor={`p-active-${i}`}>Active</label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => removePlan(i)} style={btnDanger}>Remove plan</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button type="button" onClick={() => navigate(-1)} style={btnSec}>Cancel</button>
          <button type="submit" disabled={submitting} style={btnPrimary}>
            {submitting ? (mode === 'edit' ? 'Saving…' : 'Creating…') : (mode === 'edit' ? 'Save changes' : 'Create service')}
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
