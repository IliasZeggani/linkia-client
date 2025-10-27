// src/pages/emails/EmailOutboxDetails.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getEmailOutbox, listEmailTemplates } from '../../api/emails.api';

function Field({ label, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 12, padding: '8px 0', borderBottom: '1px solid #f4f4f4' }}>
      <div style={{ color: '#666' }}>{label}</div>
      <div style={{ minHeight: 20 }}>{children ?? '—'}</div>
    </div>
  );
}

export default function EmailOutboxDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [tpls, setTpls] = useState([]);
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let mounted = true;
    async function run() {
      try {
        setLoading(true);
        const [outbox, tplList] = await Promise.all([
          getEmailOutbox(id),
          listEmailTemplates({ page: 1, pageSize: 1000, is_active: 'ALL' }),
        ]);
        if (!mounted) return;
        setData(outbox);
        setTpls(Array.isArray(tplList?.rows) ? tplList.rows : (tplList?.items || []));
      } catch (e) {
        if (!mounted) return;
        setErr(e?.response?.data?.message || 'Failed to load email.');
      } finally {
        mounted && setLoading(false);
      }
    }
    run();
    return () => { mounted = false; };
  }, [id]);

  const templateName = data
    ? (data.template_name || tpls.find(t => t.id === data.template_id)?.name || data.template_id)
    : '';

  const fmt = (v) => (v ? new Date(v).toLocaleString() : '');

  return (
    <div style={{ padding: 20, maxWidth: 1000 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Outbox Email</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => navigate('/emails/outbox')}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, background: '#fff' }}
          >
            Back to Outbox
          </button>
        </div>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : err ? (
        <div style={{ marginBottom: 12, padding: 10, border: '1px solid #f7d7d7', background: '#fff5f5', color: '#a94442', borderRadius: 6 }}>
          {err}
        </div>
      ) : !data ? (
        <div>Not found.</div>
      ) : (
        <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
          {/* Header summary */}
          <div style={{ padding: 14, background: '#fafafa', borderBottom: '1px solid #eee' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
              <div>
                <div style={{ fontSize: 14, color: '#666' }}>Subject</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{data.subject || '—'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: '#666' }}>Status</div>
                <div style={{ fontSize: 14 }}>
                  {data.status === 'SENT' ? (
                    <span style={{ padding: '2px 8px', background: '#e8f5e9', color: '#2e7d32', borderRadius: 12 }}>SENT</span>
                  ) : data.status === 'FAILED' ? (
                    <span style={{ padding: '2px 8px', background: '#ffebee', color: '#c62828', borderRadius: 12 }}>FAILED</span>
                  ) : (
                    <span style={{ padding: '2px 8px', background: '#eceff1', color: '#455a64', borderRadius: 12 }}>{data.status || '—'}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: 16 }}>
            <Field label="To">
              <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{data.to_email || '—'}</div>
            </Field>

            <Field label="CC">
              <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{data.cc || '—'}</div>
            </Field>

            <Field label="BCC">
              <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{data.bcc || '—'}</div>
            </Field>

            <Field label="Template">
              {data.template_id ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Link to={`/emails/templates/${data.template_id}`} style={{ textDecoration: 'none' }}>
                    {templateName || data.template_id}
                  </Link>
                  {!data.template_name && !tpls.find(t => t.id === data.template_id) ? (
                    <span style={{ fontSize: 12, color: '#999' }}>(not found)</span>
                  ) : null}
                </div>
              ) : (
                <span style={{ padding: '2px 6px', borderRadius: 10, background: '#eef2ff', color: '#3730a3', fontSize: 11 }}>
                  Default
                </span>
              )}
            </Field>

            <Field label="Attempts">{data.attempts ?? 0}</Field>

            <Field label="Provider">{data.provider || '—'}</Field>

            <Field label="Provider Msg ID">
              <div style={{ fontFamily: 'monospace' }}>{data.provider_message_id || '—'}</div>
            </Field>

            <Field label="Error Message">
              <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: data.error_message ? '#c62828' : undefined }}>
                {data.error_message || '—'}
              </div>
            </Field>

            <Field label="Scheduled At">{fmt(data.scheduled_at)}</Field>
            <Field label="Sent At">{fmt(data.sent_at)}</Field>

            <Field label="Transaction">
              {data.transaction_id ? (
                <Link to={`/transactions/${data.transaction_id}`}>{data.transaction_id}</Link>
              ) : '—'}
            </Field>

            <Field label="Created">{fmt(data.created_at)}</Field>
            <Field label="Updated">{fmt(data.updated_at)}</Field>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>Body</div>
              <div
                style={{
                  border: '1px solid #eee',
                  borderRadius: 6,
                  padding: 12,
                  minHeight: 120,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  background: '#fff',
                  fontFamily: 'monospace',
                  overflowX: 'auto',
                }}
              >
                {data.body || '—'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
