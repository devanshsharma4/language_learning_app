import type { ReactNode } from 'react';

/**
 * What to show in place of a score.
 *
 * "skipped" and "not graded" are different facts and the learner should be able
 * to tell them apart: one is a choice they made, the other is the demo lesson
 * declining to spend a real model call on free text. Both are excluded from the
 * average either way.
 */
export function UngradedMark({ attempted }: { attempted: boolean }) {
  return (
    <span className="mono flex-shrink-0 rounded-md border-[1.5px] border-dashed border-line-dash px-2.5 py-1 text-xs text-ink-3">
      {attempted ? 'not graded' : 'skipped'}
    </span>
  );
}

export function UngradedNote({ attempted, children }: { attempted: boolean; children?: ReactNode }) {
  return (
    <p className="m-0 rounded-xl border-[1.5px] border-dashed border-line-dash px-4 py-3 text-[15px] text-ink-3">
      {children ??
        (attempted
          ? 'This wasn’t graded, so it isn’t counted in your score.'
          : 'You left this one blank, so it isn’t counted in your score.')}
    </p>
  );
}
