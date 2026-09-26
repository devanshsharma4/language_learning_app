import type { MCQResult, LessonQuestion } from '../../types';

interface MCQResultsProps {
  mcqResults: MCQResult[];
  questions: LessonQuestion[];
}

const optionLabels = ['A', 'B', 'C', 'D'];

/**
 * Results are grouped and numbered by question type to match how the lesson
 * presented them. A single continuous 1..n run over the merged array meant a
 * lesson showing "Reading Comprehension 1-3" then "Vocabulary 1-2" came back as
 * "1-5", so feedback could not be matched to the question it was about.
 */
const SECTIONS = [
  { type: 'reading_comprehension' as const, heading: 'Reading Comprehension' },
  { type: 'vocabulary' as const, heading: 'Vocabulary' },
];

function OptionRow({
  option,
  optIdx,
  result,
}: {
  option: string;
  optIdx: number;
  result: MCQResult;
}) {
  const isSelected = result.selectedAnswer === optIdx;
  const isCorrect = result.correctAnswer === optIdx;
  const isWrongPick = isSelected && !result.correct;

  const rowTone = isCorrect
    ? 'border-sage bg-sage/10'
    : isWrongPick
      ? 'border-terracotta bg-terracotta/10'
      : 'border-sand/50 bg-white/50 opacity-60';

  const badgeTone = isCorrect
    ? 'border-sage bg-sage text-white'
    : isWrongPick
      ? 'border-terracotta bg-terracotta text-white'
      : 'border-sand text-bark-light';

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${rowTone}`}>
      <span
        className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-semibold ${badgeTone}`}
      >
        {optionLabels[optIdx]}
      </span>
      <span className="text-bark flex-1">{option}</span>
      {isCorrect && (
        <svg
          className="w-5 h-5 text-sage-dark flex-shrink-0"
          aria-hidden="true"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
      {isWrongPick && (
        <svg
          className="w-5 h-5 text-terracotta flex-shrink-0"
          aria-hidden="true"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      <span className="sr-only">
        {isCorrect ? ' (correct answer)' : isWrongPick ? ' (your answer, incorrect)' : ''}
      </span>
    </div>
  );
}

export default function MCQResults({ mcqResults, questions }: MCQResultsProps) {
  if (mcqResults.length === 0) return null;

  const sections = SECTIONS.map(({ type, heading }) => ({
    heading,
    results: mcqResults.filter((r) => r.type === type),
  })).filter((s) => s.results.length > 0);

  return (
    <div className="space-y-12">
      {sections.map(({ heading, results }) => (
        <div key={heading}>
          <h2 className="font-display text-2xl font-semibold text-bark mb-6">{heading}</h2>
          <div className="space-y-4">
            {results.map((result, idx) => {
              const question = questions.find((q) => q.id === result.questionId);
              if (!question || !('options' in question)) return null;

              return (
                <div
                  key={result.questionId}
                  className="bg-white rounded-2xl border border-sand shadow-sm p-6"
                >
                  <p className="text-bark font-medium mb-1">
                    <span className="text-sage-dark mr-2">{idx + 1}.</span>
                    {question.question}
                  </p>
                  {/* The word under test is genuinely useful when reviewing an
                      answer -- unlike during the lesson, where showing it gave
                      the answer away. */}
                  {'word' in question && question.word && (
                    <p className="text-sm text-bark-light/70 mb-3 ml-6">
                      Tested: <span className="italic font-medium">{question.word}</span>
                    </p>
                  )}
                  {result.selectedAnswer === null && (
                    <p className="text-sm text-terracotta mb-3 ml-6">Not answered</p>
                  )}
                  <div className="space-y-2 ml-6 mt-3">
                    {question.options.map((option, optIdx) => (
                      <OptionRow key={optIdx} option={option} optIdx={optIdx} result={result} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
