import { useEffect, useState } from 'react';
import { PART_OF_SPEECH_STYLES } from '../../lib/partOfSpeech';

export interface OutlineSection {
  id: string;
  label: string;
}

interface LessonOutlineProps {
  sections: OutlineSection[];
  /** Position in the user's lessons, oldest first. Omitted when unknown. */
  pageNumber?: number;
}

const nounInk = { '--hl': PART_OF_SPEECH_STYLES.noun.rgb } as React.CSSProperties;

/**
 * The lesson's parts, written in the left margin.
 *
 * Numbered because the lesson genuinely is a sequence — you read, then answer,
 * then write — and the numbers are how the section chips ("part 2 · 5
 * questions") and this list refer to the same thing.
 *
 * Hidden below xl, where there is no margin to write in.
 */
export default function LessonOutline({ sections, pageNumber }: LessonOutlineProps) {
  const [activeId, setActiveId] = useState<string | undefined>(sections[0]?.id);

  /**
   * The current section is the last one whose heading has passed the trigger
   * line — not the topmost one on screen.
   *
   * An IntersectionObserver gets this wrong here: the lesson's sections differ
   * enormously in height, so the tall questions block is still intersecting
   * long after the writing prompts have scrolled into view, and "topmost
   * visible" keeps naming the section you have already left behind.
   */
  // `sections` is rebuilt on every parent render, so the effect keys off the
  // ids instead — otherwise it tears down and re-attaches its scroll listener
  // on each keystroke in the lesson form.
  const sectionKey = sections.map((section) => section.id).join(',');

  useEffect(() => {
    const TRIGGER = 120;
    let frame = 0;

    function update() {
      frame = 0;
      const tops = sectionKey.split(',').map((id) => ({
        id,
        top: document.getElementById(id)?.getBoundingClientRect().top ?? Infinity,
      }));

      const passed = tops.filter((section) => section.top <= TRIGGER);
      setActiveId(passed.length > 0 ? passed[passed.length - 1].id : tops[0]?.id);
    }

    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [sectionKey]);

  return (
    <aside className="mono hidden w-[150px] flex-shrink-0 whitespace-nowrap pl-8 pt-[150px] text-xs xl:block">
      <nav aria-label="Lesson sections" className="sticky top-6 flex flex-col gap-3.5">
        {pageNumber !== undefined && (
          <div className="font-bold text-ink">page {pageNumber}</div>
        )}

        {sections.map((section, index) => {
          const isActive = section.id === activeId;
          return (
            <a
              key={section.id}
              href={`#${section.id}`}
              aria-current={isActive ? 'true' : undefined}
              className={
                isActive
                  ? 'hl self-start px-1 font-bold text-ink no-underline'
                  : 'self-start text-ink-3 no-underline hover:text-ink'
              }
              style={isActive ? nounInk : undefined}
            >
              {index + 1} {section.label}
            </a>
          );
        })}
      </nav>
    </aside>
  );
}
