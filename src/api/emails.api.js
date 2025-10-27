// src/api/emails.api.js
import http from './http';

function buildQuery(params) {
  const qp = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (typeof v === 'string' && v.trim() === '') return;
    qp.set(k, v);
  });
  const s = qp.toString();
  return s ? `?${s}` : '';
}

/** =====================
 *  Email Templates
 *  ===================== */
export async function listEmailTemplates({ page = 1, pageSize = 25, q = '', kind = 'ALL', active = 'ALL', sort = 'updated_at', dir = 'desc', } = {}) {
  const is_active = active; // backend expects is_active|isActive
  const query = buildQuery({ page, pageSize, q, kind, is_active, sort, dir });
  const { data } = await http.get(`/email/templates${query}`);
  return data; // { rows, total, page, pageSize, sort, dir }
}

export async function getEmailTemplate(id) {
  const { data } = await http.get(`/email/templates/${id}`);
  return data;
}

export async function createEmailTemplate(payload) {
  const { data } = await http.post(`/email/templates`, payload);
  return data;
}

export async function updateEmailTemplate(id, payload) {
  const { data } = await http.put(`/email/templates/${id}`, payload);
  return data;
}

/** =====================
 *  Email Outbox
 *  ===================== */
export async function listEmailOutbox({
  page = 1,
  pageSize = 25,
  q = '',
  status = '',        // '' | 'SENT' | 'FAILED'
  templateId = '',    // uuid
  from = '',          // ISO date 'YYYY-MM-DD'
  to = '',            // ISO date 'YYYY-MM-DD'
  sort = 'sent_at',
  dir = 'desc',
} = {}) {
  const template_id = templateId;
  const query = buildQuery({ page, pageSize, q, status, template_id, from, to, sort, dir });
  const { data } = await http.get(`/email/outbox${query}`);
  return data; // { rows, total, ... }
}

export async function getEmailOutbox(id) {
  const { data } = await http.get(`/email/outbox/${id}`);
  return data;
}
