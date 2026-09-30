import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import api from '../api/client';
import { AUTH_QUERY_KEY } from '../hooks/useAuth';
import { LANGUAGES, languageChip, languageNativeName } from '../lib/languages';
import { PART_OF_SPEECH_STYLES } from '../lib/partOfSpeech';
import { NotebookPage, Spinner, Tape } from '../components/notebook';

type Mode = 'signup' | 'login';

const NOUN = { '--hl': PART_OF_SPEECH_STYLES.noun.rgb } as React.CSSProperties;
const VERB = { '--hl': PART_OF_SPEECH_STYLES.verb.rgb, '--hl-m': 0.92 } as React.CSSProperties;
const ADJ = { '--hl': PART_OF_SPEECH_STYLES.adjective.rgb, '--hl-m': 1.18 } as React.CSSProperties;

/**
 * A still life of the product: a scrap of marked-up article with a definition
 * card pulled out beside it.
 *
 * This is the hero, in place of a screenshot or an abstract illustration —
 * the thing the product actually does, at actual size, in a real language.
 */
function ProductPreview() {
  return (
    <div className="relative h-[260px] w-full max-w-[560px] sm:h-[280px]">
      <div
        lang="fr"
        className="absolute left-0 top-4 w-full max-w-[420px] -rotate-[1.5deg] bg-white px-8 py-7 font-read text-[17px] leading-8 shadow-paper"
      >
        <Tape tone="sand" className="-top-3 left-10" rotate={-4} width={96} />
        Boum&nbsp;! Dominique{' '}
        <span className="hl" style={VERB}>
          sursaute
        </span>
        . Le café se renverse sur l&apos;ordinateur. C&apos;est une{' '}
        <span className="hl hl-open" style={NOUN}>
          réalisatrice
        </span>{' '}
        <span className="hl" style={ADJ}>
          célèbre
        </span>
        .
      </div>

      <div className="absolute right-0 top-[150px] hidden w-[240px] rotate-[2.5deg] bg-white shadow-card sm:block">
        <Tape tone="blue" className="-top-2.5 left-20" rotate={3} width={76} />
        <div className="border-b-2 border-margin px-4 pb-2 pt-4">
          <span lang="fr" className="font-display text-[22px] font-bold">
            réalisatrice
          </span>{' '}
          <span className="mono ml-1 rounded bg-pen-chip px-1.5 py-0.5 align-[3px] text-[10px] font-bold text-pen-dark">
            noun
          </span>
        </div>
        <div className="ruled px-4 pb-3 pt-0.5 text-[13px] leading-[26px] [--rule-h:26px]">
          <div className="text-[15px] font-bold text-pen">film director (woman)</div>
          <div className="text-ink-2">A woman who directs films.</div>
        </div>
      </div>
    </div>
  );
}

