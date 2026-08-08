import type { MCQResult, LessonQuestion } from '../../types';

interface MCQResultsProps {
  mcqResults: MCQResult[];
  questions: LessonQuestion[];
}

const optionLabels = ['A', 'B', 'C', 'D'];

export default function MCQResults({ mcqResults, questions }: MCQResultsProps) {
  if (mcqResults.length === 0) return null;

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold text-bark mb-6">
        Multiple Choice
      </h2>
      <div className="space-y-4">
        {mcqResults.map((result, idx) => {
          const question = questions.find(q => q.id === result.questionId);
          if (!question || !('options' in question)) return null;

          return (
            <div key={result.questionId} className="bg-white rounded-2xl border border-sand shadow-sm p-6">
              <p className="text-bark font-medium mb-4">
                <span className="text-sage-dark mr-2">{idx + 1}.</span>
                {question.question}
              </p>
              <div className="space-y-2 ml-6">
                {question.options.map((option, optIdx) => {
                  const isSelected = result.selectedAnswer === optIdx;
                  const isCorrect = result.correctAnswer === optIdx;
                  let className = 'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all';

                  if (isCorrect) {
                    className += ' border-sage bg-sage/10';
                  } else if (isSelected && !result.correct) {
                    className += ' border-terracotta bg-terracotta/10';
                  } else {
                    className += ' border-sand/50 bg-white/50 opacity-60';
                  }

                  let badgeClassName = 'flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-semibold';
                  if (isCorrect) {
                    badgeClassName += ' border-sage bg-sage text-white';
                  } else if (isSelected && !result.correct) {
                    badgeClassName += ' border-terracotta bg-terracotta text-white';
                  } else {
                    badgeClassName += ' border-sand text-bark-light';
                  }

                  return (
                    <div key={optIdx} className={className}>
                      <span className={badgeClassName}>
                        {optionLabels[optIdx]}
                      </span>
                      <span className="text-bark flex-1">{option}</span>
                      {isCorrect && (
                        <svg className="w-5 h-5 text-sage-dark flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {isSelected && !result.correct && (
                        <svg className="w-5 h-5 text-terracotta flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
