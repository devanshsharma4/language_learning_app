import type { Feedback } from '../../types';
import SectionHeading from './SectionHeading';

interface VocabSuggestionsProps {
  suggestions: Feedback['vocabulary_suggestions'];
  language: string;
}

/**
 * Better words for ones you already reached for.
 *
 * Called "Word upgrades" rather than "Vocabulary suggestions" because it is not
 * a correction — what you wrote was right, this is just sharper. The word you
 * used is set in grey and the replacement in the UI face at full weight, so the
 * direction of the swap is legible without reading the arrow.
 */
export default function VocabSuggestions({ suggestions, language }: VocabSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <section id="up" className="scroll-mt-6">
      <SectionHeading heading="Word upgrades" aside="say it better" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {suggestions.map((suggestion, idx) => (
          <div key={idx} className="rounded-xl border-[1.5px] border-line bg-white px-5 py-4">
            {/*
              * Stacked rather than side by side. The model often returns whole
              * clauses here, not single words, and an inline "original → better"
              * wraps into a shape where the arrow lands at the end of a line and
              * reads as punctuation instead of a direction.
              */}
            <div lang={language} className="font-read text-[17px]">
              <p className="m-0 text-ink-3">{suggestion.original}</p>
              <p className="m-0 mt-1 flex gap-2">
                <svg aria-label="becomes" role="img" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-1 flex-shrink-0">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
                <span className="casual font-extrabold">{suggestion.suggested}</span>
              </p>
            </div>
            <p className="mt-1.5 text-sm text-ink-2">{suggestion.reason}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
