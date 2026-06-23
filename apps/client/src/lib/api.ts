import axios from 'axios';

const baseURL = `${import.meta.env.VITE_API_URL ?? 'http://localhost:5000'}/api`;

export const api = axios.create({ baseURL });

const ACCESS_KEY = 'auth_token';
const REFRESH_KEY = 'auth_refresh_token';

export const tokenStore = {
  get: () => localStorage.getItem(ACCESS_KEY),
  set: (t: string) => localStorage.setItem(ACCESS_KEY, t),
  clear: () => localStorage.removeItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  setRefresh: (t: string) => localStorage.setItem(REFRESH_KEY, t),
  clearAll: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

// Attach the bearer token to every request.
api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

function processQueue(token: string) {
  refreshQueue.forEach((cb) => cb(token));
  refreshQueue = [];
}

// On 401: silently refresh access token using the stored refresh token.
// If refresh also fails, clear all tokens and redirect to login.
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    const is401 = axios.isAxiosError(err) && err.response?.status === 401;
    const isAuthEndpoint = original?.url?.includes('/auth/refresh') || original?.url?.includes('/auth/login');

    if (is401 && !original._retry && !isAuthEndpoint) {
      const refreshToken = tokenStore.getRefresh();
      if (!refreshToken) {
        tokenStore.clearAll();
        redirectToLogin();
        return Promise.reject(err);
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          });
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
        tokenStore.set(data.token);
        tokenStore.setRefresh(data.refreshToken);
        api.defaults.headers.common.Authorization = `Bearer ${data.token}`;
        processQueue(data.token);
        original.headers.Authorization = `Bearer ${data.token}`;
        return api(original);
      } catch {
        tokenStore.clearAll();
        redirectToLogin();
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

function redirectToLogin() {
  const path = window.location.pathname;
  if (path !== '/login' && path !== '/register') {
    window.location.href = '/login';
  }
}

export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.error ?? err.message;
  }
  return err instanceof Error ? err.message : 'Something went wrong';
}
