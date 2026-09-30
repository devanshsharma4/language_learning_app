import type { Feedback, LessonResponse, WritingPrompt } from '../../types';
import { MAX_SCORE } from '../../lib/score';
import { isCJK } from '../../lib/languages';
import { ScoreMark } from '../notebook';
import SectionHeading from './SectionHeading';
import { UngradedMark, UngradedNote } from './Ungraded';

interface WritingResultsProps {
  evaluations: Feedback['writing_evaluation'];
  responses: LessonResponse['writing_responses'];
  prompts: WritingPrompt[];
  language: string;
}

function countWords(text: string, language: string): number {
  if (!text.trim()) return 0;
  return isCJK(language)
    ? text.replace(/\s/g, '').length
    : text.trim().split(/\s+/).filter(Boolean).length;
}

interface FeedbackListProps {
  title: string;
  tone: 'good' | 'next';
  items: string[];
}

/**
 * Strengths and improvements, side by side rather than stacked.
 *
 * Reading them as two columns makes them one balanced assessment; stacked, the
 * improvements list reads as a verdict that follows and overrides the praise.
 */
function FeedbackList({ title, tone, items }: FeedbackListProps) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border-[1.5px] border-line bg-white px-5 py-5">
      <p
        className={`mono mb-2.5 text-xs font-bold ${
          tone === 'good' ? 'text-correct-text' : 'text-wrong-text'
        }`}
      >
        {title}
      </p>
      <ul className="m-0 flex list-disc flex-col gap-1.5 pl-4 text-[15px] leading-relaxed">
        {items.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function WritingResults({
  evaluations,
  responses,
  prompts,
  language,
}: WritingResultsProps) {
  if (prompts.length === 0) return null;

  /*
   * Driven by the prompts, not the evaluations — same reason as the short
   * answers. A prompt you chose not to write to is shown, marked skipped, and
   * left out of the average rather than scored zero.
   */
  // Defaulted for the same reason as the short answers: this reads `responses`
  // for every prompt now, not only the graded ones.
  const given = responses ?? [];
  const graded = evaluations ?? [];

  const average =
    graded.length > 0
      ? graded.reduce((sum, item) => sum + item.score, 0) / graded.length
      : null;

  const totalWords = given.reduce(
    (sum, response) => sum + countWords(response.response, language),
    0,
  );
  const unit = isCJK(language) ? 'characters' : 'words';
  const skipped = prompts.length - graded.length;

  return (
    <section id="wr" className="scroll-mt-6">
      <SectionHeading
        heading="Writing"
        aside={[
          average !== null ? `${average.toFixed(1)}/${MAX_SCORE}` : null,
          totalWords > 0 ? `${totalWords} ${unit}` : null,
          skipped > 0 ? `${skipped} not counted` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      />

      <div className="flex flex-col gap-10">
        {prompts.map((prompt) => {
          const evaluation = graded.find((e) => e.promptId === prompt.id);
          const response = given.find((r) => r.promptId === prompt.id)?.response;

          return (
            <div key={prompt.id}>
              <div className="mb-3.5 flex items-start justify-between gap-6">
                <p
                  lang={language}
                  className="m-0 font-read text-[17px] font-semibold leading-snug"
                >
                  {prompt.prompt}
                </p>
                {evaluation ? (
                  <ScoreMark>
                    {evaluation.score}/{MAX_SCORE}
                  </ScoreMark>
                ) : (
                  <UngradedMark attempted={Boolean(response?.trim())} />
                )}
              </div>

              {response && (
                <div
                  lang={language}
                  className="ruled-input mb-5 rounded-xl border-[1.5px] border-line bg-white px-4 py-1.5 font-read text-[17px] leading-8"
                >
                  {response}
                </div>
              )}

              {!evaluation && <UngradedNote attempted={Boolean(response?.trim())} />}

              {evaluation?.feedback && (
                <p className="mb-5 pl-2 text-[15px] leading-relaxed text-pen-dark">
                  {evaluation.feedback}
                </p>
              )}

              {evaluation && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FeedbackList title="what worked" tone="good" items={evaluation.strengths} />
                  <FeedbackList title="try next time" tone="next" items={evaluation.improvements} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
