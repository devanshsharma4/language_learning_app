import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
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
