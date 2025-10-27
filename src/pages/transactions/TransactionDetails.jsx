// client/src/pages/transactions/TransactionDetails.jsx
import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getTransaction } from '../../api/transactions.api';

export default function TransactionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [state, setState] = React.useState({
    loading: true,
    error: null,
    tx: null,
  });

  React.useEffect(() => {
    let cancelled = false;
    setState(s => ({ ...s, loading: true, error: null }));
    getTransaction(id)
      .then((data) => {
        if (cancelled) return;
        setState({ loading: false, error: null, tx: data });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ loading: false, error: err?.message || 'Error', tx: null });
      });
    return () => { cancelled = true; };
  }, [id]);

  const { loading, error, tx } = state;

  const fmtMoney = (amt, cur) => {
    if (amt == null || !cur) return '—';
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur }).format(Number(amt)); }
    catch { return `${Number(amt).toFixed(2)} ${cur}`; }
  };
  const fmtDateTime = x => (x ? new Date(x).toLocaleString() : '—');

  // Defensive helpers (backend fields can have slight differences)
  const items = React.useMemo(() => Array.isArray(tx?.items) ? tx.items : [], [tx]);
  const adds  = React.useMemo(() => Array.isArray(tx?.additions) ? tx.additions : [], [tx]);

  // Try to derive subtotals when backend didn’t send precomputed totals
  const deriveItemLineTotal = (line) => {
    // prefer explicit line total if present
    if (line.line_total_amount != null) return Number(line.line_total_amount);
    if (line.subtotal_amount != null)   return Number(line.subtotal_amount);
    // fallback: qty * unit
    const qty = Number(line.quantity ?? 1);
    const unit = Number(line.unit_amount ?? line.price_amount ?? 0);
    return qty * unit;
  };
  const currency = tx?.total_currency || tx?.currency || items[0]?.unit_currency || adds[0]?.currency || 'USD';

  const itemsSubtotal = items.reduce((sum, it) => sum + (deriveItemLineTotal(it) || 0), 0);
  const additionsTotal = adds.reduce((sum, ad) => {
    // most backends provide computed_value/computed_amount for snapshot
    const v = ad.computed_value ?? ad.computed_amount ?? ad.amount ?? 0;
    // discounts are negative; taxes/fees/promotions positive (your backend already sets sign)
    return sum + Number(v || 0);
  }, 0);
  const grandTotal = tx?.total_amount != null ? Number(tx.total_amount) : (itemsSubtotal + additionsTotal);

  const headerRow = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 };
  const card = { border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff', padding: 16 };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={() => navigate(-1)} style={{ padding: '6px 10px' }}>← Back</button>
          <h1 style={{ margin: 0 }}>Transaction</h1>
        </div>
        <Link to="/transactions">All transactions</Link>
      </div>

      {/* Status + Summary */}
      <div style={{ ...card, marginBottom: 16 }}>
        {loading && <div>Loading…</div>}
        {error && !loading && <div style={{ color: '#b91c1c' }}>{String(error)}</div>}
        {!loading && !error && tx && (
          <>
            <div style={{ ...headerRow, marginBottom: 10 }}>
              <div>
                <div style={{ color: '#64748b', fontSize: 12 }}>Status</div>
                <StatusPill status={tx.status} />
              </div>
              <div>
                <div style={{ color: '#64748b', fontSize: 12 }}>Created</div>
                <div>{fmtDateTime(tx.created_at)}</div>
              </div>
              <div>
                <div style={{ color: '#64748b', fontSize: 12 }}>Email</div>
                <div>{tx.payer_email || '—'}</div>
              </div>
              <div>
                <div style={{ color: '#64748b', fontSize: 12 }}>Page</div>
                <div>{tx.page_code || '—'}</div>
              </div>
              <div>
                <div style={{ color: '#64748b', fontSize: 12 }}>Provider</div>
                <div>{tx.provider || '—'}</div>
              </div>
              <div>
                <div style={{ color: '#64748b', fontSize: 12 }}>Provider Ref</div>
                <div>{tx.provider_payment_id || tx.provider_id || '—'}</div>
              </div>
              <div style={{ gridColumn: '1 / -1', marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ color: '#64748b', fontSize: 12 }}>Transaction ID</div>
                <code style={{ fontSize: 12 }}>{tx.id}</code>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e5e7eb', margin: '12px 0' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
              {/* Receipt preview */}
              <div>
                {/* Items */}
                <Section title="Items">
                  <Table>
                    <thead>
                      <tr>
                        <Th style={{ width: 54 }}>Pos</Th>
                        <Th>Item</Th>
                        <Th style={{ width: 120 }}>Kind</Th>
                        <Th style={{ width: 80, textAlign: 'right' }}>Qty</Th>
                        <Th style={{ width: 140, textAlign: 'right' }}>Unit</Th>
                        <Th style={{ width: 140, textAlign: 'right' }}>Line total</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 && (
                        <tr><Td colSpan={6} center>No items</Td></tr>
                      )}
                      {items.map(line => {
                        const qty = Number(line.quantity ?? 1);
                        const unitAmt = Number(line.unit_amount ?? line.price_amount ?? 0);
                        const unitCur = line.unit_currency ?? line.currency ?? currency;
                        const lineTotal = deriveItemLineTotal(line);
                        return (
                          <tr key={line.id || `${line.ref_kind}:${line.ref_id}:${line.position}`}>
                            <Td>{line.position ?? '—'}</Td>
                            <Td>
                              <div style={{ fontWeight: 600 }}>{line.display_name || line.label || line.name || line.ref_kind}</div>
                              <div style={{ color: '#64748b', fontSize: 12 }}>
                                {line.ref_kind || line.kind} • {line.ref_id}
                              </div>
                            </Td>
                            <Td>{(line.ref_kind || line.kind || '').toString()}</Td>
                            <Td right>{qty}</Td>
                            <Td right>{fmtMoney(unitAmt, unitCur)}</Td>
                            <Td right>{fmtMoney(lineTotal, unitCur)}</Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </Section>

                {/* Additions */}
                <Section title="Additions">
                  <Table>
                    <thead>
                      <tr>
                        <Th style={{ width: 54 }}>Pos</Th>
                        <Th>Addition</Th>
                        <Th style={{ width: 120 }}>Type</Th>
                        <Th style={{ width: 120, textAlign: 'right' }}>Mode</Th>
                        <Th style={{ width: 140, textAlign: 'right' }}>Value</Th>
                        <Th style={{ width: 140, textAlign: 'right' }}>Applied</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {adds.length === 0 && (
                        <tr><Td colSpan={6} center>No additions</Td></tr>
                      )}
                      {adds.map(ad => {
                        const type = ad.kind || ad.type || ad.addition_type || ad.addition_kind; // TAX_FEE | PROMOTION | DISCOUNT
                        const mode = ad.mode || ad.value_mode || (ad.is_percentage ? 'PERCENT' : 'AMOUNT'); // AMOUNT | PERCENT
                        const value = ad.value ?? ad.amount ?? ad.percentage ?? ad.rate ?? 0;
                        const applied = ad.computed_value ?? ad.computed_amount ?? ad.amount_applied ?? 0;
                        const cur = ad.currency || currency;
                        return (
                          <tr key={ad.id || `${type}:${ad.position}:${ad.ref_id}`}>
                            <Td>{ad.position ?? '—'}</Td>
                            <Td>
                              <div style={{ fontWeight: 600 }}>{ad.display_name || ad.label || ad.name || type}</div>
                              <div style={{ color: '#64748b', fontSize: 12 }}>
                                {type}{ad.code_used ? ` • code: ${ad.code_used}` : ''}{(ad.apply_main_only || ad.applies_main_only) ? ' • base: items only' : ''}
                              </div>
                            </Td>
                            <Td>{type}</Td>
                            <Td right>{(mode || '').toString()}</Td>
                            <Td right>
                              {String(mode).toUpperCase() === 'PERCENT'
                                ? `${Number(value).toFixed(2)}%`
                                : fmtMoney(Number(value), cur)}
                            </Td>
                            <Td right>{fmtMoney(Number(applied), cur)}</Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </Section>
              </div>

              {/* Totals */}
              <div style={{ ...card }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Receipt</div>
                <Row label="Items subtotal" value={fmtMoney(itemsSubtotal, currency)} />
                <div style={{ height: 8 }} />
                {/* Show additions grouped: positive vs negative */}
                <Group title="Additions">
                  {adds.length === 0 && <div style={{ color: '#64748b' }}>—</div>}
                  {adds.map((ad, idx) => {
                    const label = ad.display_name || ad.label || ad.name || ad.kind || 'Addition';
                    const applied = Number(ad.computed_value ?? ad.computed_amount ?? ad.amount_applied ?? 0);
                    return <Row key={idx} label={label} value={fmtMoney(applied, ad.currency || currency)} small />;
                  })}
                </Group>
                <div style={{ borderTop: '1px dashed #e5e7eb', margin: '10px 0' }} />
                <Row label="Grand total" value={fmtMoney(grandTotal, currency)} big />
                {tx?.total_amount != null && (
                  <div style={{ color: '#64748b', fontSize: 12, marginTop: 6 }}>
                    (Server total: {fmtMoney(Number(tx.total_amount), tx.total_currency || currency)})
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 700, margin: '0 0 8px 0' }}>{title}</div>
      {children}
    </div>
  );
}

function Group({ title, children }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ color: '#64748b', fontSize: 12, marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value, small, big }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: big ? 18 : small ? 12 : 14,
      fontWeight: big ? 700 : 500,
      margin: big ? '6px 0' : '2px 0',
    }}>
      <div>{label}</div>
      <div>{value}</div>
    </div>
  );
}

function Table({ children }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
      {children}
    </table>
  );
}

function Th({ children, style }) {
  return (
    <th style={{ padding: '10px 12px', background: '#f9fafb', fontWeight: 600, textAlign: 'left', borderBottom: '1px solid #e5e7eb', ...style }}>
      {children}
    </th>
  );
}

function Td({ children, colSpan, center, right }) {
  return (
    <td colSpan={colSpan} style={{
      padding: '10px 12px',
      borderTop: '1px solid #e5e7eb',
      verticalAlign: 'top',
      textAlign: center ? 'center' : right ? 'right' : 'left',
    }}>
      {children}
    </td>
  );
}

function StatusPill({ status }) {
  const s = String(status || '').toUpperCase();
  const color = s === 'SUCCEEDED' ? '#0a7d2a' : s === 'FAILED' ? '#b10000' : '#334155';
  const bg = s === 'SUCCEEDED' ? '#e8f6ed' : s === 'FAILED' ? '#fdeaea' : '#f1f5f9';
  return (
    <span style={{ background: bg, color, padding: '2px 8px', borderRadius: 999, fontSize: 12 }}>
      {s || '—'}
    </span>
  );
}
