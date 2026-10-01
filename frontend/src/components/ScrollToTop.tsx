import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Starts every new page at the top.
 *
 * A single-page app does not reload on navigation, so the browser keeps the
 * scroll offset it had on the page you left. Handing in a lesson from the
 * bottom of a long page therefore opened the results page already scrolled past
 * the score — the feedback you just asked for was above the fold you landed on.
 *
 * Only forward navigation is reset. A "POP" is the back or forward button, where
 * the browser restores the offset you left that entry at, and that is the right
 * behaviour: going back to a lesson list should return you to the row you came
 * from. An in-page anchor (`#questions`) carries a hash and is left alone.
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (navigationType === 'POP' || hash) return;
    window.scrollTo(0, 0);
  }, [pathname, hash, navigationType]);

  return null;
}
