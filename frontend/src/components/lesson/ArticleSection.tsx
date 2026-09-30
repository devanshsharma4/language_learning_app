import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { VocabularyItem } from '../../types';
import { useSavedWords } from '../../hooks/useSavedWords';
import { isCJK } from '../../lib/languages';
import { Highlight, PaperCard, Tape } from '../notebook';
import DefinitionCard from './DefinitionCard';
import HighlighterKey from './HighlighterKey';

interface ArticleSectionProps {
  /** The article's own headline, in the target language. */
  title?: string;
  articleText: string;
  vocabulary: VocabularyItem[];
  language: string;
  lessonId?: string;
}

interface Segment {
  text: string;
  vocab: VocabularyItem | null;
  key: string;
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Splits one paragraph into plain and highlightable segments.
 *
 * `highlighted` is shared across every paragraph and carries the words already
 * marked, so a term that recurs is marked only on its first appearance —
 * "oiseau" appears 24 times in the test article and used to be highlighted 24
 * times, which turned the page into a wall of color and made the marks
 * meaningless.
 */
function buildSegments(
  text: string,
  vocabulary: VocabularyItem[],
  language: string,
  highlighted: Set<string>,
): Segment[] {
  if (vocabulary.length === 0) return [{ text, vocab: null, key: '0' }];

  /*
   * Search for the form that is actually in the article.
   *
   * `word` is the dictionary form and `surfaceForm` is how the article writes
   * it — "désolé" versus "désolée". Matching on the headword is what made
   * conjugated and inflected entries silently never highlight. The server drops
   * a surfaceForm it cannot find in the text, so falling back to `word` here is
   * safe.
   */
  const matchForm = (item: VocabularyItem) => item.surfaceForm?.trim() || item.word;

  const vocabMap = new Map<string, VocabularyItem>();
  for (const item of vocabulary) {
    vocabMap.set(matchForm(item).toLowerCase(), item);
  }

  // Longest first, so "ordinateur portable" wins over "ordinateur".
  const escaped = vocabulary
    .map(matchForm)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex);

  // CJK has no whitespace word boundaries for \b to find.
  const pattern = new RegExp(
    isCJK(language) ? `(${escaped.join('|')})` : `\\b(${escaped.join('|')})\\b`,
    'gi',
  );

  const segments: Segment[] = [];
  let lastIndex = 0;
  let idx = 0;

  for (const match of text.matchAll(pattern)) {
    const matchStart = match.index!;
    if (matchStart > lastIndex) {
      segments.push({ text: text.slice(lastIndex, matchStart), vocab: null, key: `plain-${idx++}` });
    }

    const matched = match[0];
    const vocab = vocabMap.get(matched.toLowerCase()) ?? null;
    // Keyed on the headword, not the matched text, so an entry is marked once
    // even if two of its forms appear.
    const dedupeKey = vocab?.word.toLowerCase() ?? '';

    if (vocab && !highlighted.has(dedupeKey)) {
      highlighted.add(dedupeKey);
      segments.push({ text: matched, vocab, key: `vocab-${idx++}` });
    } else {
      segments.push({ text: matched, vocab: null, key: `plain-${idx++}` });
    }

    lastIndex = matchStart + matched.length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), vocab: null, key: `plain-${idx}` });
  }

  return segments;
}

