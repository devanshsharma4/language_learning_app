import type { LessonQuestion } from '../../types';

interface QuestionsSectionProps {
  questions: LessonQuestion[];
  mcqAnswers: Record<string, number>;
  shortAnswers: Record<string, string>;
  onMCQChange: (questionId: string, optionIndex: number) => void;
  onShortAnswerChange: (questionId: string, value: string) => void;
  disabled?: boolean;
}

export default function QuestionsSection({
  questions,
  mcqAnswers,
  shortAnswers,
  onMCQChange,
  onShortAnswerChange,
  disabled,
}: QuestionsSectionProps) {
  const readingComp = questions.filter(q => q.type === 'reading_comprehension');
  const vocabQs = questions.filter(q => q.type === 'vocabulary');
  const shortAnswerQs = questions.filter(q => q.type === 'short_answer');

  const optionLabels = ['A', 'B', 'C', 'D'];

  return (
    <div className="space-y-12">
      {/* Reading Comprehension MCQ */}
      {readingComp.length > 0 && (
        <div>
          <h2 className="font-display text-2xl font-semibold text-bark mb-6">
            Reading Comprehension
          </h2>
          <div className="space-y-6">
            {readingComp.map((q, idx) => (
              <div key={q.id}>
                <p className="text-bark font-medium mb-3">
                  <span className="text-sage-dark mr-2">{idx + 1}.</span>
                  {q.question}
                </p>
                {'options' in q && (
                  <div className="space-y-2 ml-6">
                    {q.options.map((option, optIdx) => (
                      <label
                        key={optIdx}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                          mcqAnswers[q.id] === optIdx
                            ? 'border-sage bg-sage/10 shadow-sm'
                            : 'border-sand bg-white hover:border-sage/40 hover:shadow-sm'
                        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          checked={mcqAnswers[q.id] === optIdx}
                          onChange={() => onMCQChange(q.id, optIdx)}
                          disabled={disabled}
                          className="sr-only"
                        />
                        <span
                          className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-semibold transition-colors ${
                            mcqAnswers[q.id] === optIdx
                              ? 'border-sage bg-sage text-white'
                              : 'border-sand text-bark-light'
                          }`}
                        >
                          {optionLabels[optIdx]}
                        </span>
                        <span className="text-bark">{option}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vocabulary MCQ */}
      {vocabQs.length > 0 && (
        <div>
          <h2 className="font-display text-2xl font-semibold text-bark mb-6">
            Vocabulary
          </h2>
          <div className="space-y-6">
            {vocabQs.map((q, idx) => (
              <div key={q.id}>
                <p className="text-bark font-medium mb-1">
                  <span className="text-sage-dark mr-2">{idx + 1}.</span>
                  {q.question}
                </p>
                {'word' in q && (
                  <p className="text-sm text-bark-light/60 mb-3 ml-6">
                    Testing: <span className="italic font-medium text-bark-light">{q.word}</span>
                  </p>
                )}
                {'options' in q && (
                  <div className="space-y-2 ml-6">
                    {q.options.map((option, optIdx) => (
                      <label
                        key={optIdx}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                          mcqAnswers[q.id] === optIdx
                            ? 'border-sage bg-sage/10 shadow-sm'
                            : 'border-sand bg-white hover:border-sage/40 hover:shadow-sm'
                        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          checked={mcqAnswers[q.id] === optIdx}
                          onChange={() => onMCQChange(q.id, optIdx)}
                          disabled={disabled}
                          className="sr-only"
                        />
                        <span
                          className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-semibold transition-colors ${
                            mcqAnswers[q.id] === optIdx
                              ? 'border-sage bg-sage text-white'
                              : 'border-sand text-bark-light'
                          }`}
                        >
                          {optionLabels[optIdx]}
                        </span>
                        <span className="text-bark">{option}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Short Answer */}
      {shortAnswerQs.length > 0 && (
        <div>
          <h2 className="font-display text-2xl font-semibold text-bark mb-6">
            Short Answer
          </h2>
          <div className="space-y-6">
            {shortAnswerQs.map((q, idx) => (
              <div key={q.id}>
                <p className="text-bark font-medium mb-2">
                  <span className="text-sage-dark mr-2">{idx + 1}.</span>
                  {q.question}
                </p>
                <textarea
                  value={shortAnswers[q.id] || ''}
                  onChange={(e) => onShortAnswerChange(q.id, e.target.value)}
                  disabled={disabled}
                  placeholder="Type your answer..."
                  rows={3}
                  className="w-full px-4 py-4 bg-white rounded-2xl border border-sand text-bark placeholder:text-bark-light/40 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/50 shadow-sm hover:shadow-md transition-all duration-200 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
