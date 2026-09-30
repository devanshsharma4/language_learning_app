import { forwardRef } from 'react';

interface RuledTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  className?: string;
}

/**
 * Lined paper you can type on. `--rule-h` on `.ruled-input` is matched to
 * the 32px line-height below — change one and the text floats off the lines.
 *
 * Focus is a pen border plus a soft ring rather than the global outline, so the
 * sheet looks drawn-on rather than selected. The border *width* is held
 * constant through that change: growing it on focus reflows the text and makes
 * the rules behind it jump.
 */
const RuledTextarea = forwardRef<HTMLTextAreaElement, RuledTextareaProps>(
  function RuledTextarea({ className = '', ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={`ruled-input block w-full resize-none rounded-xl border-[1.5px] border-line bg-white px-4 py-1.5 font-read text-[17px] leading-8 outline-none transition-shadow placeholder:text-ink-3 focus:border-pen focus:shadow-ring disabled:opacity-60 ${className}`}
        {...props}
      />
    );
  },
);

export default RuledTextarea;
