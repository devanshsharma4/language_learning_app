import { Link } from 'react-router-dom';
import type { SavedVocabulary } from '../../types';
import { partOfSpeechStyle } from '../../lib/partOfSpeech';

interface NotesPanelProps {
  value: string;
  onChange: (value: string) => void;
  status: 'idle' | 'saving' | 'saved' | 'error';
}

const STATUS_TEXT: Record<NotesPanelProps['status'], string> = {
  idle: '',
  saving: 'saving…',
  saved: 'saved',
  error: "couldn't save — retrying on your next edit",
};

/**
 * The lesson note, written on notebook paper.
 *
 * The red margin rule is part of the field rather than decoration around it:
 * the text starts to the right of it, the way writing on a real page does. This
 * is the only place in the app where the margin line is something you write
 * next to rather than beside.
 */
export function NotesPanel({ value, onChange, status }: NotesPanelProps) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="m-0 font-display text-[22px] font-bold">Your notes</h2>
        {/* aria-live so the save state is announced, not only shown. */}
        <span role="status" aria-live="polite" className="mono flex items-center gap-1.5 text-xs text-ink-3">
          {status === 'saved' && (
            <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2F8A4C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12l5 5 9-10" />
            </svg>
          )}
          <span className={status === 'error' ? 'text-wrong-text' : undefined}>
            {STATUS_TEXT[status]}
          </span>
        </span>
      </div>

      <label htmlFor="lesson-note" className="sr-only">
        Your notes for this lesson
      </label>
      <textarea
        id="lesson-note"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Patterns you noticed, things to look up…"
        className="ruled-notes block h-56 w-full resize-none rounded border-[1.5px] border-line-strong bg-white py-1 pl-11 pr-4 text-[15px] leading-[30px] outline-none placeholder:text-ink-3 focus:border-pen focus:shadow-ring"
      />
    </div>
  );
}

interface SavedWordsPanelProps {
  words: SavedVocabulary[];
}

/**
 * The words kept from this lesson, each marked in the ink of its part of
 * speech — the same colour it carried in the article, so the connection back to
 * where you met it survives the page change.
 */
export function SavedWordsPanel({ words }: SavedWordsPanelProps) {
  if (words.length === 0) return null;

  return (
    <div>
      <div className="mb-3.5 flex items-baseline justify-between gap-3">
        <h2 className="m-0 font-display text-[22px] font-bold">Words you saved</h2>
        <span className="mono text-xs text-ink-3">{words.length}</span>
      </div>

      <div className="flex flex-col gap-2.5">
        {words.map((word) => {
          const { rgb, multiplier } = partOfSpeechStyle(word.part_of_speech);
          return (
            <div key={word.id} className="rounded-xl border-[1.5px] border-line bg-white px-4 py-3">
              <span
                lang={word.language}
                className="hl font-display text-[19px] font-bold"
                style={{ '--hl': rgb, '--hl-m': multiplier } as React.CSSProperties}
              >
                {word.word}
              </span>
              {word.translation && (
                <p className="mt-1 text-sm text-ink-2">{word.translation}</p>
              )}
            </div>
          );
        })}

        <Link to="/vocabulary" className="mt-1.5 text-sm font-650 no-underline hover:underline">
          All your words →
        </Link>
      </div>
    </div>
  );
}
