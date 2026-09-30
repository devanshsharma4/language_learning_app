import type { ReactNode } from 'react';

/**
 * A score circled by hand in the margin.
 *
 * Deliberately not a coloured pill: a pill that turns red below some threshold
 * grades the grade. These are judgements of a few sentences of writing, and the
 * number says enough on its own.
 *
 * Takes children rather than a number because the units differ by context —
 * "6/10" against one answer, a bare "71" against a whole lesson.
 */
export default function ScoreMark({ children }: { children: ReactNode }) {
  return (
    <span
      className="mono flex-shrink-0 border-2 border-pen px-2.5 py-0.5 text-sm font-extrabold text-pen-dark"
      style={{ borderRadius: '48% 52% 50% 50% / 55% 45% 55% 45%' }}
    >
      {children}
    </span>
  );
}
