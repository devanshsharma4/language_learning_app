import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import api from '../api/client';
import { useAuth, AUTH_QUERY_KEY, hasAuthToken } from '../hooks/useAuth';
import type { LessonSummary, SavedVocabulary, User } from '../types';
import {
  DIFFICULTIES,
  LANGUAGES,
  languageCode,
  languageEnglishName,
  languageNativeName,
  isDifficulty,
  type Difficulty,
  type Language,
} from '../lib/languages';
import { Button, NotebookPage, Spinner, StickyNote, Tape, TopNav } from '../components/notebook';
import { LanguageCard, LevelPicker, StepLabel } from '../components/dashboard/Steps';
import { RecentLessons, RecentWords } from '../components/dashboard/NotebookAside';
import ReadingSources from '../components/dashboard/ReadingSources';

const DIFFICULTY_STORAGE_KEY = 'difficulty';

// Mirrors ArticleService's MIN/MAX_ARTICLE_LENGTH. The server still enforces
// these — this only surfaces the limit before the user submits.
const ARTICLE_MIN_LENGTH = 100;
const ARTICLE_MAX_LENGTH = 10000;

/** How long before we stop calling the wait normal and explain it. */
const COLD_START_SECONDS = 20;

/** localStorage is user-editable, so validate before trusting it. An unknown
 *  value would fail the backend's z.enum and 400 the create request. */
function readStoredDifficulty(): Difficulty {
  const stored = localStorage.getItem(DIFFICULTY_STORAGE_KEY);
  return isDifficulty(stored) ? stored : 'intermediate';
}

