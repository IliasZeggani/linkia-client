// src/api/additions.api.js
import http from './http';

/** List additions with catalog-style filters & server-side sorting/pagination */
export async function listAdditions({
  page = 1,
  pageSize = 25,
  q = '',
  type = 'ALL',          //  DISCOUNT | TAXFEE | ALL
  isActive = 'ALL',      // 'ALL' | 'true' | 'false'
  sort = 'updated_at',   // name | type | is_active | created_at | updated_at
  dir = 'desc',          // asc | desc
} = {}) {
  const params = new URLSearchParams();

  // paging
  params.set('page', page);
  params.set('pageSize', pageSize);

  // search/filter
  if (q) params.set('q', q);
  if (type && type !== 'ALL') params.set('type', type);
  if (isActive && isActive !== 'ALL') params.set('isActive', isActive);

  // sorting
  if (sort) params.set('sort', sort);
  if (dir) params.set('dir', dir);

  const { data } = await http.get('/catalog/additions', { params });
  // { items, total, limit, offset }
  return data;
}

export async function getAdditionDetails(id) {
  const { data } = await http.get(`/catalog/additions/${id}`);
  return data;
}

export async function createAddition(payload) {
  const { data } = await http.post('/catalog/additions', payload);
  return data; // { id, ... }
}

export async function updateAddition(id, payload) {
  const { data } = await http.put(`/catalog/additions/${id}`, payload);
  return data;
}
