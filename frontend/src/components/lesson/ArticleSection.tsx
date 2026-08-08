import { useState, useMemo } from 'react';
import type { VocabularyItem } from '../../types';
import VocabHighlight from './VocabHighlight';

interface ArticleSectionProps {
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
 * `highlighted` is shared across every paragraph in the article and carries the
 * words already marked, so a term that recurs is highlighted only on its first
 * appearance. Callers must pass the same set for all paragraphs, in order.
 */
function buildSegments(
  text: string,
  vocabulary: VocabularyItem[],
  language: string,
  highlighted: Set<string>,
): Segment[] {
  if (vocabulary.length === 0) return [{ text, vocab: null, key: '0' }];

  const vocabMap = new Map<string, VocabularyItem>();
  for (const v of vocabulary) {
    vocabMap.set(v.word.toLowerCase(), v);
  }

  const sortedWords = vocabulary
    .map((v) => v.word)
    .sort((a, b) => b.length - a.length);

  const escaped = sortedWords.map((w) => escapeRegex(w));
  const isCJK = language === 'japanese' || language === 'korean';
  const patternStr = isCJK
    ? `(${escaped.join('|')})`
    : `\\b(${escaped.join('|')})\\b`;
  const pattern = new RegExp(patternStr, 'gi');

  const segments: Segment[] = [];
  let lastIndex = 0;
  let idx = 0;

  for (const match of text.matchAll(pattern)) {
    const matchStart = match.index!;
    if (matchStart > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, matchStart),
        vocab: null,
        key: `plain-${idx++}`,
      });
    }
    const matched = match[0];
    const normalized = matched.toLowerCase();
    const vocab = vocabMap.get(normalized) ?? null;

    if (vocab && !highlighted.has(normalized)) {
      highlighted.add(normalized);
      segments.push({ text: matched, vocab, key: `vocab-${idx++}` });
    } else {
      // A repeat occurrence (or an unknown match) renders as ordinary text.
      segments.push({ text: matched, vocab: null, key: `plain-${idx++}` });
    }

    lastIndex = matchStart + matched.length;
  }

  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      vocab: null,
      key: `plain-${idx}`,
    });
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
  const [activeWord, setActiveWord] = useState<string | null>(null);

  const paragraphs = useMemo(() => {
    return articleText.split(/\n\n|\n/).filter((p) => p.trim());
  }, [articleText]);

  const paragraphSegments = useMemo(() => {
    // Shared across paragraphs so each vocabulary word is highlighted once,
    // on its first appearance in the article.
    const highlighted = new Set<string>();

    return paragraphs.map((p, pIdx) =>
      buildSegments(p, vocabulary, language, highlighted).map((seg) => ({
        ...seg,
        key: `p${pIdx}-${seg.key}`,
      })),
    );
  }, [paragraphs, vocabulary, language]);

  return (
    <div>
      {title && (
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-bark text-center mb-8 tracking-tight leading-tight">
          {title}
        </h1>
      )}

      <div>
        {paragraphSegments.map((segments, pIdx) => (
          <p
            key={pIdx}
            className="text-bark text-lg leading-relaxed mb-5 last:mb-0"
          >
            {segments.map((seg) =>
              seg.vocab ? (
                <VocabHighlight
                  key={seg.key}
                  text={seg.text}
                  vocab={seg.vocab}
                  language={language}
                  lessonId={lessonId}
                  isActive={activeWord === seg.key}
                  onToggle={() =>
                    setActiveWord(activeWord === seg.key ? null : seg.key)
                  }
                  onClose={() => setActiveWord(null)}
                />
              ) : (
                <span key={seg.key}>{seg.text}</span>
              ),
            )}
          </p>
        ))}
      </div>
    </div>
  );
}
