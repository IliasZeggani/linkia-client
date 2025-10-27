// src/api/pages.api.js
import http from './http';

/** List pages with server-side filters/sort/pagination */
export async function listPages({
  page = 1,
  pageSize = 25,
  q = '',
  isActive = 'ALL',       // 'ALL' | 'true' | 'false'
  sort = 'updated_at',    // name | code | is_active | expires_at | created_at | updated_at | items_count | additions_count
  dir = 'desc',           // asc | desc
} = {}) {
  const params = new URLSearchParams();

  // paging
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));

  // filters
  if (q) params.set('q', q);
  if (isActive !== 'ALL') {
    params.set('active', isActive === 'true' ? 'true' : 'false');
  }

  // sorting
  if (sort) params.set('sort', sort);
  if (dir) params.set('dir', dir);

  const { data } = await http.get(`/pages?${params.toString()}`);
  // data: { total, page, pageSize, rows: [...] }
  return data;
}

/** (will use later) Get page details by id */
export async function getPageDetails(id) {
  const { data } = await http.get(`/pages/${id}`);
  return data;
}

/** (will use later) Create a page */
export async function createPage(payload) {
  const { data } = await http.post('/pages', payload);
  return data; // { id, ... }
}

/** (will use later) Update a page */
export async function updatePage(id, payload) {
  const { data } = await http.put(`/pages/${id}`, payload);
  return data;
}

/** (will use later) Public page by code */
export async function getPublicPageByCode(code, opts = {}) {
  const params = new URLSearchParams();
  if (opts.password) params.set('password', opts.password);
  const res = await fetch(`/api/public/pages/${encodeURIComponent(code)}?` + params.toString(), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
  return res.json();
}

// Public: lookup a discount by name for a page code
export async function lookupPublicDiscount(pageCode, discountCode) {
  const { data } = await http.post(
    `/public/pages/${encodeURIComponent(pageCode)}/discounts/lookup`,
    { code: discountCode }
  );
  return data;
}

// Create a transaction from a public page
export async function createPublicTransaction(pageCode, { email, selections, discountCode }) {
  if (!pageCode) throw new Error('pageCode is required');
  const body = {
    email: (email || '').trim(),
    selections: selections || {},
    discountCode: (discountCode || '').trim() || undefined,
  };
  const { data } = await http.post(
    `/public/pages/${encodeURIComponent(pageCode)}/transactions`,
    body
  );
  return data;
}
