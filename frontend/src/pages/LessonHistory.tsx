import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import type { LessonSummary } from '../types';

const languageLabels: Record<string, string> = {
  spanish: 'Spanish',
  french: 'French',
  japanese: 'Japanese',
  korean: 'Korean',
};

const languageEmoji: Record<string, string> = {
  spanish: '\uD83C\uDDEA\uD83C\uDDF8',
  french: '\uD83C\uDDEB\uD83C\uDDF7',
  japanese: '\uD83C\uDDEF\uD83C\uDDF5',
  korean: '\uD83C\uDDF0\uD83C\uDDF7',
};

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70
    ? 'text-sage-dark bg-sage/10 border-sage/30'
    : 'text-terracotta bg-terracotta/10 border-terracotta/30';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold border ${color}`}>
      {score}%
    </span>
  );
}

export default function LessonHistory() {
  const { data, isLoading, error } = useQuery<{ lessons: LessonSummary[]; total: number }>({
    queryKey: ['lessons'],
    queryFn: async () => {
      const { data } = await api.get('/lessons?limit=50');
      return data.data ?? data;
    },
  });

  const lessons = data?.lessons ?? [];

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
          <h1 className="font-display text-3xl font-bold text-bark">My Lessons</h1>
          <p className="text-bark-light mt-1">Your completed and in-progress lessons</p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-bark-light">
              <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading lessons...
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-center">
            Failed to load lessons.
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && lessons.length === 0 && (
          <div className="text-center py-20">
            <div className="text-sage mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <p className="text-bark-light mb-4">No lessons yet</p>
            <Link
              to="/dashboard"
              className="inline-block px-6 py-3 bg-sage hover:bg-sage-dark text-white font-semibold rounded-2xl shadow-md transition-all duration-200"
            >
              Create Your First Lesson
            </Link>
          </div>
        )}

        {/* Lesson list */}
        {lessons.length > 0 && (
          <div className="space-y-3">
            {lessons.map((lesson) => {
              const href = lesson.completed
                ? `/lessons/${lesson.id}/results`
                : `/lessons/${lesson.id}`;

              return (
                <Link
                  key={lesson.id}
                  to={href}
                  className="block bg-white rounded-2xl border border-sand shadow-sm p-5 hover:shadow-md hover:border-sage/30 transition-all duration-200"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-lg font-semibold text-bark truncate">
                        {lesson.article_title || 'Untitled Article'}
                      </h3>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-sm text-bark-light">
                          {languageEmoji[lesson.language] ?? ''} {languageLabels[lesson.language] ?? lesson.language}
                        </span>
                        <span className="text-bark-light/30">|</span>
                        <span className="text-sm text-bark-light capitalize">{lesson.difficulty}</span>
                        <span className="text-bark-light/30">|</span>
                        <span className="text-sm text-bark-light">
                          {new Date(lesson.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {lesson.completed && lesson.overall_score != null ? (
                        <ScoreBadge score={lesson.overall_score} />
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium text-bark-light bg-cream-dark border border-sand">
                          In Progress
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
