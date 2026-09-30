import axios from 'axios';

/**
 * In development this stays '/api' and Vite proxies it to localhost:3001, so the
 * requests are same-origin and there is no CORS involved.
 *
 * In production the frontend is a static deployment (Vercel) and the API is a
 * separate service (Render), so the full origin has to be baked in at build time
 * -- Vite inlines import.meta.env at build, it is not read at runtime.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Endpoints where a 401 is an answer, not an expired session.
 *
 * `/auth/login` and `/auth/register` 401 when the credentials are simply wrong;
 * `/auth/me` 401s when a stored token has expired, which `RequireAuth` handles
 * by redirecting through the router so the intended route and in-flight page
 * state both survive.
 *
 * Without this list a failed login hard-reloaded the page, wiping the form and
 * the "that password doesn't match" message before anyone could read it — so a
 * typo looked like the button simply not working.
 */
const AUTH_ENDPOINTS = ['/auth/me', '/auth/login', '/auth/register'];

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url: string = error.config?.url ?? '';
      const isAuthEndpoint = AUTH_ENDPOINTS.some((path) => url.includes(path));

      // Only clear the token for a session that has actually gone stale. A
      // rejected sign-in attempt never had one to clear.
      if (!isAuthEndpoint || url.includes('/auth/me')) {
        localStorage.removeItem('token');
      }

      if (!isAuthEndpoint) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
