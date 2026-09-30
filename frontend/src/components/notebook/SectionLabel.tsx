import type { ReactNode } from 'react';

type Tone = 'pen' | 'verb' | 'adverb' | 'adjective';

const TONES: Record<Tone, string> = {
  pen: 'bg-pen-chip text-pen-dark',
  verb: 'bg-wrong-tint text-wrong-text',
  adverb: 'bg-correct-tint text-correct-text',
  adjective: 'bg-[#FFF1C4] text-[#7A5A00]',
};

interface SectionLabelProps {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}

/**
 * The chip above a section heading ("part 2 · 5 questions").
 *
 * Lowercase and in the mono voice on purpose — it is a margin annotation, not a
 * label. Tracked-out caps here would read as generic template chrome, and the
 * chip already carries enough structure without them. Each part of the lesson
 * gets its own ink so the sections are distinguishable at a glance while
 * scrolling.
 */
export default function SectionLabel({ children, tone = 'pen', className = '' }: SectionLabelProps) {
  return (
    <span
      className={`mono inline-block rounded-md px-2.5 py-[3px] text-xs font-bold ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
