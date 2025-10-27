// client/src/api/transactions.api.js
import http from './http';

/** List transactions (server-side filters/sort/pagination) */
export async function listTransactions({
  page = 1,
  pageSize = 25,
  status = '',        // 'SUCCEEDED' | 'FAILED' | ''
  email = '',         // ILIKE
  page_code = '',     // exact
  from = '',          // YYYY-MM-DD (inclusive)
  to = '',            // YYYY-MM-DD (exclusive)
  sort = 'created_at',
  dir = 'desc',
} = {}) {
  const params = new URLSearchParams();

  // paging
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));

  // filters (only send when present)
  if (status) params.set('status', status);
  if (email) params.set('email', email.trim());
  if (page_code) params.set('page_code', page_code.trim());
  if (from) params.set('from', from);
  if (to) params.set('to', to);

  // sorting
  const safeDir = dir === 'asc' ? 'asc' : 'desc';
  const allowedSort = new Set(['created_at', 'total_paid', 'payer_email', 'status']);
  const safeSort = allowedSort.has(sort) ? sort : 'created_at';

  params.set('sort', safeSort);
  params.set('dir', safeDir);

  const { data } = await http.get(`/transactions?${params.toString()}`);
  return data;
}

// Read a single transaction
export async function getTransaction(id) {
  const { data } = await http.get(`/transactions/${id}`);
  return data;
}
