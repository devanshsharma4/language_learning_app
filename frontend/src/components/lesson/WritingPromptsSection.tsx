import type { WritingPrompt } from '../../types';
import { isCJK } from '../../lib/languages';
import { RuledTextarea, SectionLabel } from '../notebook';

interface WritingPromptsSectionProps {
  prompts: WritingPrompt[];
  language: string;
  /** Part number, so the chip matches the margin outline. */
  partNumber?: number;
  responses: Record<string, string>;
  onResponseChange: (promptId: string, value: string) => void;
  disabled?: boolean;
}

function countWords(text: string, language: string): number {
  if (!text.trim()) return 0;
  // CJK has no spaces to count between, so characters stand in for words.
  return isCJK(language)
    ? text.replace(/\s/g, '').length
    : text.trim().split(/\s+/).filter(Boolean).length;
}

interface WordMeterProps {
  count: number;
  minWords?: number;
  maxWords?: number;
  language: string;
}

/**
 * A length gauge, not a validator.
 *
 * The target is drawn as a notch on the bar rather than a number you are
 * failing to hit: the fill shows how far along you are and the notch shows
 * where "enough" starts. Nothing here turns red — a short answer is unfinished,
 * not wrong, and the old design colored it like an error.
 */
function WordMeter({ count, minWords, maxWords, language }: WordMeterProps) {
  const ceiling = maxWords ?? (minWords ? minWords * 1.5 : 100);
  const fill = Math.min(100, (count / ceiling) * 100);
  const notch = minWords ? Math.min(100, (minWords / ceiling) * 100) : null;

  const target =
    minWords && maxWords
      ? `aim for ${minWords}–${maxWords}`
      : minWords
        ? `aim for ${minWords}+`
        : `up to ${maxWords}`;

  const unit = isCJK(language) ? 'characters' : 'words';

  return (
    <div className="mono mt-3 flex items-center gap-3 text-[13px] text-ink-3">
      <div className="relative h-2 w-40 overflow-hidden rounded-md border-[1.5px] border-line-badge bg-white">
        <div
          className="absolute inset-y-0 left-0 bg-sticker transition-[width] duration-200"
          style={{ width: `${fill}%` }}
        />
        {notch !== null && (
          <div
            className="absolute inset-y-0 w-[1.5px] bg-ink-2"
            style={{ left: `${notch}%` }}
            aria-hidden="true"
          />
        )}
      </div>
      <span>
        <b className="text-ink">
          {count} {unit}
        </b>
        {' · '}
        {target}
      </span>
    </div>
  );
}

export default function WritingPromptsSection({
  prompts,
  language,
  partNumber,
  responses,
  onResponseChange,
  disabled,
}: WritingPromptsSectionProps) {
  return (
    <section id="writing" className="mt-20 scroll-mt-6">
      <SectionLabel tone="adverb">
        {partNumber !== undefined && `part ${partNumber} · `}
        {prompts.length === 1 ? 'writing' : `${prompts.length} writing prompts`}
      </SectionLabel>
      <h2 className="mb-7 mt-2 font-display text-[32px] font-bold tracking-[-0.3px]">
        Keep the story going
      </h2>

      <div className="flex flex-col gap-12">
        {prompts.map((prompt) => {
          const value = responses[prompt.id] ?? '';
          const hasRange = Boolean(prompt.minWords || prompt.maxWords);

          return (
            <div key={prompt.id}>
              <label
                htmlFor={`w-${prompt.id}`}
                lang={language}
                className="mb-3.5 block font-read text-[18px] font-semibold leading-snug"
              >
                {prompt.prompt}
              </label>
              <RuledTextarea
                id={`w-${prompt.id}`}
                lang={language}
                rows={6}
                value={value}
                onChange={(event) => onResponseChange(prompt.id, event.target.value)}
                disabled={disabled}
              />
              {hasRange && (
                <WordMeter
                  count={countWords(value, language)}
                  minWords={prompt.minWords}
                  maxWords={prompt.maxWords}
                  language={language}
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
