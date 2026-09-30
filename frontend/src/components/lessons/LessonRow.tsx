import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { LessonSummary } from '../../types';
import { languageChip, languageCode, shortDate } from '../../lib/languages';
import { ScoreMark } from '../notebook';

interface LessonRowProps {
  lesson: LessonSummary;
  /** Position in the notebook, oldest first. */
  page: number;
  /** The newest row is set as a card, the rest as plain contents lines. */
  featured?: boolean;
  onDelete: (id: string) => void;
  deleting: boolean;
}

/**
 * One line in the table of contents.
 *
 * The dotted leader between the title and its metadata is doing real work: it
 * ties a left-aligned title to right-aligned data across a wide gap, which is
 * exactly the problem a printed contents page solves the same way.
 */
export default function LessonRow({
  lesson,
  page,
  featured = false,
  onDelete,
  deleting,
}: LessonRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Closing always disarms the confirmation, so reopening the menu never starts
   * one click away from deleting something. Done here rather than in an effect
   * watching `menuOpen` — every path that closes the menu goes through this.
   */
  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setConfirming(false);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) closeMenu();
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeMenu();
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen, closeMenu]);

  const title = lesson.article_title_english || lesson.article_title || 'Untitled';
  const href = lesson.completed ? `/lessons/${lesson.id}/results` : `/lessons/${lesson.id}`;

  return (
    <li
      className={`grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-4 lg:grid-cols-[3.5rem_minmax(0,1fr)_11rem_5rem_8rem_2.5rem] ${
        featured
          ? '-mx-3.5 rounded-xl border-[1.5px] border-line bg-white px-3.5 shadow-[0_10px_20px_-16px_rgba(30,34,48,0.4)]'
          : 'border-b border-dashed border-line'
      } ${deleting ? 'opacity-40' : ''}`}
    >
      <span className="mono text-[13px] text-ink-3">p.{page}</span>

      <Link to={href} className="flex min-w-0 items-baseline gap-3 text-ink no-underline">
        <span className="truncate font-display text-[20px] font-bold">{title}</span>
        <span aria-hidden="true" className="min-w-5 flex-grow border-b-2 border-dotted border-line-strong" />
      </Link>

      <span className="mono col-start-2 flex items-center gap-2 text-xs lg:col-start-3">
        <span className={`rounded px-2 py-0.5 font-bold ${languageChip(lesson.language)}`}>
          {languageCode(lesson.language)}
        </span>
        <span className="text-ink-2">{lesson.difficulty}</span>
      </span>

      <span className="mono hidden text-xs text-ink-3 lg:block">{shortDate(lesson.created_at)}</span>

      <span className="col-start-3 row-start-1 justify-self-end lg:col-start-5 lg:justify-self-start">
        {lesson.completed && lesson.overall_score != null ? (
          <ScoreMark>{lesson.overall_score}%</ScoreMark>
        ) : (
          <Link
            to={href}
            className="mono flex items-center gap-1.5 rounded-md bg-[#FFF1C4] px-2.5 py-1 text-xs font-bold text-[#5C4400] no-underline hover:bg-[#FFE79C]"
          >
            continue
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        )}
      </span>

      <div ref={containerRef} className="relative col-start-3 justify-self-end lg:col-start-6">
        <button
          type="button"
          onClick={() => (menuOpen ? closeMenu() : setMenuOpen(true))}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={`More options for ${title}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-pen-badge text-ink-2 hover:text-ink"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-[calc(100%+6px)] z-20 w-52 rounded-xl border-[1.5px] border-line-strong bg-white p-1.5 shadow-card"
          >
            {/*
              * Two steps rather than a window.confirm. Deleting a lesson takes
              * its feedback and notes with it and cannot be undone, so the
              * first click only arms the action — and closing the menu disarms
              * it again.
              */}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                if (confirming) {
                  onDelete(lesson.id);
                  closeMenu();
                } else {
                  setConfirming(true);
                }
              }}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold ${
                confirming
                  ? 'bg-wrong-tint text-wrong-text'
                  : 'text-ink-2 hover:bg-wrong-tint hover:text-wrong-text'
              }`}
            >
              {confirming ? 'Really delete this page?' : 'Delete lesson'}
            </button>
            {confirming && (
              <p className="mono px-3 pb-1 pt-2 text-[11px] leading-snug text-ink-3">
                Your saved words stay in the word bank.
              </p>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
