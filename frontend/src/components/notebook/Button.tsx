import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Spinner from './Spinner';

type Variant = 'primary' | 'secondary' | 'quiet';

const VARIANTS: Record<Variant, string> = {
  // The sticker shadow is the one loud thing about this button. It does not
  // move on hover — a sticker is stuck down.
  //
  // Disabled goes grey rather than a pale blue: the dashboard's in-flight state
  // is itself a pale blue button, and a faded primary next to it read as
  // "working" when it actually meant "nothing to submit yet".
  primary:
    'bg-pen text-white shadow-sticker hover:bg-pen-dark disabled:bg-line disabled:text-ink-3 disabled:shadow-none',
  secondary:
    'border-[1.5px] border-pen bg-pen-tint text-pen-dark hover:bg-pen-chip disabled:opacity-50',
  quiet: 'border-[1.5px] border-line-strong bg-white text-ink-2 hover:border-pen hover:text-pen-dark',
};

interface CommonProps {
  children: ReactNode;
  variant?: Variant;
  className?: string;
}

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-base font-750 casual no-underline transition-colors disabled:cursor-not-allowed';

type ButtonProps = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & {
    loading?: boolean;
  };

export function Button({
  children,
  variant = 'primary',
  className = '',
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${BASE} ${VARIANTS[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size={16} className="border-white/40 border-t-white" />}
      {children}
    </button>
  );
}

type ButtonLinkProps = CommonProps & { to: string };

export function ButtonLink({ children, variant = 'primary', className = '', to }: ButtonLinkProps) {
  return (
    <Link to={to} className={`${BASE} ${VARIANTS[variant]} ${className}`}>
      {children}
    </Link>
  );
}
