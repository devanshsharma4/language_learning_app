import type { Feedback } from '../../types';

interface GrammarCorrectionsProps {
  corrections: Feedback['grammar_corrections'];
}

export default function GrammarCorrections({ corrections }: GrammarCorrectionsProps) {
  if (corrections.length === 0) return null;

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold text-bark mb-6">
        Grammar Corrections
      </h2>
      <div className="bg-white rounded-2xl border border-sand shadow-sm divide-y divide-sand">
        {corrections.map((c, idx) => (
          <div key={idx} className="px-6 py-4">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="line-through text-terracotta">{c.original}</span>
              <svg className="w-4 h-4 text-bark-light flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <span className="font-medium text-sage-dark">{c.corrected}</span>
            </div>
            <p className="text-sm text-bark-light">{c.explanation}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
