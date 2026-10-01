import type { Language } from './languages';

export interface ReadingSource {
  name: string;
  /** Where to browse for something to read, not a link to paste directly. */
  url: string;
  /** One line on what you'll find there, from the reader's point of view. */
  note: string;
}

/**
 * Where to find something worth reading, per language.
 *
 * Listed because finding material is the hard part of reading in a language you
 * are learning, and because a link that can't be read makes the whole feature
 * feel broken. Every site here was checked against the extraction pipeline.
 *
 * News sites behind paywalls are deliberately absent however good their writing
 * is: a subscriber-only article returns 402 and can only ever be pasted.
 */
const SOURCES: Record<Language, ReadingSource[]> = {
  spanish: [
    { name: 'RTVE Noticias', url: 'https://www.rtve.es/noticias/', note: 'Spain’s public broadcaster. Free, and most pieces run short.' },
    { name: 'BBC Mundo', url: 'https://www.bbc.com/mundo', note: 'World news written plainly, with a lot of Latin America.' },
  ],
  french: [
    { name: 'RFI Français facile', url: 'https://francaisfacile.rfi.fr/fr/', note: 'News written for learners, with the vocabulary explained.' },
    { name: 'France Info', url: 'https://www.francetvinfo.fr/', note: 'Public radio and TV news. Free and updated through the day.' },
  ],
  japanese: [
    { name: 'NHK News Web Easy', url: 'https://www3.nhk.or.jp/news/easy/', note: 'The day’s news rewritten simply, with furigana.' },
    { name: 'NHK News', url: 'https://www3.nhk.or.jp/news/', note: 'The same stories at full speed, when Easy feels too easy.' },
  ],
  korean: [
    { name: 'KBS 뉴스', url: 'https://news.kbs.co.kr/', note: 'Korea’s public broadcaster. Free and broad.' },
    { name: '연합뉴스', url: 'https://www.yna.co.kr/', note: 'The national wire service — short, factual reports.' },
  ],
};

const WIKIPEDIA_SUBDOMAIN: Record<Language, string> = {
  spanish: 'es',
  french: 'fr',
  japanese: 'ja',
  korean: 'ko',
};

/**
 * Wikipedia, which is recommended first for every language.
 *
 * Not only editorial preference: Wikipedia links are read through its API
 * rather than scraped off the page, so they can't be paywalled, blocked, or
 * mis-parsed, and they're the one source guaranteed to come through clean.
 */
export function wikipediaSource(language: Language): ReadingSource {
  return {
    name: 'Wikipedia',
    url: `https://${WIKIPEDIA_SUBDOMAIN[language]}.wikipedia.org/`,
    note: 'Anything you’re already curious about, at any length.',
  };
}

export function readingSources(language: Language): ReadingSource[] {
  return SOURCES[language] ?? [];
}
