/**
 * Single source of truth for language and difficulty presentation.
 *
 * These maps previously lived in four components with three different answers:
 * LessonHeader and Dashboard said "Espanol" (no accent -- in a language-learning
 * app), LessonHistory said "Spanish", and NotesOverview had emoji only and
 * rendered the raw lowercase key as the label.
 *
 * `nativeName` is what a learner sees in lesson chrome; `englishName` labels
 * lists and filters, where scanning matters more than authenticity.
 */
export const LANGUAGES = ['spanish', 'french', 'japanese', 'korean'] as const;

export type Language = (typeof LANGUAGES)[number];

interface LanguageMeta {
  nativeName: string;
  englishName: string;
  /** Two-letter code for chips. The redesign uses these instead of flags —
   *  a flag names a country, not a language. */
  code: string;
  /**
   * Tailwind classes for this language's chip.
   *
   * Each language gets a consistent ink so a mixed list is scannable by colour
   * before you read a single code. These reuse the same four hues as the
   * part-of-speech highlighters, which is safe because the two never appear in
   * the same form: a language is always a solid chip, a part of speech is
   * always a marker stroke.
   */
  chip: string;
}

const LANGUAGE_META: Record<Language, LanguageMeta> = {
  spanish: {
    nativeName: 'Español', englishName: 'Spanish', code: 'ES',
    chip: 'bg-correct-tint text-correct-text',
  },
  french: {
    nativeName: 'Français', englishName: 'French', code: 'FR',
    chip: 'bg-pen-chip text-pen-dark',
  },
  japanese: {
    nativeName: '日本語', englishName: 'Japanese', code: 'JA',
    chip: 'bg-wrong-tint text-wrong-text',
  },
  korean: {
    nativeName: '한국어', englishName: 'Korean', code: 'KO',
    chip: 'bg-[#FFF1C4] text-[#7A5A00]',
  },
};

/** Languages written without spaces between words, so they need different
 *  word-boundary and reading-speed handling. */
export function isCJK(language: string): boolean {
  return language === 'japanese' || language === 'korean';
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Falls back to the raw key so an unknown language degrades to "Italian", never blank. */
function meta(language: string): LanguageMeta {
  return (
    LANGUAGE_META[language as Language] ?? {
      nativeName: capitalise(language),
      englishName: capitalise(language),
      code: language.slice(0, 2).toUpperCase(),
      chip: 'bg-pen-badge text-ink-2',
    }
  );
}

export const languageNativeName = (language: string): string => meta(language).nativeName;
export const languageEnglishName = (language: string): string => meta(language).englishName;
export const languageCode = (language: string): string => meta(language).code;
export const languageChip = (language: string): string => meta(language).chip;

/** "sep 29" — the margin-note date format used across the notebook. */
export function shortDate(value: string | Date): string {
  return new Date(value)
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    .toLowerCase();
}

/** "september 2026" — the group heading on the contents page. */
export function monthLabel(value: string | Date): string {
  return new Date(value)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    .toLowerCase();
}

/**
 * Rough reading time in minutes, for the "~6 min read" chip.
 *
 * Deliberately slower than the 200-250wpm figure used for reading in your own
 * language: this is text you are working through, looking words up as you go.
 * CJK is counted in characters rather than whitespace-delimited words.
 */
export function estimateReadMinutes(text: string, language: string): number {
  const units = isCJK(language)
    ? text.replace(/\s/g, '').length
    : text.trim().split(/\s+/).filter(Boolean).length;
  const perMinute = isCJK(language) ? 130 : 40;
  return Math.max(1, Math.round(units / perMinute));
}

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

export const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;

export type Difficulty = (typeof DIFFICULTIES)[number];

export function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === 'string' && (DIFFICULTIES as readonly string[]).includes(value);
}
