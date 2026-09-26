import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import type { User } from '../types';

export const AUTH_QUERY_KEY = ['auth', 'me'] as const;

/**
 * Synchronous check for a stored token, for code that needs to decide whether to
 * make an authenticated request at all but does not need the user object.
 *
 * This matters on the public demo route: an authenticated request from a
 * signed-out visitor 401s, and the response interceptor hard-redirects to
 * /login -- which would throw a first-time visitor out of the demo.
 */
export function hasAuthToken(): boolean {
  return !!localStorage.getItem('token');
}

/**
 * Single source of truth for the current user.
 *
 * `hasToken` is a synchronous localStorage read, so guards can redirect a
 * logged-out visitor without waiting on the network. The query only runs when a
 * token exists, and answers the separate question of whether that token is
 * still valid.
 */
export function useAuth() {
  const token = localStorage.getItem('token');

  const query = useQuery<User>({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async () => {
      const { data } = await api.get('/auth/me');
      return (data.data ?? data).user;
    },
    enabled: !!token,
    staleTime: Infinity,
    retry: false, // a 401 will never succeed on retry
  });

  return {
    user: query.data,
    hasToken: !!token,
    isLoading: !!token && query.isLoading,
    isError: query.isError,
  };
}
