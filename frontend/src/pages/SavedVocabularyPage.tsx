import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import type { SavedVocabulary } from '../types';

const languageFilters = [
  { value: null, label: 'All', flag: '' },
  { value: 'spanish', label: 'Espanol', flag: '\u{1F1EA}\u{1F1F8}' },
  { value: 'french', label: 'Francais', flag: '\u{1F1EB}\u{1F1F7}' },
  { value: 'japanese', label: '日本語', flag: '\u{1F1EF}\u{1F1F5}' },
  { value: 'korean', label: '한국어', flag: '\u{1F1F0}\u{1F1F7}' },
];

interface VocabularyResponse {
  vocabulary: SavedVocabulary[];
  total: number;
}

export default function SavedVocabularyPage() {
  const queryClient = useQueryClient();
  const [language, setLanguage] = useState<string | null>(null);

  const queryKey = ['vocabulary', language];

  const { data, isLoading, error } = useQuery<VocabularyResponse>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '200' });
      if (language) params.set('language', language);
      const { data } = await api.get(`/vocabulary?${params}`);
      return data.data ?? data;
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/vocabulary/${id}`),
    // Drop the row immediately, then reconcile. Deleting a saved word is
    // low-stakes and near-certain to succeed; waiting on the round trip makes
    // the list feel unresponsive.
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<VocabularyResponse>(queryKey);

      queryClient.setQueryData<VocabularyResponse>(queryKey, (old) =>
        old
          ? {
              vocabulary: old.vocabulary.filter((v) => v.id !== id),
              total: Math.max(0, old.total - 1),
            }
          : old,
      );

      return { previous };
    },
    onError: (_err, _id, context) => {
      // Put the row back if the server rejected the delete.
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] });
    },
  });

  const vocabulary = data?.vocabulary ?? [];

  return (
    <div className="relative min-h-screen bg-cream font-body overflow-hidden">
      {/* Grain texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-bark-light hover:text-bark transition-colors mb-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </Link>
          <h1 className="font-display text-3xl font-bold text-bark">Vocabulary</h1>
          <p className="text-bark-light mt-1">
            Words you've saved while reading
            {data?.total ? ` — ${data.total} saved` : ''}
          </p>
        </div>

        {/* Language filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {languageFilters.map((filter) => (
            <button
              key={filter.value ?? 'all'}
              onClick={() => setLanguage(filter.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
                language === filter.value
                  ? 'bg-sage text-white shadow-sm'
                  : 'bg-cream-dark text-bark-light hover:bg-sand'
              }`}
            >
              {filter.flag && <span className="mr-1.5">{filter.flag}</span>}
              {filter.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-bark-light">
              <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading vocabulary...
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-center">
            Failed to load vocabulary.
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && vocabulary.length === 0 && (
          <div className="text-center py-20">
            <div className="text-sage mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <p className="text-bark-light mb-2">
              {language ? 'No saved words in this language yet' : 'No saved words yet'}
            </p>
            <p className="text-sm text-bark-light/60">
              Tap a highlighted word while reading a lesson to save it here.
            </p>
          </div>
        )}

        {/* Word list */}
        {vocabulary.length > 0 && (
          <div className="space-y-3">
            {vocabulary.map((item) => (
              <div
                key={item.id}
                className="group bg-white rounded-2xl border border-sand shadow-sm p-5 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="font-display text-lg font-semibold text-bark">
                        {item.word}
                      </span>
                      {item.translation && (
                        <span className="text-sage-dark font-medium">{item.translation}</span>
                      )}
                    </div>

                    {item.explanation && (
                      <p className="text-sm text-bark-light mt-1.5">{item.explanation}</p>
                    )}

                    {item.context && (
                      <p className="text-sm text-bark-light/70 italic mt-2 border-l-2 border-sage/30 pl-3">
                        {item.context}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-xs text-bark-light/50 capitalize">{item.language}</span>
                      <span className="text-bark-light/30">|</span>
                      <span className="text-xs text-bark-light/50">
                        {new Date(item.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      {item.lesson_id && (
                        <>
                          <span className="text-bark-light/30">|</span>
                          <Link
                            to={`/lessons/${item.lesson_id}`}
                            className="text-xs text-sage-dark hover:text-olive transition-colors"
                          >
                            View lesson
                          </Link>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => remove.mutate(item.id)}
                    aria-label={`Remove ${item.word}`}
                    title={`Remove ${item.word}`}
                    className="flex-shrink-0 p-2 rounded-full text-bark-light/30 hover:text-terracotta hover:bg-terracotta/10 transition-all duration-200 cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
