import type { LessonQuestion } from '../../types';
import { RuledTextarea, SectionLabel, SelectableChoiceRow } from '../notebook';
import { OPTION_LABELS } from '../../lib/mcq';

interface QuestionsSectionProps {
  questions: LessonQuestion[];
  language: string;
  /** Part number per section id, so the chips match the margin outline. */
  partNumbers: Record<string, number>;
  mcqAnswers: Record<string, number>;
  shortAnswers: Record<string, string>;
  onMCQChange: (questionId: string, optionIndex: number) => void;
  onShortAnswerChange: (questionId: string, value: string) => void;
  disabled?: boolean;
}

type MCQ = Extract<LessonQuestion, { options: string[] }>;

interface MCQBlockProps {
  question: MCQ;
  number: number;
  language: string;
  selected: number | undefined;
  onChange: (optionIndex: number) => void;
  disabled?: boolean;
}

/**
 * One multiple-choice question.
 *
 * `fieldset`/`legend` gives the option group its question as an accessible
 * name — without it a screen reader reads four bare options with no context.
 * A–D select an option directly; native radios only do arrow keys, and the
 * letters are much faster once you have noticed the badges. The badges are the
 * hint, so there is no separate line of instructions.
 */
function MCQBlock({ question, number, language, selected, onChange, disabled }: MCQBlockProps) {
  function handleKeyDown(event: React.KeyboardEvent<HTMLFieldSetElement>) {
    if (disabled || event.metaKey || event.ctrlKey || event.altKey) return;

    const index = OPTION_LABELS.indexOf(event.key.toUpperCase());
    if (index === -1 || index >= question.options.length) return;

    event.preventDefault();
    onChange(index);
  }

  return (
    <fieldset
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className="m-0 mb-10 flex flex-col gap-2.5 border-0 p-0 last:mb-0"
    >
      <legend lang={language} className="mb-3.5 flex gap-3 p-0 font-read text-[18px] font-semibold">
        <span className="mono text-pen">{number}.</span>
        {question.question}
      </legend>

      {question.options.map((option, optIdx) => (
        <SelectableChoiceRow
          key={optIdx}
          optionIndex={optIdx}
          name={question.id}
          lang={language}
          selected={selected === optIdx}
          onSelect={() => onChange(optIdx)}
          disabled={disabled}
        >
          {option}
        </SelectableChoiceRow>
      ))}
    </fieldset>
  );
}

interface PartHeadingProps {
  part?: number;
  label: string;
  tone: 'pen' | 'verb' | 'adjective' | 'adverb';
  heading: string;
}

function PartHeading({ part, label, tone, heading }: PartHeadingProps) {
  return (
    <>
      <SectionLabel tone={tone}>
        {part !== undefined && `part ${part} · `}
        {label}
      </SectionLabel>
      <h2 className="mb-7 mt-2 font-display text-[32px] font-bold tracking-[-0.3px]">{heading}</h2>
    </>
  );
}

export default function QuestionsSection({
  questions,
  language,
  partNumbers,
  mcqAnswers,
  shortAnswers,
  onMCQChange,
  onShortAnswerChange,
  disabled,
}: QuestionsSectionProps) {
  const readingComp = questions.filter((q) => q.type === 'reading_comprehension') as MCQ[];
  const vocabQs = questions.filter((q) => q.type === 'vocabulary') as MCQ[];
  const shortAnswerQs = questions.filter((q) => q.type === 'short_answer');

  /*
   * Each section numbers its own questions from 1. They are separate parts of
   * the lesson doing different jobs — following the story versus recalling a
   * word — and the margin outline, the part chips and these numbers all agree
   * on that division, so two questions labelled "1." are never ambiguous.
   *
   * The vocabulary block deliberately does NOT show `q.word`: these questions
   * ask what that exact word means, so naming it gives the answer away. It
   * reappears on the results page, where it aids review.
   */
  const mcqSections = [
    {
      id: 'questions',
      questions: readingComp,
      tone: 'pen' as const,
      heading: 'Did you follow the story?',
      label: (n: number) => `${n} question${n === 1 ? '' : 's'}`,
    },
    {
      id: 'vocabulary',
      questions: vocabQs,
      tone: 'adjective' as const,
      heading: 'Did the words stick?',
      label: (n: number) => `${n} word${n === 1 ? '' : 's'}`,
    },
  ].filter((section) => section.questions.length > 0);

  return (
    <>
      {mcqSections.map((section) => (
        <section key={section.id} id={section.id} className="mt-20 scroll-mt-6">
          <PartHeading
            part={partNumbers[section.id]}
            label={section.label(section.questions.length)}
            tone={section.tone}
            heading={section.heading}
          />

          {section.questions.map((question, idx) => (
            <MCQBlock
              key={question.id}
              question={question}
              number={idx + 1}
              language={language}
              selected={mcqAnswers[question.id]}
              onChange={(optIdx) => onMCQChange(question.id, optIdx)}
              disabled={disabled}
            />
          ))}
        </section>
      ))}

      {shortAnswerQs.length > 0 && (
        <section id="short" className="mt-20 scroll-mt-6">
          <PartHeading
            part={partNumbers.short}
            label="short answer"
            tone="verb"
            heading="In your own words"
          />

          <div className="flex flex-col gap-9">
            {shortAnswerQs.map((question, idx) => (
              <div key={question.id}>
                <label
                  htmlFor={`sa-${question.id}`}
                  lang={language}
                  className="mb-3.5 flex gap-3 font-read text-[18px] font-semibold"
                >
                  <span className="mono text-pen">{idx + 1}.</span>
                  {question.question}
                </label>
                <RuledTextarea
                  id={`sa-${question.id}`}
                  lang={language}
                  rows={4}
                  value={shortAnswers[question.id] ?? ''}
                  onChange={(event) => onShortAnswerChange(question.id, event.target.value)}
                  disabled={disabled}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
