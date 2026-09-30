import { Link } from 'react-router-dom';
import type { SavedVocabulary } from '../../types';
import { isCJK, languageCode, shortDate } from '../../lib/languages';
import { normalizePartOfSpeech, partOfSpeechStyle } from '../../lib/partOfSpeech';
import { quote } from '../../lib/quotes';
import { Tape } from '../notebook';

interface WordCardProps {
  word: SavedVocabulary;
  /** Title of the lesson it came from, when we have it. */
  lessonTitle?: string;
  onRemove: () => void;
  /** Index in the grid — drives the small, stable rotation. */
  index: number;
}

/**
 * One saved word, as an index card.
 *
 * Rotations are derived from the index rather than randomised, so a card does
 * not jump to a new angle every time the list re-renders or a filter changes.
 * The cycle is deliberately short and the angles small: enough to look like a
 * stack of cards, not enough to look broken.
 */
const ROTATIONS = ['-0.7deg', '0.6deg', '-0.3deg', '0.5deg', '-0.5deg', '0.4deg'];

export default function WordCard({ word, lessonTitle, onRemove, index }: WordCardProps) {
  const style = partOfSpeechStyle(word.part_of_speech);
  const pos = normalizePartOfSpeech(word.part_of_speech);
  const rotation = ROTATIONS[index % ROTATIONS.length];

  return (
    <article
      className="group relative bg-white shadow-card"
      style={{ transform: `rotate(${rotation})` }}
    >
      <Tape
        tone={index % 2 === 0 ? 'sand' : 'blue'}
        className="-top-3 left-1/2 -ml-11"
        rotate={index % 2 === 0 ? -3 : 3}
        width={90}
      />

      {/* Visible on hover and whenever focused, so it is reachable by keyboard
          rather than hidden behind a pointer the user may not have. */}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${word.word} from your words`}
        className="absolute right-3.5 top-3.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-pen-badge text-ink-2 opacity-0 transition-opacity hover:bg-wrong-tint hover:text-wrong-text focus:opacity-100 group-hover:opacity-100"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      <div className="border-b-2 border-margin px-6 pb-3 pt-6">
        <span
          lang={word.language}
          className="hl font-display text-[26px] font-bold leading-snug"
          style={{ '--hl': style.rgb, '--hl-m': style.multiplier } as React.CSSProperties}
        >
          {word.word}
        </span>
        <div className="mono mt-2 flex items-center gap-2 text-[11px]">
          <span className={`rounded px-1.5 py-0.5 font-bold ${style.chip}`}>{pos}</span>
          <span className="text-ink-3">{languageCode(word.language)}</span>
        </div>
      </div>

      <div className="ruled px-6 pb-3.5 pt-1 text-[14px] leading-[26px]">
        {word.translation && (
          <div className="text-[16px] font-bold text-pen">{word.translation}</div>
        )}
        {word.explanation && <div className="text-ink-2">{word.explanation}</div>}
        {word.context && (
          <div
            lang={word.language}
            className={`font-read text-ink-2 ${isCJK(word.language) ? '' : 'italic'}`}
          >
            {quote(word.context, word.language)}
          </div>
        )}
      </div>

      {word.lesson_id ? (
        <Link
          to={`/lessons/${word.lesson_id}`}
          className="mono flex justify-between gap-3 border-t border-dashed border-line px-6 pb-4 pt-3 text-xs text-ink-3 no-underline"
        >
          <span className="truncate">
            {shortDate(word.created_at)}
            {lessonTitle ? ` · ${lessonTitle}` : ''}
          </span>
          <span className="flex-shrink-0 font-bold text-pen">open →</span>
        </Link>
      ) : (
        /* The lesson was deleted — the word outlives it by design. */
        <p className="mono m-0 border-t border-dashed border-line px-6 pb-4 pt-3 text-xs text-ink-3">
          {shortDate(word.created_at)} · lesson deleted
        </p>
      )}
    </article>
  );
}
