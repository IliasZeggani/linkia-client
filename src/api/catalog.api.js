import http from './http';

/**
 * Create a catalog item.
 * Payload shape depends on `type`: PRODUCT | SUBSCRIPTION | SERVICE | PLAIN
 * Example:
 *  { type:'PLAIN', name:'Gift Card', is_active:true, plain:{ price: 15, currency:'USD' } }
 */
export async function createCatalogItem(payload) {
  const { data } = await http.post('/catalog/items', payload);
  return data;
}

/**
 * Update a catalog item by id.
 * Send the same shape as create; include ids on nested entities you’re retaining (plans/intervals/etc).
 */
export async function updateCatalogItem(id, payload) {
  const { data } = await http.put(`/catalog/items/${id}`, payload);
  return data;
}

export async function listCatalogItems({
  page = 1,
  pageSize = 25,
  q = '',
  type = 'ALL',       // 'PRODUCT' | 'SUBSCRIPTION' | 'SERVICE' | 'PLAIN' | 'ALL'
  isActive = null,    // true | false | null
  sort = 'updated_at',
  dir = 'desc',
}) {
  const params = new URLSearchParams();
  // paging
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));

  // filters
  if (q) params.set('q', q);
  if (type && type !== 'ALL') params.set('type', type);
  if (isActive !== null) params.set('is_active', isActive ? 'true' : 'false');

  // sorting
  if (sort) params.set('sort', sort);
  if (dir) params.set('dir', dir);

  const { data } = await http.get('/catalog/items', { params });
  return data; // { items, total, limit, offset }
}


export async function getCatalogItemDetails(id) {
  const { data } = await http.get(`/catalog/items/${id}`);
  // Expected shape: { id, name, type, ... base fields ..., product|subscription|service|plain: {...} }
  return data;
}

// --- Extended catalog “leaf” list for Pages picker ---
// Returns a flattened list of purchasable rows:
// Plain price, Product w/o variations, Product variations, Service plans, Subscription intervals
export async function listCatalogItemsExtended({
  page = 1,
  pageSize = 25,
  q = '',
  isActive = 'ALL',     // 'ALL' | 'true' | 'false'
  sort = 'updated_at',  // label | type | price | currency | is_active | updated_at
  dir = 'desc',         // asc | desc
} = {}) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  if (q) params.set('q', q);
  if (isActive !== 'ALL') params.set('is_active', isActive === 'true' ? 'true' : 'false');
  if (sort) params.set('sort', sort);
  if (dir) params.set('dir', dir);

  const { data } = await http.get(`/catalog/items/extended?${params.toString()}`);
  // { total, page, pageSize, rows: [{ ref_kind, ref_id, label, type_label, price, currency, is_active, updated_at }] }
  return data;
}
