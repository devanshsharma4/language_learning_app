import type { Feedback } from '../../types';

interface VocabSuggestionsProps {
  suggestions: Feedback['vocabulary_suggestions'];
}

export default function VocabSuggestions({ suggestions }: VocabSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold text-bark mb-6">
        Vocabulary Suggestions
      </h2>
      <div className="bg-white rounded-2xl border border-sand shadow-sm divide-y divide-sand">
        {suggestions.map((s, idx) => (
          <div key={idx} className="px-6 py-4">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="text-bark-light">{s.original}</span>
              <svg className="w-4 h-4 text-bark-light flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <span className="font-medium text-sage-dark">{s.suggested}</span>
            </div>
            <p className="text-sm text-bark-light">{s.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
