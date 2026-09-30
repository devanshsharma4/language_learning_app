import { useState } from 'react';
import type { MCQResult, LessonQuestion } from '../../types';
import { OPTION_LABELS } from '../../lib/mcq';
import { PART_OF_SPEECH_STYLES } from '../../lib/partOfSpeech';
import SectionHeading from './SectionHeading';

/** Green for right, pink for wrong — always alongside a ✓ or ✕, never alone. */
const CORRECT_INK = { '--hl': PART_OF_SPEECH_STYLES.adverb.rgb } as React.CSSProperties;
const WRONG_INK = { '--hl': PART_OF_SPEECH_STYLES.verb.rgb, '--hl-m': 0.85 } as React.CSSProperties;

/** How many correct answers to show before folding the rest away. */
const PREVIEW_CORRECT = 3;

function Tick() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2F8A4C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
      <path d="M5 12l5 5 9-10" />
    </svg>
  );
}

function Cross() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D6336C" strokeWidth="3" strokeLinecap="round" className="flex-shrink-0">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

type MCQ = Extract<LessonQuestion, { options: string[] }>;

interface RowProps {
  result: MCQResult;
  question: MCQ;
  number: number;
  language: string;
}

/**
 * A question you got wrong, opened up.
 *
 * Only the two answers that matter are shown — what you picked and what was
 * right. The old design re-rendered all four options with the two distractors
 * dimmed, which spent most of the card's space on answers nobody chose.
 */
function WrongAnswer({ result, question, number, language }: RowProps) {
  const picked = result.selectedAnswer;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border-[1.5px] border-line-strong bg-white px-6 py-5">
      <div lang={language} className="mb-1 flex gap-3 font-read text-[17px] font-bold">
        <span className="mono text-pen">{number}.</span>
        {question.question}
      </div>

      {'word' in question && question.word && (
        <p className="mono -mt-1 text-xs text-ink-3">tested: {question.word}</p>
      )}

      {picked === null ? (
        <div className="flex items-center gap-3.5 text-[16px]">
          <Cross />
          <span className="mono text-[13px] text-ink-3">you left this one blank</span>
        </div>
      ) : (
        <div lang={language} className="flex flex-wrap items-center gap-3.5 font-read text-[16px]">
          <Cross />
          <span className="hl line-through decoration-[1.5px]" style={WRONG_INK}>
            {OPTION_LABELS[picked]} · {question.options[picked]}
          </span>
          <span lang="en" className="mono text-[13px] text-ink-3">
            your answer
          </span>
        </div>
      )}

      <div lang={language} className="flex flex-wrap items-center gap-3.5 font-read text-[16px] font-650">
        <Tick />
        <span className="hl" style={CORRECT_INK}>
          {OPTION_LABELS[result.correctAnswer]} · {question.options[result.correctAnswer]}
        </span>
        <span lang="en" className="mono text-[13px] font-normal text-ink-3">
          correct
        </span>
      </div>
    </div>
  );
}

/** A question you got right, folded down to a single line. */
function CorrectAnswer({ result, question, number, language }: RowProps) {
  return (
    <div
      lang={language}
      className="flex items-center gap-3.5 border-b border-dashed border-line-strong px-1 py-3 font-read text-[15px]"
    >
      <Tick />
      <span className="mono text-ink-3">{number}.</span>
      <span className="flex-grow">{question.question}</span>
      <span className="flex-shrink-0 text-ink-2">{question.options[result.correctAnswer]}</span>
    </div>
  );
}

interface MCQSectionProps {
  id: string;
  heading: string;
  results: MCQResult[];
  questions: LessonQuestion[];
  language: string;
}

function MCQSection({ id, heading, results, questions, language }: MCQSectionProps) {
  const [showAll, setShowAll] = useState(false);

  // Numbering follows the position within this section, which is how the lesson
  // presented it. A continuous run across both MCQ sections would mean the
  // feedback for "3." could not be matched to the question labelled "3.".
  const numbered = results
    .map((result, index) => ({
      result,
      number: index + 1,
      question: questions.find((q) => q.id === result.questionId),
    }))
    .filter(
      (row): row is { result: MCQResult; number: number; question: MCQ } =>
        !!row.question && 'options' in row.question,
    );

  if (numbered.length === 0) return null;

  const wrong = numbered.filter((row) => !row.result.correct);
  const correct = numbered.filter((row) => row.result.correct);
  const hidden = Math.max(0, correct.length - PREVIEW_CORRECT);
  const visibleCorrect = showAll ? correct : correct.slice(0, PREVIEW_CORRECT);

  return (
    <section id={id} className="scroll-mt-6">
      <SectionHeading
        heading={heading}
        aside={
          wrong.length === 0
            ? `all ${correct.length} right`
            : `${correct.length} right · ${wrong.length} to review`
        }
      />

      <div className="flex flex-col gap-3.5">
        {wrong.map((row) => (
          <WrongAnswer
            key={row.result.questionId}
            result={row.result}
            question={row.question}
            number={row.number}
            language={language}
          />
        ))}
      </div>

      {correct.length > 0 && (
        <div className={`flex flex-col ${wrong.length > 0 ? 'mt-5' : ''}`}>
          {visibleCorrect.map((row) => (
            <CorrectAnswer
              key={row.result.questionId}
              result={row.result}
              question={row.question}
              number={row.number}
              language={language}
            />
          ))}

          {hidden > 0 && (
            <button
              type="button"
              onClick={() => setShowAll((value) => !value)}
              className="mt-3 self-start py-2 text-sm font-650 text-pen underline decoration-1 underline-offset-4 hover:text-pen-dark"
            >
              {showAll ? 'Hide them again' : `Show the other ${hidden} correct answers`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

interface MCQResultsProps {
  mcqResults: MCQResult[];
  questions: LessonQuestion[];
  language: string;
}

export default function MCQResults({ mcqResults, questions, language }: MCQResultsProps) {
  const sections = [
    { id: 'mc', type: 'reading_comprehension' as const, heading: 'Multiple choice' },
    { id: 'vocab', type: 'vocabulary' as const, heading: 'Vocabulary' },
  ];

  return (
    <>
      {sections.map((section) => (
        <MCQSection
          key={section.id}
          id={section.id}
          heading={section.heading}
          results={mcqResults.filter((result) => result.type === section.type)}
          questions={questions}
          language={language}
        />
      ))}
    </>
  );
}
