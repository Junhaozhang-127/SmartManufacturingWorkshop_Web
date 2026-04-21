import { clearPersistedAuthState, getStoredAccessToken } from '@web/stores/auth-storage';
import axios from 'axios';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10_000,
  withCredentials: true,
});

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function sanitizeParams(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeParams(item))
      .filter((item) => item !== undefined);
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, item]) => [key, sanitizeParams(item)] as const)
        .filter(([, item]) => item !== undefined),
    );
  }

  if (value == null) {
    return undefined;
  }

  if (typeof value === 'string' && value.trim() === '') {
    return undefined;
  }

  return value;
}

http.interceptors.request.use((config) => {
  const token = getStoredAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (config.params) {
    config.params = sanitizeParams(config.params);
  }

  return config;
});

http.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const responseMessage = error.response?.data?.message;
    const message = Array.isArray(responseMessage)
      ? responseMessage.join('；')
      : responseMessage ?? error.message ?? '请求失败';

    if (error.response?.status === 401) {
      const hadToken = Boolean(getStoredAccessToken());
      clearPersistedAuthState();

      // If the user already has no session, avoid forcing a redirect to login.
      // Route guards handle protected-route navigation, and this prevents "logout -> portal -> 401 from in-flight request -> back to login".
      if (hadToken && typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      }
    }

    return Promise.reject(new Error(message));
  },
);
