import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import http, { setAccessToken as setHttpAccessToken } from '../api/http';
import { getRefreshToken, setRefreshToken, clearRefreshToken } from '../utils/storage';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null);
  const [user, setUser] = useState(null);
  const [activeOrgId, _setActiveOrgId] = useState(null);
  const [booting, setBooting] = useState(true);
  const [activeMode, _setActiveMode] = useState('PRODUCTION');

  const applyTokens = useCallback(({ accessToken: at, refreshToken: rt }, opts = {}) => {
    if (at) { setAccessToken(at); setHttpAccessToken(at); }
    // opts.scope: 'local' | 'session' | undefined
    if (rt) setRefreshToken(rt, opts.scope);
  }, []);

  const logout = useCallback(async () => {
    const rt = getRefreshToken();
    try {
      if (rt) {
        await http.post('/auth/logout', { refreshToken: rt });
      }
    } catch (_) {
    } finally {
      clearRefreshToken();
      setAccessToken(null);
      setHttpAccessToken(null);
      setUser(null);
      _setActiveOrgId(null);
      _setActiveMode('PRODUCTION');
    }
  }, []);

  const loadMe = useCallback(async () => {
    try {
      const res = await http.get('/me');
      const data = res.data || {};

      const baseUser = data?.user || data || {};
      const mergedUser = {
        ...baseUser,
        organizations: baseUser.organizations ?? data?.organizations ?? [],
      };
      setUser(mergedUser);

      // Prefer the session-scoped activeOrgId, then organizations[].is_active, then first org
      let orgId =
        data?.activeOrgId ??
        data?.active_org_id ??
        (Array.isArray(data?.organizations) && data.organizations.find(o => o.is_active)?.id) ??
        (Array.isArray(data?.organizations) && data.organizations[0]?.id) ??
        null;

      if (orgId) {
        orgId = String(orgId);
        _setActiveOrgId(orgId);
      } else {
        _setActiveOrgId(null);
      }

      const mode =
        data?.activeMode ??
        data?.active_mode ??
        'PRODUCTION';
      _setActiveMode(String(mode).toUpperCase());

      return data;
    } catch (e) {
      // if /me fails badly, consider logout later; here we just bubble up
      throw e;
    }
  }, []);

  const login = useCallback(async ({ email, password, rememberMe }) => {
    const res = await http.post('/auth/login', { email, password, rememberMe: !!rememberMe });
    applyTokens(res.data, { scope: rememberMe ? 'local' : 'session' });
    const me = await loadMe();
    return me;
  }, [applyTokens, loadMe]);

  const refresh = useCallback(async () => {
    const rt = getRefreshToken();
    if (!rt) return null;
    const res = await http.post('/auth/refresh', { refreshToken: rt });
    applyTokens(res.data);
    if (res.data?.activeOrgId) {
      const orgId = String(res.data.activeOrgId);
      _setActiveOrgId(orgId);
    }
    if (res.data?.activeMode || res.data?.active_mode) {
      const mode = res.data.activeMode ?? res.data.active_mode;
      _setActiveMode(String(mode).toUpperCase());
    }

    return res.data;
  }, [applyTokens]);


  const setActiveOrg = useCallback(async (id) => {
    // Ask server to switch this SESSION's active org; get back a fresh AT
    const { data } = await http.post('/org/switch', { orgId: id });
    const newAT = data?.accessToken;
    const newOrgId = String(data?.activeOrgId ?? id);
    if (newAT) {
      setAccessToken(newAT);
      setHttpAccessToken(newAT);
    }
    _setActiveOrgId(newOrgId);
    return newOrgId;
  }, []);

  const setActiveMode = useCallback(async (mode) => {
    const value = String(mode).toUpperCase();
    const { data } = await http.patch('/session/mode', { mode: value });
    const m = data?.session?.activeMode ?? value;
    _setActiveMode(String(m).toUpperCase());
    return m;
  }, []);


  // Boot: try refresh then /me
  useEffect(() => {
    (async () => {
      try {
        if (getRefreshToken()) {
          const tokens = await refresh();
          if (tokens?.accessToken) {
            await loadMe();
          }
        }
      } catch (_) {
        // ignore; user stays logged out
      } finally {
        setBooting(false);
      }
    })();
  }, [refresh, loadMe]);

const value = useMemo(() => ({
  booting,
  accessToken,
  user,
  activeOrgId,
  activeMode,
  setActiveOrg,
  setActiveMode,
  login,
  logout,
  refresh,
  loadMe,
  applyTokens
}), [booting, accessToken, user, activeOrgId, activeMode, setActiveOrg, setActiveMode, login, logout, refresh, loadMe, applyTokens]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
