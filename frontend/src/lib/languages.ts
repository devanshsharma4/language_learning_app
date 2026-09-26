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
  flag: string;
}

const LANGUAGE_META: Record<Language, LanguageMeta> = {
  spanish: { nativeName: 'Español', englishName: 'Spanish', flag: '🇪🇸' },
  french: { nativeName: 'Français', englishName: 'French', flag: '🇫🇷' },
  japanese: { nativeName: '日本語', englishName: 'Japanese', flag: '🇯🇵' },
  korean: { nativeName: '한국어', englishName: 'Korean', flag: '🇰🇷' },
};

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Falls back to the raw key so an unknown language degrades to "Italian", never blank. */
function meta(language: string): LanguageMeta {
  return (
    LANGUAGE_META[language as Language] ?? {
      nativeName: capitalise(language),
      englishName: capitalise(language),
      flag: '🌐',
    }
  );
}

export const languageNativeName = (language: string): string => meta(language).nativeName;
export const languageEnglishName = (language: string): string => meta(language).englishName;
export const languageFlag = (language: string): string => meta(language).flag;

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

export const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;

export type Difficulty = (typeof DIFFICULTIES)[number];

export function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === 'string' && (DIFFICULTIES as readonly string[]).includes(value);
}
