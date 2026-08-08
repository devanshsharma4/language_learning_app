import type { WritingPrompt } from '../../types';

interface WritingPromptsSectionProps {
  prompts: WritingPrompt[];
  responses: Record<string, string>;
  onResponseChange: (promptId: string, value: string) => void;
  disabled?: boolean;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function WritingPromptsSection({
  prompts,
  responses,
  onResponseChange,
  disabled,
}: WritingPromptsSectionProps) {
  return (
    <div>
      <h2 className="font-display text-2xl font-semibold text-bark mb-6">
        Writing Prompts
      </h2>

      <div className="space-y-6">
        {prompts.map((prompt, idx) => {
          const value = responses[prompt.id] || '';
          const wordCount = value ? countWords(value) : 0;
          const hasRange = prompt.minWords || prompt.maxWords;
          const inRange =
            hasRange &&
            (!prompt.minWords || wordCount >= prompt.minWords) &&
            (!prompt.maxWords || wordCount <= prompt.maxWords);
          const belowMin = prompt.minWords && wordCount > 0 && wordCount < prompt.minWords;

          return (
            <div key={prompt.id}>
              <p className="text-bark font-medium mb-2">
                <span className="text-sage-dark mr-2">{idx + 1}.</span>
                {prompt.prompt}
              </p>
              <textarea
                value={value}
                onChange={(e) => onResponseChange(prompt.id, e.target.value)}
                disabled={disabled}
                placeholder="Write your response..."
                rows={6}
                className="w-full px-4 py-4 bg-white rounded-2xl border border-sand text-bark placeholder:text-bark-light/40 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/50 shadow-sm hover:shadow-md transition-all duration-200 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {hasRange && (
                <p
                  className={`text-sm mt-1 transition-colors duration-200 ${
                    inRange
                      ? 'text-sage-dark'
                      : belowMin
                        ? 'text-terracotta'
                        : 'text-bark-light/60'
                  }`}
                >
                  {wordCount} / {prompt.minWords}–{prompt.maxWords} words
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
