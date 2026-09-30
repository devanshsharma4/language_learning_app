import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from './notebook';

/**
 * Gates a route behind authentication.
 *
 * This is UX, not security — the real enforcement is the `authenticate`
 * middleware on the API. This just keeps legitimate users from seeing a page
 * that is about to fail.
 */
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { hasToken, isLoading, isError } = useAuth();

  // No token at all: redirect before anything renders, no network round trip.
  // `from` lets the login page send the user back where they were headed.
  if (!hasToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Token present but not yet validated.
  if (isLoading) {
    return (
      <div className="notebook-grid flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3 text-ink-2">
          <Spinner size={22} label="Checking your session" />
          One moment…
        </div>
      </div>
    );
  }

  // Token was present but expired or invalid.
  if (isError) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
