import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import type { SavedVocabulary } from '../types';

interface VocabularyResponse {
  vocabulary: SavedVocabulary[];
  total: number;
}

/**
 * The words the user has already saved in `language`, lowercased.
 *
 * The query key deliberately matches the one `SavedVocabularyPage` uses, so the
 * two share a single cache entry: invalidating `['vocabulary']` after a save
 * refreshes the collection page and every open lesson at once.
 *
 * Lowercasing mirrors the rest of the vocabulary path — the backend dedupes
 * case-insensitively in `normalizeVocabulary()`, and `buildSegments()` already
 * keys its lookups on `toLowerCase()`.
 */
export function useSavedWords(language: string): Set<string> {
  const { data } = useQuery<VocabularyResponse>({
    queryKey: ['vocabulary', language],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '200', language });
      const { data } = await api.get(`/vocabulary?${params}`);
      return data.data ?? data;
    },
    enabled: !!language,
  });

  return useMemo(
    () => new Set((data?.vocabulary ?? []).map((v) => v.word.toLowerCase())),
    [data],
  );
}