export default function Welcome() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // The tab is the URL, so /login and /register still deep-link and the back
  // button still moves between them — but switching never remounts the form or
  // loses what has been typed.
  const mode: Mode = location.pathname === '/login' ? 'login' : 'signup';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Where RequireAuth was headed before it turned an unauthenticated visitor away.
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;

  const submit = useMutation({
    mutationFn: async () => {
      const path = mode === 'login' ? '/auth/login' : '/auth/register';
      const { data } = await api.post(path, { email, password });
      return data;
    },
    onSuccess: async (data) => {
      localStorage.setItem('token', data.data?.token ?? data.token);
      // Drop the pre-login cache entry; otherwise the guard reads a stale
      // failure and bounces the visitor straight back here.
      await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
      navigate(mode === 'login' ? (from ?? '/dashboard') : '/dashboard', { replace: true });
    },
    onError: (err) => {
      const serverMessage = axios.isAxiosError(err)
        ? (err.response?.data as { error?: string } | undefined)?.error
        : undefined;

      setError(
        serverMessage ??
          (mode === 'login'
            ? 'That email and password don’t match an account.'
            : 'Couldn’t create that account. The email may already be in use.'),
      );
    },
  });

  function switchMode(next: Mode) {
    setError('');
    navigate(next === 'login' ? '/login' : '/register', {
      replace: true,
      state: location.state,
    });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    submit.mutate();
  }

  const invalid = Boolean(error);

  return (
    <NotebookPage>
      <div className="px-6 pb-20 pt-10 xl:pl-[210px] xl:pr-8">
        <Link
          to="/"
          className="casual text-[26px] font-850 tracking-[-0.035em] text-ink no-underline"
        >
          articul
          <span className="hl mx-0" style={NOUN}>
            o
          </span>
        </Link>

        <main className="mt-14 flex flex-col gap-16 xl:flex-row xl:gap-24">
          <section className="min-w-0 flex-1 xl:max-w-[560px]">
            <p className="mono text-[13px] font-semibold text-ink-3">
              a notebook for reading in another language
            </p>
            <h1 className="mb-5 mt-2.5 font-display text-[46px] font-bold leading-[0.98] tracking-[-1px] sm:text-[58px]">
              Turn any article into a{' '}
              <span className="hl" style={ADJ}>
                lesson
              </span>
              .
            </h1>
            <p className="mb-10 max-w-[520px] text-[17px] leading-relaxed text-ink-2">
              Paste a link or some text. Articulo marks the words worth learning, checks you
              followed it, and gives you feedback on what you write back.
            </p>

            <ProductPreview />

            <div className="mono mt-4 flex flex-wrap items-center gap-2 text-xs text-ink-3">
              <span>works with</span>
              {LANGUAGES.map((value) => (
                <span
                  key={value}
                  lang={value}
                  className={`rounded-md px-2 py-1 font-bold ${languageChip(value)}`}
                >
                  {languageNativeName(value)}
                </span>
              ))}
            </div>

            <p className="mt-8 text-[15px] text-ink-2">
              Rather look first?{' '}
              <Link to="/lessons/demo" className="font-bold">
                Try a lesson without an account →
              </Link>
            </p>
          </section>

          <section aria-label="Create an account or log in" className="w-full xl:w-[420px] xl:flex-shrink-0">
            <div role="tablist" className="flex gap-1.5 pl-6">
              {(
                [
                  ['signup', 'Sign up'],
                  ['login', 'Log in'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={mode === value}
                  onClick={() => switchMode(value)}
                  className={`rounded-t-[10px] px-5 pb-3 pt-2.5 text-base ${
                    mode === value
                      ? 'bg-white font-750 text-ink shadow-[0_-1px_2px_rgba(30,34,48,0.06)]'
                      : 'bg-pen-chip font-650 text-pen-dark'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div
              role="tabpanel"
              className="rounded-[4px_14px_14px_14px] bg-white px-8 pb-8 pt-8 shadow-[0_1px_2px_rgba(30,34,48,0.08),0_24px_44px_-26px_rgba(30,34,48,0.45)]"
            >
              <h2 className="m-0 font-display text-[28px] font-bold">
                {mode === 'login' ? 'Open your notebook' : 'Start your notebook'}
              </h2>
              <p className="mb-6 mt-1.5 text-sm text-ink-2">
                {mode === 'login'
                  ? 'Your lessons, words and notes are where you left them.'
                  : 'Free, and your first lesson takes about a minute.'}
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {error && (
                  <p
                    role="alert"
                    className="m-0 rounded-lg border-[1.5px] border-wrong bg-wrong-tint px-3.5 py-2.5 text-sm text-wrong-text"
                  >
                    {error}
                  </p>
                )}

                <label className="flex flex-col gap-2 text-sm font-650">
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    autoComplete="email"
                    aria-invalid={invalid}
                    className={`h-12 rounded-lg border-[1.5px] px-4 text-base font-normal outline-none focus:border-pen focus:shadow-ring ${
                      invalid ? 'border-wrong' : 'border-line'
                    }`}
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-650">
                  Password
                  <span className="relative block">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      minLength={mode === 'signup' ? 8 : undefined}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      aria-invalid={invalid}
                      className={`h-12 w-full rounded-lg border-[1.5px] pl-4 pr-20 text-base font-normal outline-none focus:border-pen focus:shadow-ring ${
                        invalid ? 'border-wrong' : 'border-line'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-2 top-2 h-8 rounded-md bg-pen-badge px-2.5 text-[13px] font-650 text-ink-2 hover:text-ink"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </span>
                  {mode === 'signup' && (
                    <span className="mono text-[11px] font-normal text-ink-3">
                      at least 8 characters
                    </span>
                  )}
                </label>

                <button
                  type="submit"
                  disabled={submit.isPending}
                  className="casual mt-2 flex h-14 items-center justify-center gap-2.5 rounded-xl bg-pen text-[17px] font-750 text-white shadow-sticker hover:bg-pen-dark disabled:bg-line disabled:text-ink-3 disabled:shadow-none"
                >
                  {submit.isPending && <Spinner size={16} className="border-white/40 border-t-white" />}
                  {mode === 'login' ? 'Open it' : 'Create my notebook'}
                  {!submit.isPending && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  )}
                </button>
              </form>

              <p className="mb-0 mt-5 text-center text-sm text-ink-2">
                {mode === 'login' ? 'No notebook yet? ' : 'Already have one? '}
                <button
                  type="button"
                  onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                  className="font-bold text-pen hover:underline"
                >
                  {mode === 'login' ? 'Sign up' : 'Log in'}
                </button>
              </p>
            </div>
          </section>
        </main>
      </div>
    </NotebookPage>
  );
}
