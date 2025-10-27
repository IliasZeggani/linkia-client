import http from './http';

export const listOrgs = () => http.get('/org');
export const createOrg = (name) => http.post('/org', { name });
export const renameOrg = (id, name) => http.patch(`/org/${id}`, { name });
export const switchOrg = (id) => http.post('/org/switch', { orgId: id });
export const createInitialOrg = (name) => http.post('/org/create-initial', { name });
