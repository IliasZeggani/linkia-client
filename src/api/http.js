import axios from 'axios';
import { getRefreshToken, setRefreshToken, clearRefreshToken, getRefreshScope } from '../utils/storage';

const API_BASE = (process.env.REACT_APP_API_BASE || '').replace(/\/+$/, ''); // e.g. https://linkia-server.onrender.com/api

// Keep access token only in memory
let accessToken = null;
export const setAccessToken = (token) => {
  accessToken = token || null;
};

// Axios instance
const http = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token automatically
http.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// --- Refresh token logic ---
let isRefreshing = false;
let refreshPromise = null;
let subscribers = [];

const subscribeTokenRefresh = (cb) => subscribers.push(cb);
const onRefreshed = (newAccess) => {
  subscribers.forEach((cb) => cb(newAccess));
  subscribers = [];
};

async function doRefresh() {
  const rt = getRefreshToken();
  if (!rt) throw new Error('No refresh token');

  // IMPORTANT: use the same http instance and no extra /api
  const resp = await http.post('/auth/refresh', { refreshToken: rt });
  const { accessToken: at, refreshToken: newRt } = resp.data || {};
  if (!at || !newRt) throw new Error('Bad refresh response');

  setAccessToken(at);
  setRefreshToken(newRt, getRefreshScope());
  return at;
}

http.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    const status = error?.response?.status;

    if (status === 401 && !original._retry) {
      original._retry = true;
      try {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshPromise = doRefresh()
            .then((newAt) => { onRefreshed(newAt); return newAt; })
            .finally(() => { isRefreshing = false; refreshPromise = null; });
        }
        const newAccess = await refreshPromise;
        return http({ ...original, headers: { ...(original.headers || {}), Authorization: `Bearer ${newAccess}` } });
      } catch {
        clearRefreshToken();
        setAccessToken(null);
        subscribers = [];
        isRefreshing = false;
        refreshPromise = null;
      }
    }
    return Promise.reject(error);
  }
);

export default http;
