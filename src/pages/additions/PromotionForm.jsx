// src/pages/additions/PromotionForm.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createAddition } from '../../api/additions.api';

const CURRENCIES = ['USD', 'EUR', 'MAD'];
const KINDS = ['PERCENT', 'FIXED'];

export default function PromotionForm({ mode = 'create', initial, onSubmit, titleOverride }) {
  const navigate = useNavigate();
  const [form, setForm] = React.useState({
    name: '',
    description: '',
    is_active: true,
    kind: 'PERCENT',
    amount: '',
    currency: '',
    applies_main_only: false,
  });
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (initial) {
      setForm(f => ({
        ...f,
        ...initial,
        amount: initial.amount ?? '',
        currency: initial.currency || '',
        kind: initial.kind || 'PERCENT',
        applies_main_only: !!initial.applies_main_only,
      }));
    }
  }, [initial]);

  const set = (k, v) => setForm(s => ({ ...s, [k]: v }));
  const isPercent = form.kind === 'PERCENT';

  const validate = () => {
    if (!form.name.trim()) return 'Name is required';
    const amount = Number(form.amount);
    if (!Number.isFinite(amount)) return 'Amount must be a number';
    if (isPercent) {
      if (amount < 0 || amount > 100) return 'Percent must be between 0 and 100';
    } else {
      if (amount < 0) return 'Amount must be ≥ 0';
      if (!form.currency) return 'Currency is required for FIXED promotion';
    }
    return null;
  };

  const buildPayload = () => ({
    type: 'PROMOTION',
    name: form.name.trim(),
    description: form.description || '',
    is_active: !!form.is_active,
    promotion: {
      kind: form.kind,
      amount: Number(form.amount),
      currency: isPercent ? null : form.currency,
      applies_main_only: !!form.applies_main_only,
    }
  });

  const submit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (v) { setError(v); return; }
    setSubmitting(true); setError(null);
    try {
      if (mode === 'edit' && onSubmit) {
        await onSubmit(buildPayload());
      } else {
        const out = await createAddition(buildPayload());
        navigate(`/additions/${out.id}/edit`, { replace: true });
      }
    } catch (e) {
      setError(e?.response?.data?.error || e.message || (mode === 'edit' ? 'Error saving promotion' : 'Error creating promotion'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>{titleOverride || (mode === 'edit' ? 'Edit Promotion' : 'New Promotion')}</h1>

      <form onSubmit={submit} style={{ maxWidth: 560 }}>
        {error && <div style={{ marginBottom: 12, color: '#b91c1c' }}>{error}</div>}

        <label style={{ display: 'block', margin: '8px 0 4px' }}>Name</label>
        <input value={form.name} onChange={e => set('name', e.target.value)}
               style={{ width: '100%', padding: '8px 10px', border: '1px solid #ccc', borderRadius: 6 }} />

        <label style={{ display: 'block', margin: '12px 0 4px' }}>Description</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)}
                  rows={3} style={{ width: '100%', padding: '8px 10px', border: '1px solid #ccc', borderRadius: 6 }} />

        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} />
            Active
          </label>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Scope</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <input type="radio" name="scope" checked={!!form.applies_main_only} onChange={() => set('applies_main_only', true)} />
              Items only (exclude additions)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="radio" name="scope" checked={!form.applies_main_only} onChange={() => set('applies_main_only', false)} />
              Items + additions
            </label>
            <div style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
              This controls the base used for the calculation. “Items only” ignores extras/discounts/taxes, while “Items + additions” uses the full running total.
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
          <div>
            <label style={{ display: 'block', margin: '0 0 4px' }}>Kind</label>
            <select value={form.kind} onChange={e => set('kind', e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #ccc', borderRadius: 6 }}>
              {KINDS.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', margin: '0 0 4px' }}>{isPercent ? 'Percent (0–100)' : 'Amount'}</label>
            <input type="number" step="0.01" min={isPercent ? 0 : 0} max={isPercent ? 100 : undefined}
                   value={form.amount} onChange={e => set('amount', e.target.value)}
                   style={{ width: '100%', padding: '8px 10px', border: '1px solid #ccc', borderRadius: 6 }} />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'block', margin: '0 0 4px', color: isPercent ? '#999' : undefined }}>
            Currency {isPercent ? '(not used for PERCENT)' : ''}
          </label>
          <select value={form.currency} onChange={e => set('currency', e.target.value)} disabled={isPercent}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #ccc', borderRadius: 6 }}>
            <option value="">— Select —</option>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <button type="submit" disabled={submitting} style={{ padding: '8px 12px' }}>
            {submitting ? (mode === 'edit' ? 'Saving…' : 'Creating…') : (mode === 'edit' ? 'Save' : 'Create')}
          </button>
          {mode === 'create' && (
            <button type="button" onClick={() => navigate('/additions')} style={{ padding: '8px 12px' }}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
