import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

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
      <div className="min-h-screen bg-cream font-body flex items-center justify-center">
        <div className="flex items-center gap-3 text-bark-light">
          <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Loading...
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
