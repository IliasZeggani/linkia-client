const RT_KEY = 'rt';
const RT_SCOPE_KEY = 'rt_scope'; // 'local' | 'session'
const ORG_KEY    = 'activeOrgId';

export function getRefreshToken() {
  return localStorage.getItem(RT_KEY) || sessionStorage.getItem(RT_KEY) || null;
}

export function getRefreshScope() {
  const s = localStorage.getItem(RT_SCOPE_KEY);
  return s === 'local' ? 'local' : 'session';
}

// scope: 'local' | 'session' | undefined
export function setRefreshToken(token, scope) {
  if (scope) localStorage.setItem(RT_SCOPE_KEY, scope);
  const resolved = scope || getRefreshScope();
  if (resolved === 'local') {
    localStorage.setItem(RT_KEY, token);
    sessionStorage.removeItem(RT_KEY);
  } else {
    sessionStorage.setItem(RT_KEY, token);
    localStorage.removeItem(RT_KEY);
  }
}

export function clearRefreshToken() {
  localStorage.removeItem(RT_KEY);
  sessionStorage.removeItem(RT_KEY);
  localStorage.removeItem(RT_SCOPE_KEY);
}

export const getActiveOrgId = () => localStorage.getItem(ORG_KEY);
export const setActiveOrgId = (id) => localStorage.setItem(ORG_KEY, id ?? '');
