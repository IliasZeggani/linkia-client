import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCatalogItem } from '../../api/catalog.api';

const CURRENCIES = ['USD', 'EUR', 'MAD'];
const INTERVAL_UNITS = ['DAY', 'WEEK', 'MONTH', 'YEAR'];

export default function SubscriptionForm({ mode = 'create', initialValues = {}, onSubmit }) {
  const navigate = useNavigate();

  // Top-level
  const [name, setName] = useState(initialValues.name ?? '');
  const [description, setDescription] = useState(initialValues.description ?? '');
  const [isActive, setIsActive] = useState(initialValues.is_active ?? initialValues.isActive ?? true);

  // Plans
  const [plans, setPlans] = useState(
    initialValues.subscription?.plans?.length
      ? initialValues.subscription.plans.map(p => ({
        name: p.name ?? '',
        description: p.description ?? '',
        position: p.position ?? 0,
        is_active: p.is_active ?? true,
        intervals: (p.intervals ?? []).map(itv => ({
          unit: itv.unit ?? 'MONTH',
          count: itv.count ?? 1,
          price: itv.price ?? '',
          currency: itv.currency ?? 'USD'
        }))
      }))
      : [{
        name: '', description: '', position: 0, is_active: true,
        intervals: [{ unit: 'MONTH', count: 1, price: '', currency: 'USD' }]
      }]
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
      {
        name: '',
        description: '',
        is_active: true,
        intervals: [{ unit: 'MONTH', count: 1, price: '', currency: 'USD' }]
      }
    ]);
  }
  function removePlan(idx) {
    setPlans(prev => prev.filter((_, i) => i !== idx));
  }
  function updateInterval(pIdx, iIdx, patch) {
    setPlans(prev =>
      prev.map((p, i) =>
        i !== pIdx
          ? p
          : { ...p, intervals: p.intervals.map((itv, j) => (j === iIdx ? { ...itv, ...patch } : itv)) }
      )
    );
  }
  function addInterval(pIdx) {
    setPlans(prev =>
      prev.map((p, i) =>
        i !== pIdx
          ? p
          : {
            ...p,
            intervals: [...p.intervals, { unit: 'MONTH', count: 1, price: '', currency: 'USD' }]
          }
      )
    );
  }
  function removeInterval(pIdx, iIdx) {
    setPlans(prev =>
      prev.map((p, i) =>
        i !== pIdx ? p : { ...p, intervals: p.intervals.filter((_, j) => j !== iIdx) }
      )
    );
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

  function moveInterval(pIdx, from, to) {
    setPlans(prev => prev.map((p, i) => {
      if (i !== pIdx) return p;
      const list = [...p.intervals];
      if (to < 0 || to >= list.length) return p;
      const [item] = list.splice(from, 1);
      list.splice(to, 0, item);
      return { ...p, intervals: list };
    }));
  }
  const moveIntervalUp = (pIdx, iIdx) => moveInterval(pIdx, iIdx, iIdx - 1);
  const moveIntervalDown = (pIdx, iIdx) => moveInterval(pIdx, iIdx, iIdx + 1);

  // (Optional) Drag & drop for intervals
  const [dragItv, setDragItv] = React.useState(null); // { pIdx, iIdx } | null
  const onDragStartItv = (pIdx, iIdx) => () => setDragItv({ pIdx, iIdx });
  const onDragOverItv = e => e.preventDefault();
  const onDropItv = (pIdx, iIdx) => e => {
    e.preventDefault();
    if (!dragItv || dragItv.pIdx !== pIdx || dragItv.iIdx === iIdx) return;
    moveInterval(pIdx, dragItv.iIdx, iIdx);
    setDragItv(null);
  };


  function validate() {
    const errs = [];
    if (!name.trim()) errs.push('Name is required.');
    if (!plans.length) errs.push('Add at least one plan.');

    plans.forEach((p, pi) => {
      if (!p.name.trim()) errs.push(`Plan #${pi + 1}: name is required.`);
      if (!p.intervals?.length) errs.push(`Plan #${pi + 1}: add at least one interval.`);

      (p.intervals || []).forEach((itv, ii) => {
        if (!INTERVAL_UNITS.includes(itv.unit))
          errs.push(`Plan #${pi + 1}, interval #${ii + 1}: unit is invalid.`);
        const c = Number(itv.count);
        if (!Number.isInteger(c) || c <= 0)
          errs.push(`Plan #${pi + 1}, interval #${ii + 1}: count must be a positive integer.`);
        const price = Number(itv.price);
        if (!Number.isFinite(price) || price < 0)
          errs.push(`Plan #${pi + 1}, interval #${ii + 1}: price must be a non-negative number.`);
        if (!CURRENCIES.includes(itv.currency))
          errs.push(`Plan #${pi + 1}, interval #${ii + 1}: currency is invalid.`);
      });
    });

    setErrors(errs);
    return errs.length === 0;
  }

  async function onSubmitHandler(e) {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      type: 'SUBSCRIPTION',
      name: name.trim(),
      description: description.trim() || null,
      is_active: !!isActive,
      subscription: {
        plans: plans.map(p => ({
          name: p.name.trim(),
          description: p.description.trim() || null,
          is_active: !!p.is_active,
          intervals: p.intervals.map(itv => ({
            unit: itv.unit,
            count: Number(itv.count),
            price: Number(itv.price),
            currency: itv.currency
          }))
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
      navigate(`/catalog/${id}/edit`, { replace: true, state: { toast: 'Subscription created' } });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to create subscription';
      setErrors([msg]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 860 }}>
      <h1 style={{ marginTop: 0 }}>{mode === 'edit' ? 'Edit Subscription' : 'New Subscription'}</h1>

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
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Pro Suite" style={inputStyle} />
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
          {plans.map((p, pi) => (
            <div
              key={pi}
              style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}
              draggable
              onDragStart={onDragStartPlan(pi)}
              onDragOver={onDragOverPlan}
              onDrop={onDropPlan(pi)}
            >
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => movePlanUp(pi)} style={btnSec}>↑</button>
                <button type="button" onClick={() => movePlanDown(pi)} style={btnSec}>↓</button>
                <span draggable
                  onDragStart={onDragStartPlan(pi)}
                  onDragOver={onDragOverPlan}
                  onDrop={onDropPlan(pi)}
                  title="Drag to reorder"
                  style={{ cursor: 'grab', padding: '4px 8px', border: '1px dashed #ddd', borderRadius: 6 }}
                >⠿</span>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={label}>Plan name *</label>
                    <input value={p.name} onChange={e => updatePlan(pi, { name: e.target.value })} placeholder="e.g., Pro" style={inputStyle} />
                  </div>
                </div>

                <div>
                  <label style={label}>Description</label>
                  <textarea value={p.description} onChange={e => updatePlan(pi, { description: e.target.value })} rows={2} style={textareaStyle} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input id={`p-active-${pi}`} type="checkbox" checked={p.is_active} onChange={e => updatePlan(pi, { is_active: e.target.checked })} />
                  <label htmlFor={`p-active-${pi}`}>Active</label>
                </div>

                {/* Intervals */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600 }}>Intervals *</div>
                  <button type="button" onClick={() => addInterval(pi)} style={btnSec}>+ Add interval</button>
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  {p.intervals.map((itv, ii) => (
                    <div
                      key={ii}
                      style={{ border: '1px dashed #e5e7eb', borderRadius: 8, padding: 10 }}
                      draggable
                      onDragStart={onDragStartItv(pi, ii)}
                      onDragOver={onDragOverItv}
                      onDrop={onDropItv(pi, ii)}
                    >
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <button type="button" onClick={() => moveIntervalUp(pi, ii)} style={btnSec}>↑</button>
                        <button type="button" onClick={() => moveIntervalDown(pi, ii)} style={btnSec}>↓</button>
                        <span draggable
                          onDragStart={onDragStartItv(pi, ii)}
                          onDragOver={onDragOverItv}
                          onDrop={onDropItv(pi, ii)}
                          title="Drag to reorder"
                          style={{ cursor: 'grab', padding: '4px 8px', border: '1px dashed #ddd', borderRadius: 6 }}
                        >⠿</span>
                      </div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <div style={{ width: 160 }}>
                          <label style={label}>Unit *</label>
                          <select value={itv.unit} onChange={e => updateInterval(pi, ii, { unit: e.target.value })} style={inputStyle}>
                            {INTERVAL_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                        <div style={{ width: 140 }}>
                          <label style={label}>Count *</label>
                          <input type="number" min="1" step="1" value={itv.count} onChange={e => updateInterval(pi, ii, { count: e.target.value })} style={inputStyle} />
                        </div>
                        <div style={{ width: 180 }}>
                          <label style={label}>Price *</label>
                          <input type="number" min="0" step="0.01" value={itv.price} onChange={e => updateInterval(pi, ii, { price: e.target.value })} style={inputStyle} />
                        </div>
                        <div style={{ width: 160 }}>
                          <label style={label}>Currency *</label>
                          <select value={itv.currency} onChange={e => updateInterval(pi, ii, { currency: e.target.value })} style={inputStyle}>
                            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                          <button type="button" onClick={() => removeInterval(pi, ii)} style={btnDanger}>Remove interval</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => removePlan(pi)} style={btnDanger}>Remove plan</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button type="button" onClick={() => navigate(-1)} style={btnSec}>Cancel</button>
          <button type="submit" disabled={submitting} style={btnPrimary}>
            {submitting ? (mode === 'edit' ? 'Saving…' : 'Creating…') : (mode === 'edit' ? 'Save changes' : 'Create subscription')}
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
