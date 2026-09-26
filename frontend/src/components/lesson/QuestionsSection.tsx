import type { LessonQuestion } from '../../types';

interface QuestionsSectionProps {
  questions: LessonQuestion[];
  mcqAnswers: Record<string, number>;
  shortAnswers: Record<string, string>;
  onMCQChange: (questionId: string, optionIndex: number) => void;
  onShortAnswerChange: (questionId: string, value: string) => void;
  disabled?: boolean;
}

const optionLabels = ['A', 'B', 'C', 'D'];

interface MCQBlockProps {
  question: Extract<LessonQuestion, { options: string[] }>;
  number: number;
  selected: number | undefined;
  onChange: (optionIndex: number) => void;
  disabled?: boolean;
}

/**
 * One multiple-choice question.
 *
 * Extracted because the reading-comprehension and vocabulary blocks were
 * byte-identical copies, so every fix below had to be made twice:
 *
 * - `fieldset`/`legend` gives the option group its question as an accessible
 *   name; previously a screen reader read four bare options with no context.
 * - The radio stays `sr-only` (the styled span is the visual control), so the
 *   label carries `focus-within` styling. Without it a keyboard user tabbing
 *   into a quiz saw no indication of where focus was -- arrow keys worked, but
 *   invisibly.
 * - A/B/C/D select an option directly. Native radios only do arrow keys, and
 *   letter shortcuts are much faster once you notice the labels.
 */
function MCQBlock({ question, number, selected, onChange, disabled }: MCQBlockProps) {
  function handleKeyDown(event: React.KeyboardEvent<HTMLFieldSetElement>) {
    if (disabled || event.metaKey || event.ctrlKey || event.altKey) return;

    const index = optionLabels.indexOf(event.key.toUpperCase());
    if (index === -1 || index >= question.options.length) return;

    event.preventDefault();
    onChange(index);
  }

  return (
    <fieldset onKeyDown={handleKeyDown} disabled={disabled} className="border-0 p-0 m-0">
      <legend className="text-bark font-medium mb-3">
        <span className="text-sage-dark mr-2">{number}.</span>
        {question.question}
      </legend>
      <div className="space-y-2 ml-6">
        {question.options.map((option, optIdx) => {
          const isSelected = selected === optIdx;

          return (
            <label
              key={optIdx}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all duration-200 focus-within:ring-2 focus-within:ring-sage/50 focus-within:border-sage ${
                isSelected
                  ? 'border-sage bg-sage/10 shadow-sm'
                  : 'border-sand bg-white hover:border-sage/40 hover:shadow-sm'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                type="radio"
                name={question.id}
                checked={isSelected}
                onChange={() => onChange(optIdx)}
                disabled={disabled}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-semibold transition-colors ${
                  isSelected ? 'border-sage bg-sage text-white' : 'border-sand text-bark-light'
                }`}
              >
                {optionLabels[optIdx]}
              </span>
              <span className="text-bark">{option}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function QuestionsSection({
  questions,
  mcqAnswers,
  shortAnswers,
  onMCQChange,
  onShortAnswerChange,
  disabled,
}: QuestionsSectionProps) {
  const readingComp = questions.filter((q) => q.type === 'reading_comprehension');
  const vocabQs = questions.filter((q) => q.type === 'vocabulary');
  const shortAnswerQs = questions.filter((q) => q.type === 'short_answer');

  const mcqSections = [
    { heading: 'Reading Comprehension', questions: readingComp },
    // Note: the vocabulary block deliberately does NOT show `q.word`. These
    // questions ask what that exact word means, so naming it gave the answer
    // away. It reappears on the results page, where it aids review.
    { heading: 'Vocabulary', questions: vocabQs },
  ].filter((s) => s.questions.length > 0);

  return (
    <div className="space-y-12">
      {mcqSections.map(({ heading, questions: sectionQuestions }) => (
        <div key={heading}>
          <h2 className="font-display text-2xl font-semibold text-bark mb-2">{heading}</h2>
          <p className="text-sm text-bark-light mb-6">
            Tip: press <kbd className="font-semibold">A</kbd>–<kbd className="font-semibold">D</kbd>{' '}
            to choose an answer.
          </p>
          <div className="space-y-6">
            {sectionQuestions.map((q, idx) =>
              'options' in q ? (
                <MCQBlock
                  key={q.id}
                  question={q}
                  number={idx + 1}
                  selected={mcqAnswers[q.id]}
                  onChange={(optIdx) => onMCQChange(q.id, optIdx)}
                  disabled={disabled}
                />
              ) : null,
            )}
          </div>
        </div>
      ))}

      {shortAnswerQs.length > 0 && (
        <div>
          <h2 className="font-display text-2xl font-semibold text-bark mb-6">Short Answer</h2>
          <div className="space-y-6">
            {shortAnswerQs.map((q, idx) => (
              <div key={q.id}>
                <label htmlFor={`sa-${q.id}`} className="block text-bark font-medium mb-2">
                  <span className="text-sage-dark mr-2">{idx + 1}.</span>
                  {q.question}
                </label>
                <textarea
                  id={`sa-${q.id}`}
                  value={shortAnswers[q.id] || ''}
                  onChange={(e) => onShortAnswerChange(q.id, e.target.value)}
                  disabled={disabled}
                  placeholder="Type your answer..."
                  rows={3}
                  className="w-full px-4 py-4 bg-white rounded-2xl border border-sand text-bark placeholder:text-bark-light/60 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/50 shadow-sm hover:shadow-md transition-all duration-200 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
