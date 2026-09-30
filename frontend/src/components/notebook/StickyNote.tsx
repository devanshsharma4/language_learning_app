import type { ReactNode } from 'react';
import Tape from './Tape';

interface StickyNoteProps {
  children: ReactNode;
  className?: string;
  rotate?: number;
  /** Sticky notes carry status messages, so they usually want announcing. */
  live?: boolean;
}

/**
 * A sticky note. Used for messages that are asides rather than page content:
 * the server-is-waking wait message, tutor feedback on the results page.
 *
 * The slight rotation is the whole effect — it is the one thing on the page
 * that is not square to the grid, which is why it reads as stuck on afterwards.
 */
export default function StickyNote({
  children,
  className = '',
  rotate = -1.2,
  live = false,
}: StickyNoteProps) {
  return (
    <div
      role={live ? 'status' : undefined}
      aria-live={live ? 'polite' : undefined}
      className={`relative bg-note px-5 py-4 text-[15px] leading-relaxed text-ink shadow-card ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <Tape tone="sand" className="-top-3 left-1/2 -ml-[44px]" rotate={-3} width={88} />
      {children}
    </div>
  );
}
