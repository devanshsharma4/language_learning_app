interface SpinnerProps {
  size?: number;
  className?: string;
  /** Accessible name. Omit when a sibling already announces the wait. */
  label?: string;
}

/**
 * A 3px ring with one pen-blue arc. Uses a border rather than an SVG so the
 * track and arc stay crisp at any size.
 *
 * `prefers-reduced-motion` is honored globally in index.css, which pins the
 * animation to a single frame — the ring still reads as a progress indicator
 * standing still, so there is no separate static fallback.
 */
export default function Spinner({ size = 20, className = '', label }: SpinnerProps) {
  return (
    <span
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`inline-block flex-shrink-0 animate-spin rounded-full border-[3px] border-pen-chip border-t-pen ${className}`}
      style={{ width: size, height: size, animationDuration: '0.9s' }}
    />
  );
}
