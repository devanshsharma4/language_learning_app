import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import type { LessonSummary, SavedVocabulary } from '../types';
import { languageCode } from '../lib/languages';
import {
  countByPartOfSpeech,
  normalizePartOfSpeech,
  PART_OF_SPEECH_STYLES,
  type PartOfSpeech,
} from '../lib/partOfSpeech';
import { ButtonLink, NotebookPage, SearchField, Spinner, TopNav } from '../components/notebook';
import WordCard from '../components/vocabulary/WordCard';

interface VocabularyResponse {
  vocabulary: SavedVocabulary[];
  total: number;
}

type Sort = 'newest' | 'oldest' | 'alphabetical';

const SORTS: Array<{ value: Sort; label: string }> = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'alphabetical', label: 'A–Z' },
];

export default function SavedVocabularyPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState<string | null>(null);
  const [partOfSpeech, setPartOfSpeech] = useState<PartOfSpeech | null>(null);
  const [sort, setSort] = useState<Sort>('newest');

  // Always the unfiltered collection: filtering happens in the browser, so
  // switching a filter never costs a request and the counts stay stable.
  const queryKey = ['vocabulary', null];

  const { data, isLoading, error } = useQuery<VocabularyResponse>({
    queryKey,
    queryFn: async () => {
      const { data } = await api.get('/vocabulary?limit=200');
      return data.data ?? data;
    },
  });

  // Used only to title the "from this lesson" footer. Shares the cache entry
  // every other page uses, so it is usually already loaded.
  const { data: lessonList } = useQuery<{ lessons: LessonSummary[] }>({
    queryKey: ['lessons'],
    queryFn: async () => {
      const { data } = await api.get('/lessons?limit=50');
      return data.data ?? data;
    },
  });

  const lessonTitles = useMemo(() => {
    const titles = new Map<string, string>();
    for (const lesson of lessonList?.lessons ?? []) {
      const title = lesson.article_title_english || lesson.article_title;
      if (title) titles.set(String(lesson.id), title);
    }
    return titles;
  }, [lessonList]);

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/vocabulary/${id}`),
    // Deleting a saved word is low-stakes and near-certain to succeed; waiting
    // on the round trip makes the grid feel unresponsive.
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<VocabularyResponse>(queryKey);

      queryClient.setQueryData<VocabularyResponse>(queryKey, (old) =>
        old
          ? {
              vocabulary: old.vocabulary.filter((word) => word.id !== id),
              total: Math.max(0, old.total - 1),
            }
          : old,
      );

      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] });
    },
  });

  const words = useMemo(() => data?.vocabulary ?? [], [data]);

  const languagesPresent = useMemo(
    () => Array.from(new Set(words.map((word) => word.language))),
    [words],
  );

  // Counts come from the language-filtered set but ignore the part-of-speech
  // filter itself — otherwise selecting "verbs" would show every other count
  // as zero and strand the reader with no way back.
  const posCounts = useMemo(
    () =>
      countByPartOfSpeech(
        language ? words.filter((word) => word.language === language) : words,
        (word) => word.part_of_speech,
      ),
    [words, language],
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();

    const filtered = words.filter((word) => {
      if (language && word.language !== language) return false;
      if (partOfSpeech && normalizePartOfSpeech(word.part_of_speech) !== partOfSpeech) return false;
      if (!term) return true;
      return [word.word, word.translation, word.explanation]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(term));
    });

    return [...filtered].sort((a, b) => {
      if (sort === 'alphabetical') return a.word.localeCompare(b.word, undefined, { numeric: true });
      const delta = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sort === 'oldest' ? delta : -delta;
    });
  }, [words, search, language, partOfSpeech, sort]);

  return (
    <NotebookPage>
      <TopNav />

      <main className="px-6 pb-24 pt-12 xl:pl-[210px] xl:pr-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="mono text-[13px] font-semibold text-ink-3">word bank</p>
            <h1 className="mb-1.5 mt-1.5 font-display text-[40px] font-bold leading-[1.02] tracking-[-0.5px] xl:text-[46px]">
              Vocabulary
            </h1>
            <p className="mono m-0 text-[13px] text-ink-3">
              {words.length} word{words.length === 1 ? '' : 's'} saved while reading
            </p>
          </div>

          {words.length > 0 && (
            <SearchField
              value={search}
              onChange={setSearch}
              label="Search words or meanings"
              placeholder="Search words or meanings"
              className="w-full sm:w-[280px]"
            />
          )}
        </div>

        {words.length > 0 && (
          <div className="mb-10 flex flex-wrap items-center gap-x-6 gap-y-3">
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
                      className={`rounded-lg border-[1.5px] px-3 py-1.5 ${value ? 'mono' : ''} ${
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

            {posCounts.length > 1 && (
              <div role="group" aria-label="Part of speech" className="flex flex-wrap gap-1.5 text-sm font-semibold">
                {posCounts.map(({ pos, count }) => {
                  const active = partOfSpeech === pos;
                  const { rgb, multiplier, plural } = PART_OF_SPEECH_STYLES[pos];
                  return (
                    <button
                      key={pos}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setPartOfSpeech(active ? null : pos)}
                      className={`flex items-center gap-2 rounded-lg border-[1.5px] px-3 py-1.5 ${
                        active
                          ? 'border-pen bg-pen-tint text-pen-dark'
                          : 'border-line bg-white text-ink-2 hover:text-ink'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="hl h-2.5 w-4.5 flex-shrink-0"
                        style={{ '--hl': rgb, '--hl-m': multiplier } as React.CSSProperties}
                      />
                      {plural} {count}
                    </button>
                  );
                })}
              </div>
            )}

            <label className="ml-auto flex items-center gap-2 rounded-lg border-[1.5px] border-line bg-white px-3 py-1.5 text-sm font-semibold">
              <span className="sr-only">Sort words</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as Sort)}
                className="cursor-pointer border-0 bg-transparent outline-none"
              >
                {SORTS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center gap-3 py-16 text-ink-2">
            <Spinner size={22} label="Loading vocabulary" />
            Opening your word bank…
          </div>
        )}

        {error && (
          <p className="rounded-xl border-[1.5px] border-wrong bg-wrong-tint px-4 py-3 text-sm text-wrong-text">
            Couldn&apos;t load your words. Try again in a moment.
          </p>
        )}

        {!isLoading && !error && words.length === 0 && (
          <div className="max-w-md rounded-xl border-2 border-dashed border-line-strong px-7 py-9">
            <h2 className="m-0 font-display text-[22px] font-bold">No words yet</h2>
            <p className="mb-5 mt-2 text-[15px] leading-relaxed text-ink-2">
              While you read a lesson, tap any highlighted word and save it. It lands here.
            </p>
            <ButtonLink to="/dashboard">Make a lesson</ButtonLink>
          </div>
        )}

        {!isLoading && words.length > 0 && visible.length === 0 && (
          <p className="py-10 text-[15px] text-ink-2">
            No words match that.{' '}
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setLanguage(null);
                setPartOfSpeech(null);
              }}
              className="font-650 text-pen underline underline-offset-4"
            >
              Clear the filters
            </button>
          </p>
        )}

        {visible.length > 0 && (
          <div className="grid grid-cols-1 items-start gap-x-9 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((word, index) => (
              <WordCard
                key={word.id}
                word={word}
                index={index}
                lessonTitle={word.lesson_id ? lessonTitles.get(String(word.lesson_id)) : undefined}
                onRemove={() => remove.mutate(word.id)}
              />
            ))}
          </div>
        )}
      </main>
    </NotebookPage>
  );
}
