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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');

      // /auth/me is the token check RequireAuth performs on mount. Let the
      // guard redirect through the router so the target route is preserved and
      // in-flight page state survives; a hard reload here would discard both.
      const isAuthCheck = error.config?.url?.includes('/auth/me');
      if (!isAuthCheck) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