type SourceTab = 'link' | 'text';

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [source, setSource] = useState<SourceTab>('link');
  const [articleUrl, setArticleUrl] = useState('');
  const [articleText, setArticleText] = useState('');
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);

  // Derived rather than synced with useEffect, so the saved preference is
  // correct on first paint instead of flashing a default and then correcting.
  const [languageOverride, setLanguageOverride] = useState<string | null>(null);
  const language = languageOverride ?? user?.preferred_language ?? 'spanish';

  const [difficulty, setDifficulty] = useState<Difficulty>(readStoredDifficulty);

  // Shares the cache entry LessonHistory and the lesson pages use.
  const { data: lessonList } = useQuery<{ lessons: LessonSummary[]; total: number }>({
    queryKey: ['lessons'],
    queryFn: async () => {
      const { data } = await api.get('/lessons?limit=50');
      return data.data ?? data;
    },
    enabled: hasAuthToken(),
  });

  // `null` is the all-languages key SavedVocabularyPage uses for its unfiltered
  // view, so the two share one cache entry.
  const { data: vocabList } = useQuery<{ vocabulary: SavedVocabulary[]; total: number }>({
    queryKey: ['vocabulary', null],
    queryFn: async () => {
      const { data } = await api.get('/vocabulary?limit=200');
      return data.data ?? data;
    },
    enabled: hasAuthToken(),
  });

  // Fire-and-forget: the picker updates immediately and never blocks on this.
  const saveLanguage = useMutation({
    mutationFn: (value: string) => api.put('/auth/language', { language: value }),
    onSuccess: (_data, value) => {
      queryClient.setQueryData<User>(AUTH_QUERY_KEY, (prev) =>
        prev ? { ...prev, preferred_language: value } : prev,
      );
    },
  });

  function handleLanguageChange(value: string) {
    setLanguageOverride(value);
    saveLanguage.mutate(value);
  }

  function handleDifficultyChange(value: Difficulty) {
    setDifficulty(value);
    localStorage.setItem(DIFFICULTY_STORAGE_KEY, value);
  }

  const trimmedText = articleText.trim();
  const articleLengthError =
    trimmedText.length === 0
      ? null
      : trimmedText.length < ARTICLE_MIN_LENGTH
        ? `${ARTICLE_MIN_LENGTH - trimmedText.length} more characters needed`
        : trimmedText.length > ARTICLE_MAX_LENGTH
          ? 'too long to make a lesson from'
          : null;

  const createLesson = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/lessons/create', {
        articleUrl: source === 'link' ? articleUrl.trim() || undefined : undefined,
        articleText: source === 'text' ? trimmedText || undefined : undefined,
        language,
        difficulty,
      });
      return data;
    },
    onSuccess: (data) => {
      const lesson = data.data?.lesson ?? data.lesson ?? data;
      // A new lesson changes the history list and every page number derived
      // from it.
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
      // Carried in router state rather than persisted: it describes this
      // creation, not the lesson.
      navigate(`/lessons/${lesson.id}`, {
        state: { articleTruncated: data.data?.articleTruncated ?? false },
      });
    },
    onError: (err) => {
      // The API returns actionable messages ("Article too long. Maximum 10000
      // characters allowed."). Show them instead of a generic failure.
      const serverMessage = axios.isAxiosError(err)
        ? (err.response?.data as { error?: string } | undefined)?.error
        : undefined;
      setError(serverMessage ?? 'That didn’t work. Try again in a moment.');
    },
  });

  const loading = createLesson.isPending;

  // articleLengthError is part of the gate, not just a hint. Without it the
  // button stayed enabled on a 20-character paste and the user waited out a
  // round trip to be told by the server what the counter already said.
  const canSubmit =
    (source === 'link' ? articleUrl.trim().length > 0 : trimmedText.length > 0) &&
    !loading &&
    !(source === 'text' && articleLengthError);

  /**
   * Lesson creation takes ~10s of Claude calls, and on the free hosting tier a
   * request after 15 minutes of inactivity also waits ~30–50s for the API to
   * wake. A single static "Generating…" for a minute reads as broken, so the
   * copy escalates with elapsed time and the sticky note names the real reason
   * once the wait stops being normal.
   */
  const progressMessage =
    elapsed < 4
      ? 'reading your article…'
      : elapsed < 12
        ? 'picking out vocabulary and writing questions…'
        : 'still working — four passes run for every lesson';

  // The counter is reset at submit rather than here, so this effect only ever
  // starts and stops the interval. Writing state directly in an effect body
  // schedules an extra render pass for a value nothing has read yet.
  useEffect(() => {
    if (!loading) return;

    const started = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - started) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [loading]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setError('');
    setElapsed(0);
    createLesson.mutate();
  }

  const lessons = lessonList?.lessons ?? [];
  const total = lessonList?.total ?? 0;
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <NotebookPage>
      <TopNav />

      <main className="flex flex-col gap-14 px-6 pb-24 pt-12 xl:flex-row xl:gap-20 xl:pl-[210px] xl:pr-8">
        <div className="min-w-0 flex-1 xl:max-w-[720px]">
          <p className="mono text-[13px] font-semibold text-ink-3">
            {today.toLowerCase()} · page {total + 1}
          </p>
          <h1 className="mb-10 mt-1.5 font-display text-[42px] font-bold leading-[1.02] tracking-[-0.6px] xl:text-[50px]">
            What are we reading today?
          </h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-9">
            <fieldset className="m-0 border-0 p-0">
              <legend className="mb-3.5 p-0">
                <StepLabel number={1} tone="one">
                  I&apos;m learning
                </StepLabel>
              </legend>
              <div className="flex flex-wrap gap-2.5">
                {LANGUAGES.map((value) => (
                  <LanguageCard
                    key={value}
                    code={languageCode(value)}
                    name={languageNativeName(value)}
                    selected={language === value}
                    onSelect={() => handleLanguageChange(value)}
                  />
                ))}
              </div>
            </fieldset>

            <fieldset className="m-0 border-0 p-0">
              <legend className="mb-3.5 p-0">
                <StepLabel number={2} tone="two">
                  My level
                </StepLabel>
              </legend>
              <LevelPicker
                levels={DIFFICULTIES}
                value={difficulty}
                onChange={handleDifficultyChange}
              />
            </fieldset>

            <div>
              <div className="mb-3.5 flex items-center justify-between gap-4">
                <label htmlFor="article-source">
                  <StepLabel number={3} tone="three">
                    The article
                  </StepLabel>
                </label>

                <div role="tablist" aria-label="Article source" className="flex gap-1 text-sm font-650">
                  {(
                    [
                      ['link', 'Link'],
                      ['text', 'Paste text'],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      role="tab"
                      aria-selected={source === value}
                      onClick={() => setSource(value)}
                      className={`rounded-md px-3 py-1.5 ${
                        source === value
                          ? 'bg-[#FFF1C4] text-[#5C4400]'
                          : 'text-ink-2 hover:text-ink'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative rounded-2xl border-[1.5px] border-line-badge bg-white shadow-[0_16px_30px_-24px_rgba(30,34,48,0.45)]">
                <Tape tone="sand" className="-top-3 left-10" rotate={-4} width={88} />

                {source === 'link' ? (
                  <div className="flex items-center gap-3.5 px-5">
                    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5B6170" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                      <path d="M10 14a4 4 0 005.66 0l3-3a4 4 0 00-5.66-5.66l-1 1" />
                      <path d="M14 10a4 4 0 00-5.66 0l-3 3a4 4 0 005.66 5.66l1-1" />
                    </svg>
                    <input
                      id="article-source"
                      type="url"
                      value={articleUrl}
                      onChange={(event) => setArticleUrl(event.target.value)}
                      placeholder="Paste a link to something you want to read"
                      className="h-16 flex-grow border-0 bg-transparent text-[17px] outline-none placeholder:text-ink-3"
                    />
                  </div>
                ) : (
                  <div className="px-5 py-4">
                    <textarea
                      id="article-source"
                      value={articleText}
                      onChange={(event) => setArticleText(event.target.value)}
                      placeholder="Paste the article text here"
                      rows={6}
                      className="block w-full resize-none border-0 bg-transparent text-[17px] leading-relaxed outline-none placeholder:text-ink-3"
                    />
                    {trimmedText.length > 0 && (
                      <p
                        className={`mono m-0 text-right text-xs ${
                          articleLengthError ? 'text-wrong-text' : 'text-ink-3'
                        }`}
                      >
                        {trimmedText.length.toLocaleString()} /{' '}
                        {ARTICLE_MAX_LENGTH.toLocaleString()}
                        {articleLengthError ? ` — ${articleLengthError}` : ''}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Only alongside the link field. Someone pasting text already
                  has their article and does not need somewhere to look. */}
              {source === 'link' && !error && <ReadingSources language={language as Language} />}
            </div>

            {error && (
              <div className="m-0 rounded-xl border-[1.5px] border-wrong bg-wrong-tint px-4 py-3 text-sm text-wrong-text">
                <p className="m-0">{error}</p>
                {source === 'link' && (
                  <ReadingSources language={language as Language} afterFailure />
                )}
              </div>
            )}

            <div className="flex flex-wrap items-start gap-6">
              {loading ? (
                <div className="flex flex-col gap-3">
                  <span
                    aria-busy="true"
                    className="casual flex items-center gap-3 rounded-xl bg-pen-chip px-7 py-4 text-[17px] font-750 text-pen-dark"
                  >
                    <Spinner size={18} />
                    Making your lesson…
                  </span>
                  <span role="status" aria-live="polite" className="mono text-[13px] text-ink-2">
                    {progressMessage}
                  </span>
                </div>
              ) : (
                <>
                  <Button type="submit" disabled={!canSubmit}>
                    Make my lesson
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </Button>
                  <span className="mono self-center text-[13px] text-ink-3">
                    {languageEnglishName(language)} · {difficulty} · about 10 seconds
                  </span>
                </>
              )}

              {/* Only once the wait has stopped being normal. Saying it up front
                  would make every lesson feel slow. */}
              {loading && elapsed >= COLD_START_SECONDS && (
                <StickyNote live className="w-full max-w-[320px]">
                  Our server was napping and is waking up. The first lesson of the day can take
                  up to a minute — no need to refresh.
                </StickyNote>
              )}
            </div>
          </form>
        </div>

        <aside className="flex w-full flex-col gap-10 xl:w-[340px] xl:flex-shrink-0 xl:pt-8">
          <RecentLessons lessons={lessons.slice(0, 3)} total={total} />
          <RecentWords words={(vocabList?.vocabulary ?? []).slice(0, 8)} />
        </aside>
      </main>
    </NotebookPage>
  );
}
