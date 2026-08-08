import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Keeps an already-signed-in user off the login and register pages.
 *
 * Gated on `!isError` as well as `hasToken` so an expired token doesn't bounce
 * the user between here and RequireAuth. The 401 interceptor also clears the
 * token, which settles the loop on the next render.
 */
export default function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { hasToken, isError } = useAuth();

  if (hasToken && !isError) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
