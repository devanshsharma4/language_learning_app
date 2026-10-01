/**
 * Regression harness for URL article extraction.
 *
 *   npm run check:extraction
 *
 * Every URL here is one that produced a specific, reproducible failure. The
 * assertions are the failures themselves: a phrase that must never appear in an
 * extracted article, or a rejection that must fire. The whole feature is
 * heuristic -- no extractor is guaranteed correct -- so the only way to change it
 * safely is to pin the cases we already know about and watch them.
 *
 * This hits the live internet. Sites change, and a failure here can mean the page
 * was redesigned rather than that the code broke. Read the diagnostics before
 * assuming a regression.
 */
import { articleService } from '../services/article/articleService';

interface Case {
  name: string;
  url: string;
  /** Drives `Accept-Language`, as a real lesson would. */
  language: string;
  /** What the extractor should do with this page. */
  expect: 'article' | 'reject';
  /** Substrings that must NOT survive into an extracted article. */
  forbid?: string[];
  /** As `forbid`, where the junk varies in spacing or digits. */
  forbidPattern?: RegExp;
  /** Substrings the article body must contain. */
  require?: string[];
  /** The article must open here — catches a caption winning the first slot. */
  startsWith?: string;
}

/**
 * No extracted article may detach a comma or full stop from the word before it.
 *
 * This is residue from replacing inline tags with a space, and it corrupts the
 * text given to the model -- `normalizeVocabulary()` verifies `surfaceForm`
 * occurs verbatim, so a stray space silently drops a highlight.
 *
 * Deliberately limited to `,` and `.`: French puts a genuine space before
 * `; : ? !` and inside `« »`, so those are not errors.
 */
function detachedPunctuation(text: string): string[] {
  return [...new Set(text.match(/\S\s+[,.](?:\s|$)/g) ?? [])].slice(0, 3);
}

const CASES: Case[] = [
  {
    name: 'lawlessfrench — article laid out inside a <table>',
    url: 'https://www.lawlessfrench.com/reading/labbaye-du-thoronet/',
    language: 'french',
    expect: 'article',
    // The donation plea is English boilerplate outside <article>; the rest is
    // site chrome that sat inside Readability's chosen subtree.
    forbid: [
      'please consider making a',
      'See the links at the bottom',
      'En lire plus',
      'Read more',
    ],
    require: ['Dans l’arrière-pays de Provence'],
  },
  {
    name: 'es.wikipedia — infobox and caption chrome',
    url: 'https://es.wikipedia.org/wiki/Ballena',
    language: 'spanish',
    expect: 'article',
    forbid: ['[editar datos en Wikidata]'],
    require: ['Balaenidae'],
    // Not "Ballena franca glacial." — that is an image caption, and it currently
    // wins the first slot.
    startsWith: 'Los balénidos',
  },
  {
    name: 'fr.wikipedia — footnote markers',
    url: 'https://fr.wikipedia.org/wiki/Baleine',
    language: 'french',
    expect: 'article',
    // Footnote markers are extraction residue, not words to learn. Checked as a
    // pattern because fixing the spacing turned "[ 1 ]" into "[1]".
    forbidPattern: /\[\s*\d{1,3}\s*\]/,
    require: ['phálaina'],
  },
  {
    name: 'VOA Spanish — clipboard toasts and newsletter terms',
    url: 'https://www.vozdeamerica.com/',
    language: 'spanish',
    // A homepage: index detection should reject it outright.
    expect: 'reject',
  },
  {
    name: 'lemonde homepage — headline soup',
    url: 'https://www.lemonde.fr/',
    language: 'french',
    expect: 'reject',
  },
  {
    name: 'lemonde article — paywalled, served as a 200 challenge page',
    url: 'https://www.lemonde.fr/pixels/article/2024/01/18/jeux-video-comment-les-studios-francais-resistent-a-la-crise_6211604_4408996.html',
    language: 'french',
    expect: 'reject',
  },
  {
    // Nominally a topic index, but what it extracts is six paragraphs of
    // coherent single-topic prose — a good lesson. Kept as an `article` case on
    // purpose: it is the guard against index-detection growing strict enough to
    // reject genuinely short articles.
    name: 'francetvinfo topic page — short but coherent prose',
    url: 'https://www.francetvinfo.fr/sante/maladie/coronavirus/',
    language: 'french',
    expect: 'article',
    require: ['Le coronavirus est une famille de virus'],
  },
];

function preview(text: string, head = 110): string {
  return JSON.stringify(text.slice(0, head).replace(/\s+/g, ' '));
}

async function run(): Promise<void> {
  let failures = 0;

  for (const testCase of CASES) {
    const problems: string[] = [];
    let summary: string;

    try {
      const result = await articleService.extractFromUrl(testCase.url, testCase.language);
      const paragraphs = result.text.split('\n\n');

      summary =
        `extracted ${result.text.length} chars, ${paragraphs.length} paragraphs` +
        (result.truncated ? ' (truncated)' : '') +
        `\n      title: ${JSON.stringify(result.title)}` +
        `\n      first: ${preview(paragraphs[0] ?? '')}` +
        `\n      last:  ${preview(paragraphs[paragraphs.length - 1] ?? '')}`;

      if (testCase.expect === 'reject') {
        problems.push('expected this page to be rejected, but it produced an article');
      }

      for (const phrase of testCase.forbid ?? []) {
        if (result.text.includes(phrase)) {
          problems.push(`boilerplate survived: ${JSON.stringify(phrase)}`);
        }
      }

      for (const phrase of testCase.require ?? []) {
        if (!result.text.includes(phrase)) {
          problems.push(`article body missing: ${JSON.stringify(phrase)}`);
        }
      }

      const patternHit = testCase.forbidPattern?.exec(result.text);
      if (patternHit) {
        problems.push(`boilerplate survived: ${JSON.stringify(patternHit[0])}`);
      }

      if (testCase.startsWith && !result.text.startsWith(testCase.startsWith)) {
        problems.push(`article should open with ${JSON.stringify(testCase.startsWith)}`);
      }

      const detached = detachedPunctuation(result.text);
      if (detached.length > 0) {
        problems.push(`punctuation detached from its word: ${JSON.stringify(detached)}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      summary = `rejected — ${message}`;

      if (testCase.expect === 'article') {
        problems.push('expected an article, but extraction was rejected');
      }
    }

    const ok = problems.length === 0;
    if (!ok) failures += 1;

    console.log(`\n${ok ? '  ok  ' : ' FAIL '} ${testCase.name}`);
    console.log(`      ${summary}`);
    for (const problem of problems) console.log(`      ✗ ${problem}`);
  }

  console.log(`\n${CASES.length - failures}/${CASES.length} cases passed\n`);
  if (failures > 0) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
