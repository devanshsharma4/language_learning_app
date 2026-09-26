import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Catch-all for unmatched routes.
 *
 * Previously there was no `*` route, so a typo or a stale deep link rendered
 * nothing at all -- a white screen with no way back. The destination adapts to
 * whether the visitor is signed in, since "Back to Dashboard" is a dead end for
 * someone who is not.
 */
export default function NotFound() {
  const { hasToken } = useAuth();

  return (
    <div className="min-h-screen bg-cream font-body flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="font-display text-5xl font-semibold text-sage mb-4">404</p>
        <h1 className="font-display text-3xl font-semibold text-bark mb-3">
          We couldn&apos;t find that page
        </h1>
        <p className="text-bark-light mb-7">
          The link may be out of date, or the lesson may have been deleted.
        </p>
        <Link
          to={hasToken ? '/dashboard' : '/'}
          className="inline-block bg-sage hover:bg-sage-dark active:bg-olive text-white font-semibold rounded-2xl px-6 py-3 shadow-md hover:shadow-lg transition-all duration-200"
        >
          {hasToken ? 'Back to Dashboard' : 'Go to the homepage'}
        </Link>
      </div>
    </div>
  );
}
