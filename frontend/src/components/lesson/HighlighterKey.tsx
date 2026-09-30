import type { VocabularyItem } from '../../types';
import {
  countByPartOfSpeech,
  PART_OF_SPEECH_STYLES,
} from '../../lib/partOfSpeech';

interface HighlighterKeyProps {
  vocabulary: VocabularyItem[];
  savedCount: number;
}

/**
 * The legend for the marker colors, in the right margin above the definition
 * card.
 *
 * It does real work rather than decorating: the counts tell you the shape of
 * what you are about to read — eight verbs and one noun is a different lesson
 * from the reverse — and the colors are only legible as grammar once something
 * names them.
 */
export default function HighlighterKey({ vocabulary, savedCount }: HighlighterKeyProps) {
  const counts = countByPartOfSpeech(vocabulary, (item) => item.partOfSpeech);

  if (counts.length === 0) return null;

  return (
    <div className="mono flex flex-col gap-2.5 text-[13px] text-ink">
      <div className="font-bold">highlighter key</div>

      {counts.map(({ pos, count }) => {
        const { rgb, multiplier, plural } = PART_OF_SPEECH_STYLES[pos];
        return (
          <div key={pos} className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="hl h-3.5 w-9 flex-shrink-0"
              style={{ '--hl': rgb, '--hl-m': multiplier } as React.CSSProperties}
            />
            <span className="flex-grow">{plural}</span>
            <span className="text-ink-3">{count}</span>
          </div>
        );
      })}

      {savedCount > 0 && (
        <div className="mt-1.5 flex items-center gap-2 text-ink-3">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2B4FD8" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12l5 5 9-10" />
          </svg>
          {savedCount} saved to your words
        </div>
      )}
    </div>
  );
}
