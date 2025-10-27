// src/pages/catalog/CatalogItemEdit.jsx
import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getCatalogItemDetails, updateCatalogItem } from '../../api/catalog.api';

import ProductForm from './ProductForm';
import SubscriptionForm from './SubscriptionForm';
import ServiceForm from './ServiceForm';
import PlainPriceForm from './PlainPriceForm';

export default function CatalogItemEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [state, setState] = React.useState({ loading: true, error: null, data: null, saving: false });

  React.useEffect(() => {
    let mounted = true;
    setState(s => ({ ...s, loading: true, error: null }));
    getCatalogItemDetails(id)
      .then(data => mounted && setState({ loading: false, error: null, data, saving: false }))
      .catch(err => mounted && setState({ loading: false, error: err, data: null, saving: false }));
    return () => { mounted = false; };
  }, [id]);

  const handleUpdate = async (payload) => {
    try {
      setState(s => ({ ...s, saving: true }));
      await updateCatalogItem(id, payload);
      setState(s => ({ ...s, saving: false }));
      // stay on page after save, or navigate if you prefer
    } catch (err) {
      setState(s => ({ ...s, saving: false }));
      alert(err?.response?.data?.error || err.message || 'Update failed');
    }
  };

  const renderForm = () => {
    const d = state.data;
    if (!d) return null;

    const base = {
      name: d.name,
      description: d.description,
      is_active: d.is_active,
    };

    switch (d.type) {
      case 'PRODUCT': {
        const initialValues = { ...base, product: (d.product || {}) };
        return <ProductForm mode="edit" initialValues={initialValues} onSubmit={handleUpdate} />;
      }
      case 'SUBSCRIPTION': {
        const initialValues = { ...base, subscription: (d.subscription || {}) };
        return <SubscriptionForm mode="edit" initialValues={initialValues} onSubmit={handleUpdate} />;
      }
      case 'SERVICE': {
        const initialValues = { ...base, service: (d.service || {}) };
        return <ServiceForm mode="edit" initialValues={initialValues} onSubmit={handleUpdate} />;
      }
      case 'PLAIN': {
        const initialValues = { ...base, plain: (d.plain || {}) };
        return <PlainPriceForm mode="edit" initialValues={initialValues} onSubmit={handleUpdate} />;
      }
      default:
        return <div style={{ color: 'crimson' }}>Unknown type: {String(d.type)}</div>;
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/catalog">← Back to catalog</Link>
      </div>

      {state.loading && <div>Loading…</div>}
      {state.error && <div style={{ color: 'crimson' }}>{String(state.error?.message || state.error)}</div>}

      {!state.loading && !state.error && state.data && (
        <>
          <div style={{ marginBottom: 12, color: '#666', fontSize: 12 }}>
            ID: <code>{id}</code> • Type: <b>{state.data.type}</b> {state.saving ? '• Saving…' : null}
          </div>
          {renderForm()}
        </>
      )}

      {!state.loading && !state.error && !state.data && (
        <div style={{ color: '#666' }}>
          Item not found. <Link to="/catalog">Go back to list</Link>
        </div>
      )}
    </div>
  );
}
