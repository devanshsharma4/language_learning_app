import { forwardRef } from 'react';
import { partOfSpeechStyle } from '../../lib/partOfSpeech';

interface HighlightProps {
  /** The surface form as it appears in the article, not the dictionary form. */
  text: string;
  partOfSpeech?: string;
  /** Its definition card is currently open. */
  open?: boolean;
  /** Already in the user's saved words — earns a small blue check. */
  saved?: boolean;
  onToggle: () => void;
}

/**
 * A marked word in the article.
 *
 * Deliberately a `span role="button"` and not a `<button>`: a real button is a
 * replaced inline-block and cannot break across lines, so a multi-word phrase
 * like "ordinateur portable" caught at the end of a line would either overflow
 * the measure or jump whole to the next line. A span wraps naturally, and
 * `box-decoration-break: clone` on `.hl` redraws the marker stroke on each
 * fragment.
 */
const Highlight = forwardRef<HTMLSpanElement, HighlightProps>(function Highlight(
  { text, partOfSpeech, open = false, saved = false, onToggle },
  ref,
) {
  const { rgb, multiplier } = partOfSpeechStyle(partOfSpeech);

  return (
    <span
      ref={ref}
      role="button"
      tabIndex={0}
      aria-expanded={open}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onToggle();
        }
      }}
      className={`hl cursor-pointer ${open ? 'hl-open' : ''}`}
      style={{ '--hl': rgb, '--hl-m': multiplier } as React.CSSProperties}
    >
      {text}
      {saved && (
        <svg
          aria-label="saved"
          role="img"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#2B4FD8"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="ml-[3px] inline align-super"
        >
          <path d="M5 12l5 5 9-10" />
        </svg>
      )}
    </span>
  );
});

export default Highlight;
