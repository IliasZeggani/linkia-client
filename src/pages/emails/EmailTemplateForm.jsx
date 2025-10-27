// src/pages/emails/EmailTemplateForm.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getEmailTemplate,
  createEmailTemplate,
  updateEmailTemplate,
} from '../../api/emails.api';

export default function EmailTemplateForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = useMemo(() => Boolean(id), [id]);

  const isDefault = useMemo(() => id && String(id).startsWith('default:'), [id]);

  // form state
  const [name, setName] = useState('');
  const [kind, setKind] = useState('PAYER_RECEIPT'); // default
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [active, setActive] = useState(true);

  // ui state
  const [loading, setLoading] = useState(!!isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // load details when editing
  useEffect(() => {
    let mounted = true;
    if (!isEdit) return;
    setLoading(true);
    getEmailTemplate(id)
      .then((data) => {
        if (!mounted) return;
        setName(data.name || '');
        setKind(data.kind || 'PAYER_RECEIPT');
        setSubject(data.subject || '');
        setBody(data.body || '');
        setActive(Boolean(data.is_active));
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.response?.data?.message || 'Failed to load template.');
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [id, isEdit]);

  const validate = () => {
    if (!name.trim()) return 'Name is required';
    if (!subject.trim()) return 'Subject is required';
    if (!body.trim()) return 'Body is required';
    if (!['PAYER_RECEIPT', 'MERCHANT_NOTIFY'].includes(kind)) return 'Invalid kind';
    return '';
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    if (isDefault) {
      // Should never happen because Save is hidden, but guard anyway
      setError('Default templates are read-only.');
      return;
    }

    setError('');
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setSaving(true);
    const payload = {
      name: name.trim(),
      kind,
      subject: subject.trim(),
      body: body, // keep as-is
      is_active: !!active,
    };
    try {
      if (isEdit) {
        await updateEmailTemplate(id, payload);
      } else {
        await createEmailTemplate(payload);
      }
      navigate('/emails/templates');
    } catch (ex) {
      setError(ex?.response?.data?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>{isEdit ? 'Edit Email Template' : 'New Email Template'}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => navigate('/emails/templates')}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, background: '#fff' }}
          >
            Cancel
          </button>
          {!isDefault && (
            <button
              form="email-template-form"
              type="submit"
              disabled={saving}
              style={{ padding: '8px 12px', border: '1px solid #111', borderRadius: 6, background: '#111', color: '#fff', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : (
        <>
          {isDefault && (
            <div style={{ marginBottom: 12, padding: 10, border: '1px solid #dbeafe', background: '#eff6ff', color: '#1e40af', borderRadius: 6 }}>
              This is a built-in <b>Default</b> template. It’s read-only and used automatically when a page doesn’t select a custom template.
            </div>
          )}
          <form id="email-template-form" onSubmit={onSubmit}>
            {/* error */}
            {error ? (
              <div style={{ marginBottom: 12, padding: 10, border: '1px solid #f7d7d7', background: '#fff5f5', color: '#a94442', borderRadius: 6 }}>
                {error}
              </div>
            ) : null}

            {/* card */}
            <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Name *</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Template name"
                    disabled={isDefault}
                    style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 6 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Kind *</label>
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value)}
                    disabled={isDefault}
                    style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 6 }}
                  >
                    <option value="PAYER_RECEIPT">PAYER_RECEIPT</option>
                    <option value="MERCHANT_NOTIFY">MERCHANT_NOTIFY</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Subject *</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={isDefault}
                  placeholder="Email subject"
                  style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 6 }}
                />
              </div>

              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Body *</label>
                  <small style={{ opacity: 0.7 }}>
                    Plain text supported. Placeholders (if any) handled by backend.
                  </small>
                </div>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Email body..."
                  rows={16}
                  disabled={isDefault}
                  style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 6, fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ marginTop: 16 }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    disabled={isDefault}
                  />
                  Active
                </label>
              </div>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
