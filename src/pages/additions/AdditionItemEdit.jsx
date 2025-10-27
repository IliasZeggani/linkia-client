// src/pages/additions/AdditionItemEdit.jsx
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAdditionDetails, updateAddition } from '../../api/additions.api';

// Reuse the same 3 forms, now in edit mode
import DiscountForm from './DiscountForm';
import TaxFeeForm from './TaxFeeForm';
import PromotionForm from './PromotionForm';

export default function AdditionItemEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const out = await getAdditionDetails(id);
        if (!cancelled) setData(out);
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.error || e.message || 'Error loading addition');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const handleSubmit = async (payload) => {
    try {
      // normalize code shape for DISCOUNT (in case backend expects discount.code)
      if (data?.type === 'DISCOUNT' && payload?.code && !(payload.discount && 'code' in payload.discount)) {
        payload = { ...payload, discount: { ...(payload.discount || {}), code: payload.code } };
        // you may keep payload.code as-is, or delete it:
        // delete payload.code;
      }

      await updateAddition(id, payload);
      alert('Updated successfully ✅');

      const fresh = await getAdditionDetails(id);
      setData(fresh);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Error updating addition');
    }
  };

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (error) return <div style={{ padding: 24, color: '#b91c1c' }}>{error}</div>;
  if (!data) return null;

  const common = {
    // Pass initial base fields
    initial: {
      name: data.name || '',
      description: data.description || '',
      is_active: !!data.is_active,
      // type-specific fields mapped below
    },
    mode: 'edit',
    onSubmit: handleSubmit,
  };

  let body = null;

  if (data.type === 'DISCOUNT') {
    body = (
      <DiscountForm
        {...common}
        titleOverride={`Edit Discount`}
        initial={{
          ...common.initial,
          kind: data.discount?.kind || 'PERCENT',
          amount: data.discount?.amount ?? '',
          currency: data.discount?.currency || '',
          applies_main_only: !!data.discount?.applies_main_only,
          code: data.discount?.code || '',
          // NEW:
          expires_at: data.discount?.expires_at || '',
          max_uses: data.discount?.max_uses ?? '',
        }}
      />
    );
  } else if (data.type === 'TAXFEE') {
    body = (
      <TaxFeeForm
        {...common}
        titleOverride={`Edit Tax/Fee`}
        initial={{
          ...common.initial,
          kind: data.taxfee?.kind || 'PERCENT',
          amount: data.taxfee?.amount ?? '',
          currency: data.taxfee?.currency || '',
          applies_main_only: !!data.taxfee?.applies_main_only,
        }}
      />
    );
  } else if (data.type === 'PROMOTION') {
    body = (
      <PromotionForm
        {...common}
        titleOverride={`Edit Promotion`}
        initial={{
          ...common.initial,
          kind: data.promotion?.kind || 'PERCENT',
          amount: data.promotion?.amount ?? '',
          currency: data.promotion?.currency || '',
          applies_main_only: !!data.promotion?.applies_main_only,
        }}
      />
    );
  } else {
    body = <div style={{ padding: 24, color: '#b91c1c' }}>Unsupported type.</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 12 }}>
        <button onClick={() => navigate('/additions')} style={{ padding: '6px 10px' }}>← Back</button>
      </div>
      {body}
    </div>
  );
}
