/**
 * Quotation marks, per language.
 *
 * A learner reading French should see French quotation marks around a French
 * sentence — the marks are part of the writing system being taught, and setting
 * everything in English curly quotes quietly teaches the wrong convention.
 *
 * French inserts a narrow no-break space (U+202F) inside the guillemets. It is
 * non-breaking on purpose: a regular space there lets the line wrap between the
 * mark and the word it encloses.
 */
interface QuotePair {
  open: string;
  close: string;
}

const NARROW_NBSP = ' ';

const QUOTES: Record<string, QuotePair> = {
  // Guillemets, spaced — the Imprimerie nationale convention.
  french: { open: `«${NARROW_NBSP}`, close: `${NARROW_NBSP}»` },
  // The RAE gives comillas latinas as the first-level mark in Spanish.
  spanish: { open: '«', close: '»' },
  // Japanese corner brackets. No spacing — CJK punctuation carries its own.
  japanese: { open: '「', close: '」' },
  // Korean uses curly double quotes for direct speech in horizontal text.
  korean: { open: '“', close: '”' },
};

const DEFAULT_QUOTES: QuotePair = { open: '“', close: '”' };

function quotePair(language: string): QuotePair {
  return QUOTES[language] ?? DEFAULT_QUOTES;
}

/** Wraps text in the quotation marks that language uses. */
export function quote(text: string, language: string): string {
  const { open, close } = quotePair(language);
  return `${open}${text}${close}`;
}
