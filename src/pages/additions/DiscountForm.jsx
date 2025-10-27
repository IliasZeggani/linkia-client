import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createAddition } from '../../api/additions.api';

const CURRENCIES = ['USD', 'EUR', 'MAD'];
const KINDS = ['PERCENT', 'FIXED'];

export default function DiscountForm({ mode = 'create', initial, onSubmit, titleOverride }) {
    const navigate = useNavigate();
    const [form, setForm] = React.useState({
        name: '',
        description: '',
        is_active: true,
        kind: 'PERCENT',
        amount: '',
        currency: '',
        applies_main_only: false,
        code: '',
        unlimited: true,      // controls visibility & nulling of the two fields below
        expires_at: '',       // datetime-local (string) or ''
        max_uses: '',         // string/number or ''
    });

    const [submitting, setSubmitting] = React.useState(false);
    const [error, setError] = React.useState(null);

    React.useEffect(() => {
        if (initial) {
            setForm(f => {
                const expires_at = initial.expires_at || '';
                const max_uses = (initial.max_uses ?? '') === null ? '' : (initial.max_uses ?? '');
                const unlimited = !(expires_at || (max_uses !== '' && max_uses !== null));

                return {
                    ...f,
                    ...initial,
                    amount: initial.amount ?? '',
                    currency: initial.currency || '',
                    kind: initial.kind || 'PERCENT',
                    applies_main_only: !!initial.applies_main_only,
                    code: initial.code || '',
                    // NEW:
                    expires_at,
                    max_uses,
                    unlimited,
                };
            });

        }
    }, [initial]);

    const isPercent = form.kind === 'PERCENT';
    const set = (k, v) => setForm(s => ({ ...s, [k]: v }));
    const parseIntOrNull = (v) => {
        if (v === '' || v === null || v === undefined) return null;
        const n = Number(v);
        return Number.isInteger(n) && n >= 0 ? n : NaN;
    };

    const validate = () => {
        if (!form.name.trim()) return 'Name is required';
        const amount = Number(form.amount);
        if (!Number.isFinite(amount)) return 'Amount must be a number';
        if (isPercent) {
            if (amount < 0 || amount > 100) return 'Percent must be between 0 and 100';
        } else {
            if (amount < 0) return 'Amount must be ≥ 0';
            if (!form.currency) return 'Currency is required for FIXED discounts';
        }
        if (!form.unlimited) {
            if (form.max_uses !== '') {
                const mu = parseIntOrNull(form.max_uses);
                if (Number.isNaN(mu)) return 'Max uses must be a non-negative integer';
            }
            // expires_at: optional; backend will parse/validate if present
        }
        return null;
    };

    const buildPayload = () => {
        const unlimited = !!form.unlimited;

        return {
            type: 'DISCOUNT',
            name: form.name.trim(),
            description: form.description || '',
            is_active: !!form.is_active,
            code: form.code.trim() || null,
            discount: {
                kind: form.kind,
                amount: Number(form.amount),
                currency: isPercent ? null : form.currency,
                applies_main_only: !!form.applies_main_only,
                // NEW:
                expires_at: unlimited ? null : (form.expires_at || null),          // send null if unlimited or empty
                max_uses: unlimited ? null : (form.max_uses === '' ? null : Number(form.max_uses)),
            }
        };
    };

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
            setError(e?.response?.data?.error || e.message || (mode === 'edit' ? 'Error saving discount' : 'Error creating discount'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div>
            <h1 style={{ marginTop: 0 }}>{titleOverride || (mode === 'edit' ? 'Edit Discount' : 'New Discount')}</h1>

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
                            <input
                                type="radio"
                                name="scope"
                                checked={!!form.applies_main_only}
                                onChange={() => set('applies_main_only', true)}
                            />
                            Items only (exclude additions)
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input
                                type="radio"
                                name="scope"
                                checked={!form.applies_main_only}
                                onChange={() => set('applies_main_only', false)}
                            />
                            Items + additions
                        </label>
                        <div style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
                            This controls the base used for the calculation. “Items only” ignores extras/discounts/taxes, while “Items + additions” uses the full running total.
                        </div>
                    </div>

                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                    {/* Code */}
                    <label style={{ display: 'block', margin: '12px 0 4px' }}>Discount Code</label>
                    <input
                        value={form.code}
                        onChange={e => set('code', e.target.value)}
                        placeholder="e.g. SUMMER25"
                        style={{ width: '100%', padding: '8px 10px', border: '1px solid #ccc', borderRadius: 6 }}
                    />
                    <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                        This code will be used by customers on the public page.
                    </div>

                    {/* Unlimited + Expiry/Max Uses */}
                    <div style={{ marginTop: 12, padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input
                                type="checkbox"
                                checked={form.unlimited}
                                onChange={e => set('unlimited', e.target.checked)}
                            />
                            Unlimited
                        </label>

                        {!form.unlimited && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                                <div>
                                    <label style={{ display: 'block', margin: '0 0 4px' }}>Expires at</label>
                                    <input
                                        type="datetime-local"
                                        value={form.expires_at}
                                        onChange={e => set('expires_at', e.target.value)}
                                        style={{ width: '100%', padding: '8px 10px', border: '1px solid #ccc', borderRadius: 6 }}
                                    />
                                    <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                                        Leave empty if you only want a max count.
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', margin: '0 0 4px' }}>Max uses</label>
                                    <input
                                        type="number"
                                        min={0}
                                        step={1}
                                        value={form.max_uses}
                                        onChange={e => set('max_uses', e.target.value)}
                                        placeholder="e.g. 100"
                                        style={{ width: '100%', padding: '8px 10px', border: '1px solid #ccc', borderRadius: 6 }}
                                    />
                                    <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                                        Leave empty if you only want an expiry date.
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
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
