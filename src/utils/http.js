import axios from 'axios';
import { getRefreshToken, setRefreshToken, clearRefreshToken } from '../utils/storage';

// Access token lives only in memory
let accessToken = null;
export const setAccessToken = (token) => { accessToken = token || null; };

const http = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach bearer if present
http.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// === Refresh queue (avoid multiple parallel refresh calls)
let isRefreshing = false;
let refreshPromise = null;
let subscribers = [];

function onRefreshed(newAccess) {
  subscribers.forEach((cb) => cb(newAccess));
  subscribers = [];
}
function addSubscriber(cb) {
  subscribers.push(cb);
}

async function doRefresh() {
  const rt = getRefreshToken();
  if (!rt) throw new Error('No refresh token');
  const resp = await axios.post('/api/auth/refresh', { refreshToken: rt });
  const { accessToken: at, refreshToken: newRt } = resp.data || {};
  if (!at || !newRt) throw new Error('Bad refresh response');
  setAccessToken(at);
  setRefreshToken(newRt); // keep same persistence scope
  return at;
}

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { response, config } = error;
    if (response?.status === 401 && !config.__isRetryRequest) {
      // likely access token expired — try refresh once
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = doRefresh()
          .then((newAccess) => {
            onRefreshed(newAccess);
            return newAccess;
          })
          .finally(() => {
            isRefreshing = false;
            refreshPromise = null;
          });
      }

      return new Promise((resolve, reject) => {
        addSubscriber((newAccess) => {
          if (!newAccess) return reject(error);
          const retry = { ...config, __isRetryRequest: true };
          retry.headers = { ...(retry.headers || {}), Authorization: `Bearer ${newAccess}` };
          resolve(http(retry));
        });
      }).catch((e) => {
        // hard reset on any refresh failure
        clearRefreshToken();
        setAccessToken(null);
        subscribers = [];
        isRefreshing = false;
        refreshPromise = null;
        return Promise.reject(e);
      });
    }

    return Promise.reject(error);
  }
);

export default http;
