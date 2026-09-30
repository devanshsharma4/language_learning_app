import type { Feedback, LessonQuestion, LessonResponse } from '../../types';
import { MAX_SCORE } from '../../lib/score';
import { ScoreMark } from '../notebook';
import SectionHeading from './SectionHeading';
import { UngradedMark, UngradedNote } from './Ungraded';

interface ShortAnswerResultsProps {
  evaluations: Feedback['short_answer_evaluation'];
  responses: LessonResponse['short_answer_responses'];
  questions: LessonQuestion[];
  language: string;
}

export default function ShortAnswerResults({
  evaluations,
  responses,
  questions,
  language,
}: ShortAnswerResultsProps) {
  const shortAnswers = questions.filter((q) => q.type === 'short_answer');
  if (shortAnswers.length === 0) return null;

  // Defaulted rather than assumed present: this now reads `responses` for every
  // question instead of only the graded ones, so a caller that omits the array
  // would crash the whole results page rather than render one section oddly.
  const given = responses ?? [];
  const graded = evaluations ?? [];

  /*
   * Driven by the questions, not the evaluations.
   *
   * A question left blank has no evaluation — the server no longer sends empty
   * work to be scored — but it still belongs on this page, marked as skipped.
   * Iterating evaluations would make it vanish, which reads as the app losing
   * an answer rather than the learner choosing not to write one.
   */
  const average =
    graded.length > 0
      ? graded.reduce((sum, item) => sum + item.score, 0) / graded.length
      : null;

  const skipped = shortAnswers.length - graded.length;

  return (
    <section id="sa" className="scroll-mt-6">
      <SectionHeading
        heading="Short answer"
        aside={[
          average !== null ? `avg ${average.toFixed(1)}/${MAX_SCORE}` : null,
          skipped > 0 ? `${skipped} not counted` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      />

      <div className="flex flex-col gap-10">
        {shortAnswers.map((question, idx) => {
          const evaluation = graded.find((e) => e.questionId === question.id);
          const answer = given.find((r) => r.questionId === question.id)?.answer;

          return (
            <div key={question.id}>
              <div className="mb-3.5 flex items-start justify-between gap-6">
                <div lang={language} className="flex gap-3 font-read text-[17px] font-semibold">
                  <span className="mono text-pen">{idx + 1}.</span>
                  {question.question}
                </div>
                {evaluation ? (
                  <ScoreMark>
                    {evaluation.score}/{MAX_SCORE}
                  </ScoreMark>
                ) : (
                  <UngradedMark attempted={Boolean(answer?.trim())} />
                )}
              </div>

              {/* Your answer, shown back on the lined paper you wrote it on. */}
              {answer && (
                <div
                  lang={language}
                  className="ruled-input rounded-xl border-[1.5px] border-line bg-white px-4 py-1.5 font-read text-[17px] leading-8"
                >
                  {answer}
                </div>
              )}

              {evaluation ? (
                <div className="mt-4 flex gap-3 pl-2 text-[15px] leading-relaxed text-pen-dark">
                  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0">
                    <path d="M4 4v6a4 4 0 004 4h12M15 9l5 5-5 5" />
                  </svg>
                  <span>{evaluation.feedback}</span>
                </div>
              ) : (
                <UngradedNote attempted={Boolean(answer?.trim())} />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
