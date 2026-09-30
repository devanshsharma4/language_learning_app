import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { PART_OF_SPEECH_STYLES } from '../../lib/partOfSpeech';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'New lesson' },
  { to: '/lessons', label: 'My lessons' },
  { to: '/vocabulary', label: 'Vocabulary' },
  { to: '/notes', label: 'Notes' },
];

const nounInk = { '--hl': PART_OF_SPEECH_STYLES.noun.rgb } as React.CSSProperties;

/**
 * The wordmark marks its own last letter, the same way the lesson text marks a
 * vocabulary word. It is the one place the brand explains the product.
 */
function Wordmark() {
  return (
    <Link
      to="/dashboard"
      className="casual text-[23px] font-850 tracking-[-0.035em] text-ink no-underline"
    >
      articul
      <span className="hl mx-0" style={nounInk}>
        o
      </span>
    </Link>
  );
}

function AccountMenu() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  // Registration never collects a name, so most accounts have only an email.
  const displayName = user?.name?.trim() || user?.email?.split('@')[0] || 'Account';
  const initial = displayName.charAt(0).toUpperCase();

  function signOut() {
    localStorage.removeItem('token');
    // Drop every cached query, not just the user: the next person to sign in on
    // this browser must not see the previous account's lessons.
    queryClient.clear();
    navigate('/', { replace: true });
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-full border-[1.5px] border-line-strong bg-white py-1 pl-1 pr-2.5 text-sm font-semibold"
      >
        <span
          aria-hidden="true"
          className="casual flex h-7 w-7 items-center justify-center rounded-full bg-pen-chip text-[13px] font-extrabold text-pen-dark"
        >
          {initial}
        </span>
        <span className="max-w-[12ch] truncate">{displayName}</span>
        <svg
          aria-hidden="true"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-52 rounded-xl border-[1.5px] border-line-strong bg-white p-1.5 shadow-card"
        >
          <p className="mono truncate px-3 py-2 text-xs text-ink-3">{user?.email}</p>
          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-pen-tint hover:text-pen-dark"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * App chrome. Present on every authenticated screen — the old design put
 * navigation only on the dashboard and a bare "back" link everywhere else, and
 * had no way to sign out at all.
 *
 * Signed out, it keeps the wordmark and offers the two ways in. That case only
 * arises on the public demo lesson, where an account menu would be nonsense.
 */
export default function TopNav() {
  const { hasToken } = useAuth();

  return (
    <header className="relative flex h-[72px] items-center justify-between border-b-[1.5px] border-line-strong bg-paper px-6 xl:px-12">
      <Wordmark />

      {hasToken ? (
        <>
          <nav aria-label="Main" className="hidden gap-1 text-[15px] font-550 md:flex">
            {NAV_ITEMS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `px-4 py-2.5 no-underline ${
                    isActive ? 'hl hl-nav font-bold text-ink' : 'text-ink-2 hover:text-ink'
                  }`
                }
                style={({ isActive }) => (isActive ? nounInk : undefined)}
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <AccountMenu />
        </>
      ) : (
        <div className="flex items-center gap-2">
          <Link to="/login" className="px-4 py-2.5 text-[15px] font-550 text-ink-2 no-underline hover:text-ink">
            Log in
          </Link>
          <Link
            to="/register"
            className="casual rounded-xl bg-pen px-4 py-2 text-[15px] font-750 text-white no-underline shadow-sticker hover:bg-pen-dark"
          >
            Sign up
          </Link>
        </div>
      )}
    </header>
  );
}
