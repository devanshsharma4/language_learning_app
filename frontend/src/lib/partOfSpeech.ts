/**
 * Part of speech drives highlighter color, and that mapping is a *meaning*: the
 * same ink means the same grammatical category on every screen. Colors live
 * here rather than in tailwind.config.js because the marker gradient needs raw
 * RGB triples, and because the color and the category it encodes should not be
 * separable.
 *
 * `partOfSpeech` arrives as free text from the model — the prompt asks for
 * "noun, verb, adjective, adverb, etc." and gets everything from "noun" to
 * "nm" to "verbe" to "reflexive verb". Anything unrecognized lands in `other`
 * rather than going uncolored, so a word is never left unhighlighted because
 * its label was unexpected.
 */
export const PARTS_OF_SPEECH = ['noun', 'verb', 'adjective', 'adverb', 'other'] as const;

export type PartOfSpeech = (typeof PARTS_OF_SPEECH)[number];

interface PartOfSpeechStyle {
  /** RGB triple for the `--hl` custom property on `.hl`. */
  rgb: string;
  /** Alpha multiplier — lighter inks need boosting to read at equal strength. */
  multiplier: number;
  /** Tailwind classes for the chip form (definition card, filter pills). */
  chip: string;
  /** Plural label for keys and filters. */
  plural: string;
}

export const PART_OF_SPEECH_STYLES: Record<PartOfSpeech, PartOfSpeechStyle> = {
  noun: {
    rgb: '120,175,255',
    multiplier: 1,
    chip: 'bg-pen-chip text-pen-dark',
    plural: 'nouns',
  },
  verb: {
    rgb: '255,140,180',
    multiplier: 0.92,
    chip: 'bg-wrong-tint text-wrong-text',
    plural: 'verbs',
  },
  adjective: {
    rgb: '255,215,90',
    // Yellow is the lightest ink here and disappears at the base alphas.
    multiplier: 1.18,
    chip: 'bg-[#FFF1C4] text-[#7A5A00]',
    plural: 'adjectives',
  },
  adverb: {
    rgb: '120,210,140',
    multiplier: 1,
    chip: 'bg-correct-tint text-correct-text',
    plural: 'adverbs',
  },
  // The handoff left this one open and suggested lavender; taken as suggested.
  other: {
    rgb: '180,150,255',
    multiplier: 1,
    chip: 'bg-[#EADFFF] text-[#5A2E9E]',
    plural: 'other',
  },
};

/**
 * Longest match wins, so "reflexive verb" resolves to verb and "proper noun" to
 * noun. Checked against the whole string first for the common exact cases.
 */
const ALIASES: Array<[RegExp, PartOfSpeech]> = [
  // Adverb is tested first: "adv." and "adj." overlap, and "adverbe" would
  // otherwise be caught by the verb pattern.
  [/\badverb|\badv\b|adverbio|adverbe/i, 'adverb'],
  [/\bnoun|\bnom\b|\bn\.|\bnm\b|\bnf\b|sustantivo|substantif|名詞|명사/i, 'noun'],
  [/\bverb|\bv\.|\bvb\b|verbo|verbe|動詞|동사/i, 'verb'],
  [/\badjectiv|\badj\b|adjetivo|adjectif|形容詞|형용사/i, 'adjective'],
];

export function normalizePartOfSpeech(raw: string | null | undefined): PartOfSpeech {
  if (!raw) return 'other';

  const value = raw.trim().toLowerCase();
  if ((PARTS_OF_SPEECH as readonly string[]).includes(value)) {
    return value as PartOfSpeech;
  }

  // Adverb is tested before noun/verb because "adverb" contains neither, but
  // several abbreviations overlap ("adv." vs "adj.").
  for (const [pattern, pos] of ALIASES) {
    if (pattern.test(value)) return pos;
  }

  return 'other';
}

export function partOfSpeechStyle(raw: string | null | undefined): PartOfSpeechStyle {
  return PART_OF_SPEECH_STYLES[normalizePartOfSpeech(raw)];
}

/** Counts per category, in canonical order, for the highlighter key. */
export function countByPartOfSpeech<T>(
  items: T[],
  getPartOfSpeech: (item: T) => string | null | undefined,
): Array<{ pos: PartOfSpeech; count: number }> {
  const counts = new Map<PartOfSpeech, number>();
  for (const item of items) {
    const pos = normalizePartOfSpeech(getPartOfSpeech(item));
    counts.set(pos, (counts.get(pos) ?? 0) + 1);
  }

  return PARTS_OF_SPEECH.filter((pos) => counts.has(pos)).map((pos) => ({
    pos,
    count: counts.get(pos)!,
  }));
}