export default function ArticleSection({
  title,
  articleText,
  vocabulary,
  language,
  lessonId,
}: ArticleSectionProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [cardTop, setCardTop] = useState(0);

  const rowRef = useRef<HTMLDivElement>(null);
  const keyRef = useRef<HTMLDivElement>(null);
  // One entry per marked word, keyed the same as its segment.
  const wordRefs = useRef(new Map<string, HTMLSpanElement>());

  const savedWords = useSavedWords(language);

  const paragraphs = useMemo(
    () => articleText.split(/\n\n|\n/).filter((p) => p.trim()),
    [articleText],
  );

  const paragraphSegments = useMemo(() => {
    const highlighted = new Set<string>();
    return paragraphs.map((paragraph, pIdx) =>
      buildSegments(paragraph, vocabulary, language, highlighted).map((seg) => ({
        ...seg,
        key: `p${pIdx}-${seg.key}`,
      })),
    );
  }, [paragraphs, vocabulary, language]);

  const active = useMemo(() => {
    if (!activeKey) return null;
    for (const segments of paragraphSegments) {
      const found = segments.find((seg) => seg.key === activeKey);
      if (found?.vocab) return found;
    }
    return null;
  }, [activeKey, paragraphSegments]);

  /**
   * Line up the card with the word that opened it.
   *
   * Clamped to the article's own height rather than the viewport: the card is
   * always adjacent to a word the reader just tapped, so it is on screen by
   * construction, and clamping to the container avoids a scroll listener that
   * would reposition the card on every frame of a scroll.
   *
   * The lower bound is the bottom of the highlighter key, not zero. A word in
   * the first line or two would otherwise open a card on top of the key and
   * hide the legend explaining the colour it was just marked in.
   */
  const positionCard = useCallback((key: string) => {
    const word = wordRefs.current.get(key);
    const row = rowRef.current;
    if (!word || !row) return;

    const wordRect = word.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    // Approximate: a card runs 200–260px depending on how long the explanation
    // is. Erring high keeps the bottom edge inside the article even for the
    // tallest card, at the cost of sitting a little above the word for entries
    // in the last paragraph.
    const CARD_HEIGHT_ESTIMATE = 250;
    const GAP = 24;

    const keyElement = keyRef.current;
    const minTop = keyElement ? keyElement.offsetTop + keyElement.offsetHeight + GAP : 0;
    const maxTop = Math.max(minTop, row.offsetHeight - CARD_HEIGHT_ESTIMATE);
    const preferred = wordRect.top - rowRect.top - 8;

    setCardTop(Math.min(Math.max(preferred, minTop), maxTop));
  }, []);

  const toggleWord = useCallback(
    (key: string) => {
      setActiveKey((current) => {
        if (current === key) return null;
        positionCard(key);
        return key;
      });
    },
    [positionCard],
  );

  // Close on a click anywhere that isn't a marked word or the card itself.
  useEffect(() => {
    if (!activeKey) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if ((target as HTMLElement).closest?.('[role="dialog"]')) return;
      setActiveKey(null);
    }

    // Deferred so the click that opened the card doesn't immediately close it.
    const timer = setTimeout(() => document.addEventListener('mousedown', handlePointerDown), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [activeKey]);

  const savedInThisLesson = vocabulary.filter((item) =>
    savedWords.has(item.word.toLowerCase()),
  ).length;

  return (
    <div ref={rowRef} className="flex items-stretch gap-8">
      <PaperCard className="w-full min-w-0 px-6 py-9 sm:px-10 xl:w-[720px] xl:flex-shrink-0 xl:px-14 xl:pb-14 xl:pt-12">
        <Tape tone="sand" className="-top-3.5 left-12" rotate={-5} width={110} />
        <Tape tone="blue" className="-top-3 right-14" rotate={4} width={96} />

        <article
          lang={language}
          className="flex flex-col gap-5 font-read text-[18px] leading-8 text-ink"
        >
          {/* The article's own headline, set inside the sheet where the
              author put it. The English gloss above the card says what this is
              about; this says it the way the article says it. */}
          {title && (
            <h2 className="mb-1 font-display text-[26px] font-bold leading-[1.15]">{title}</h2>
          )}

          {paragraphSegments.map((segments, pIdx) => (
            <p key={pIdx} className="m-0">
              {segments.map((seg) =>
                seg.vocab ? (
                  <Highlight
                    key={seg.key}
                    ref={(element) => {
                      if (element) wordRefs.current.set(seg.key, element);
                      else wordRefs.current.delete(seg.key);
                    }}
                    text={seg.text}
                    partOfSpeech={seg.vocab.partOfSpeech}
                    open={activeKey === seg.key}
                    saved={savedWords.has(seg.vocab.word.toLowerCase())}
                    onToggle={() => toggleWord(seg.key)}
                  />
                ) : (
                  <span key={seg.key}>{seg.text}</span>
                ),
              )}
            </p>
          ))}
        </article>
      </PaperCard>

      {/* Collapses to zero width below xl so the card can reposition itself as
          a bottom sheet without a second mounted copy. */}
      <aside className="relative w-0 xl:w-[264px] xl:flex-shrink-0 xl:pt-1">
        <div ref={keyRef} className="hidden xl:block">
          <HighlighterKey vocabulary={vocabulary} savedCount={savedInThisLesson} />
        </div>

        {active?.vocab && (
          <DefinitionCard
            key={activeKey}
            vocab={active.vocab}
            surfaceForm={active.text}
            language={language}
            lessonId={lessonId}
            alreadySaved={savedWords.has(active.vocab.word.toLowerCase())}
            onClose={() => setActiveKey(null)}
            top={cardTop}
          />
        )}
      </aside>
    </div>
  );
}
