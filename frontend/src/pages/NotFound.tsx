import { useAuth } from '../hooks/useAuth';
import { ButtonLink, NotebookPage, TopNav } from '../components/notebook';

/**
 * Catch-all for unmatched routes.
 *
 * Without a `*` route a typo or a stale deep link rendered nothing at all — a
 * white screen with no way back. The destination adapts to whether the visitor
 * is signed in, since "back to your notebook" is a dead end for someone who
 * does not have one.
 */
export default function NotFound() {
  const { hasToken } = useAuth();

  return (
    <NotebookPage marginLine={false}>
      <TopNav />
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="m-0 font-display text-[64px] font-bold leading-none text-pen">404</p>
          <h1 className="mb-3 mt-4 font-display text-[28px] font-bold">
            That page isn&apos;t in the notebook
          </h1>
          <p className="mb-7 text-[15px] leading-relaxed text-ink-2">
            The link may be out of date, or the lesson may have been deleted.
          </p>
          <ButtonLink to={hasToken ? '/dashboard' : '/'}>
            {hasToken ? 'Start a new page' : 'Go to the homepage'}
          </ButtonLink>
        </div>
      </div>
    </NotebookPage>
  );
}
