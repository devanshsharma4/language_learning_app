interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Accessible name — the field carries no visible label. */
  label: string;
  className?: string;
}

/**
 * The search box used on the contents, vocabulary and notes pages.
 *
 * Filtering happens in the browser against the already-loaded list rather than
 * round-tripping to the server: every one of those pages fetches its whole
 * collection up front, so a request per keystroke would be slower and no more
 * accurate.
 */
export default function SearchField({
  value,
  onChange,
  placeholder,
  label,
  className = '',
}: SearchFieldProps) {
  return (
    <label
      className={`flex h-11 items-center gap-2.5 rounded-lg border-[1.5px] border-line bg-white px-3.5 focus-within:border-pen ${className}`}
    >
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5B6170" strokeWidth="2.2" strokeLinecap="round" className="flex-shrink-0">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-4-4" />
      </svg>
      <input
        type="search"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full flex-grow border-0 bg-transparent text-[15px] outline-none placeholder:text-ink-3"
      />
    </label>
  );
}
