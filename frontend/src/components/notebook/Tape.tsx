interface TapeProps {
  tone?: 'sand' | 'blue';
  /** Tailwind positioning classes — tape is always placed by its parent. */
  className?: string;
  /** Degrees. Kept small: ±0.3–1.5° on cards, a little more on loose strips. */
  rotate?: number;
  width?: number;
}

/**
 * A strip of washi tape holding a sheet to the page. Purely decorative, so it
 * is hidden from assistive tech.
 */
export default function Tape({
  tone = 'sand',
  className = '',
  rotate = -4,
  width = 104,
}: TapeProps) {
  return (
    <div
      aria-hidden="true"
      className={`absolute h-[30px] ${tone === 'sand' ? 'bg-tape-sand' : 'bg-tape-blue'} ${className}`}
      style={{ width, transform: `rotate(${rotate}deg)` }}
    />
  );
}
