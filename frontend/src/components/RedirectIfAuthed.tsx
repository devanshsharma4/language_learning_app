import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Keeps an already-signed-in user off the login and register pages.
 *
 * Waits for `/auth/me` to settle before redirecting. Checking `hasToken &&
 * !isError` alone was true while validation was still in flight, so a user
 * holding an *expired* token who opened /login was pushed to /dashboard, where
 * RequireAuth then bounced them back -- two redirects and a spinner flash before
 * they could type their password. A stale token is only distinguishable from a
 * good one after the request resolves, so that is what this waits for.
 */
export default function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { hasToken, isLoading, isError } = useAuth();

  // No token at all: nothing to validate, show the form immediately.
  if (!hasToken) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="notebook-grid flex min-h-screen items-center justify-center">
        <span className="sr-only">Checking your session</span>
      </div>
    );
  }

  if (!isError) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
