import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import type { Note } from '../types';

const languageEmoji: Record<string, string> = {
  spanish: '\uD83C\uDDEA\uD83C\uDDF8',
  french: '\uD83C\uDDEB\uD83C\uDDF7',
  japanese: '\uD83C\uDDEF\uD83C\uDDF5',
  korean: '\uD83C\uDDF0\uD83C\uDDF7',
};

export default function NotesOverview() {
  const { data, isLoading, error } = useQuery<{ notes: Note[]; total: number }>({
    queryKey: ['notes'],
    queryFn: async () => {
      const { data } = await api.get('/notes?limit=200');
      return data.data ?? data;
    },
  });

  // One note per lesson, so each note = one card
  const notes = data?.notes ?? [];

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
          <h1 className="font-display text-3xl font-bold text-bark">Notes</h1>
          <p className="text-bark-light mt-1">Your notes from completed lessons</p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-bark-light">
              <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading notes...
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-center">
            Failed to load notes.
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && notes.length === 0 && (
          <div className="text-center py-20">
            <div className="text-sage mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            </div>
            <p className="text-bark-light mb-2">No notes yet</p>
            <p className="text-sm text-bark-light/60">Complete a lesson and jot down notes on the results page.</p>
          </div>
        )}

        {/* Notes list */}
        {notes.length > 0 && (
          <div className="space-y-3">
            {notes.map((note) => (
              <Link
                key={note.id}
                to={`/lessons/${note.lesson_id}/results`}
                className="block bg-white rounded-2xl border border-sand shadow-sm p-5 hover:shadow-md hover:border-sage/30 transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-lg font-semibold text-bark truncate">
                      {note.article_title || 'Untitled Article'}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      {note.language && (
                        <span className="text-sm text-bark-light">
                          {languageEmoji[note.language] ?? ''} {note.language}
                        </span>
                      )}
                      <span className="text-bark-light/30">|</span>
                      <span className="text-sm text-bark-light/60">
                        {new Date(note.updated_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-bark-light/70 line-clamp-2">
                      {note.content}
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-bark-light/40 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
