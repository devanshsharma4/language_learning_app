import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import type { LessonSummary } from '../types';
import { languageCode, monthLabel } from '../lib/languages';
import {
  ButtonLink,
  NotebookPage,
  SearchField,
  Spinner,
  StickyNote,
  TopNav,
} from '../components/notebook';
import LessonRow from '../components/lessons/LessonRow';

type Status = 'all' | 'progress' | 'graded';

interface LessonsResponse {
  lessons: LessonSummary[];
  total: number;
}

const STATUSES: Array<{ value: Status; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'progress', label: 'In progress' },
  { value: 'graded', label: 'Graded' },
];

export default function LessonHistory() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('all');

  const { data, isLoading, error } = useQuery<LessonsResponse>({
    queryKey: ['lessons'],
    queryFn: async () => {
      const { data } = await api.get('/lessons?limit=50');
      return data.data ?? data;
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/lessons/${id}`),
    // Drop the row immediately, then reconcile. The row is already gone from
    // the reader's intent by the time they confirm, and leaving it in place
    // until the round trip finishes makes the page feel broken.
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['lessons'] });
      const previous = queryClient.getQueryData<LessonsResponse>(['lessons']);

      queryClient.setQueryData<LessonsResponse>(['lessons'], (old) =>
        old
          ? {
              lessons: old.lessons.filter((lesson) => String(lesson.id) !== String(id)),
              total: Math.max(0, old.total - 1),
            }
          : old,
      );

      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(['lessons'], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
    },
  });

  const lessons = useMemo(() => data?.lessons ?? [], [data]);
  const total = data?.total ?? 0;

  // Page numbers count from the oldest lesson, so they have to be assigned
  // before any filtering — p.3 stays p.3 when you narrow to one language.
  const numbered = useMemo(
    () => lessons.map((lesson, index) => ({ lesson, page: total - index })),
    [lessons, total],
  );

  const languagesPresent = useMemo(
    () => Array.from(new Set(lessons.map((lesson) => lesson.language))),
    [lessons],
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();

    return numbered.filter(({ lesson }) => {
      if (language && lesson.language !== language) return false;
      if (status === 'graded' && !lesson.completed) return false;
      if (status === 'progress' && lesson.completed) return false;
      if (!term) return true;

      return [lesson.article_title_english, lesson.article_title]
        .filter(Boolean)
        .some((title) => title!.toLowerCase().includes(term));
    });
  }, [numbered, search, language, status]);

  // Grouped by month, in the order the list already arrives (newest first).
  const groups = useMemo(() => {
    const byMonth = new Map<string, typeof visible>();
    for (const row of visible) {
      const key = monthLabel(row.lesson.created_at);
      const existing = byMonth.get(key);
      if (existing) existing.push(row);
      else byMonth.set(key, [row]);
    }
    return Array.from(byMonth.entries());
  }, [visible]);

  const gradedCount = lessons.filter((lesson) => lesson.completed).length;

  return (
    <NotebookPage>
      <TopNav />

      <main className="px-6 pb-24 pt-12 xl:pl-[210px] xl:pr-8">
        <p className="mono text-[13px] font-semibold text-ink-3">table of contents</p>
        <h1 className="mb-1.5 mt-1.5 font-display text-[40px] font-bold leading-[1.02] tracking-[-0.5px] xl:text-[46px]">
          My lessons
        </h1>
        <p className="mono mb-9 text-[13px] text-ink-3">
          {total} page{total === 1 ? '' : 's'} · {gradedCount} graded ·{' '}
          {total - gradedCount} in progress
        </p>

        {lessons.length > 0 && (
          <div className="mb-7 flex flex-wrap items-center gap-4 lg:gap-5">
            <SearchField
              value={search}
              onChange={setSearch}
              label="Search lessons"
              placeholder="Search titles"
              className="w-full sm:w-[280px]"
            />

            {languagesPresent.length > 1 && (
              <div role="group" aria-label="Language" className="flex gap-1.5 text-sm font-650">
                {[null, ...languagesPresent].map((value) => {
                  const active = language === value;
                  return (
                    <button
                      key={value ?? 'all'}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setLanguage(value)}
                      className={`rounded-lg border-[1.5px] px-3 py-1.5 ${
                        value ? 'mono' : ''
                      } ${
                        active
                          ? 'border-pen bg-pen-tint text-pen-dark'
                          : 'border-line bg-white text-ink-2 hover:text-ink'
                      }`}
                    >
                      {value ? languageCode(value) : 'All'}
                    </button>
                  );
                })}
              </div>
            )}

            <div
              role="group"
              aria-label="Status"
              className="inline-flex gap-1 rounded-xl border-[1.5px] border-line bg-white p-1 text-sm font-semibold lg:ml-auto"
            >
              {STATUSES.map((option) => {
                const active = status === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setStatus(option.value)}
                    className={`rounded-lg px-3.5 py-1.5 ${
                      active ? 'bg-pen-chip text-pen-dark' : 'text-ink-2 hover:text-ink'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-start gap-6 py-12">
            <div className="flex items-center gap-3 text-ink-2">
              <Spinner size={22} label="Loading lessons" />
              Opening your notebook…
            </div>
            <StickyNote className="max-w-[340px]">
              Our server was napping and is waking up. This can take up to a minute the first
              time — no need to refresh.
            </StickyNote>
          </div>
        )}

        {error && (
          <p className="rounded-xl border-[1.5px] border-wrong bg-wrong-tint px-4 py-3 text-sm text-wrong-text">
            Couldn&apos;t load your lessons. Try again in a moment.
          </p>
        )}

        {!isLoading && !error && lessons.length === 0 && (
          <div className="max-w-md rounded-xl border-2 border-dashed border-line-strong px-7 py-9">
            <h2 className="m-0 font-display text-[22px] font-bold">Nothing in here yet</h2>
            <p className="mb-5 mt-2 text-[15px] leading-relaxed text-ink-2">
              Every lesson you make becomes a page in this notebook.
            </p>
            <ButtonLink to="/dashboard">Start your first page</ButtonLink>
          </div>
        )}

        {!isLoading && lessons.length > 0 && visible.length === 0 && (
          <p className="py-10 text-[15px] text-ink-2">
            No pages match that.{' '}
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setLanguage(null);
                setStatus('all');
              }}
              className="font-650 text-pen underline underline-offset-4"
            >
              Clear the filters
            </button>
          </p>
        )}

        {groups.map(([month, rows], groupIndex) => (
          <section key={month} className={groupIndex > 0 ? 'mt-10' : ''}>
            <div className="mono mb-1.5 flex items-center gap-3.5 text-[13px] font-bold text-ink-3">
              {month}
              <span aria-hidden="true" className="flex-grow border-t-[1.5px] border-dashed border-line-strong" />
            </div>

            <ol className="m-0 flex list-none flex-col p-0">
              {rows.map(({ lesson, page }) => (
                <LessonRow
                  key={lesson.id}
                  lesson={lesson}
                  page={page}
                  onDelete={(id) => remove.mutate(id)}
                  deleting={remove.isPending && String(remove.variables) === String(lesson.id)}
                />
              ))}
            </ol>
          </section>
        ))}

        {lessons.length > 0 && (
          <Link
            to="/dashboard"
            className="mt-8 inline-flex items-center gap-2 text-base font-650 no-underline hover:underline"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Start a new page
          </Link>
        )}
      </main>
    </NotebookPage>
  );
}
