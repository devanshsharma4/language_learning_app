import type { Feedback, Lesson, LessonQuestion, MCQResult } from '../types';

/**
 * Client-side grading for the signed-out demo lesson at /lessons/demo.
 *
 * The demo exists so someone can try the product without creating an account --
 * which makes it the first thing most visitors touch. It previously rendered but
 * could not be submitted: the submit mutation had no demo branch, so it POSTed to
 * /api/lessons/demo/submit, where parseInt('demo') is NaN and the route correctly
 * returns 400. The user saw "Something went wrong" with no way forward.
 *
 * Multiple choice is graded exactly as the server does -- a direct comparison, no
 * model involved -- so the demo's scores are real. Free-text responses get fixed
 * illustrative feedback rather than a live LLM call, because grading those would
 * mean an unauthenticated, uncapped, paid endpoint. The copy says so plainly
 * instead of passing canned text off as a real evaluation.
 */
export function gradeDemoLesson(
  lesson: Lesson,
  mcqAnswers: Record<string, number>,
  shortAnswers: Record<string, string>,
  writingResponses: Record<string, string>,
): Feedback {
  const isMCQ = (
    q: LessonQuestion,
  ): q is Extract<LessonQuestion, { type: 'reading_comprehension' | 'vocabulary' }> =>
    q.type === 'reading_comprehension' || q.type === 'vocabulary';

  // Mirrors lessonService.submitLessonResponse: iterate the questions, so an
  // unanswered question counts as wrong rather than disappearing.
  const mcq_results: MCQResult[] = lesson.questions.filter(isMCQ).map((question) => {
    const selected = mcqAnswers[question.id];
    const selectedAnswer = selected === undefined ? null : selected;

    return {
      questionId: question.id,
      type: question.type,
      correct: selectedAnswer !== null && selectedAnswer === question.correctAnswer,
      selectedAnswer,
      correctAnswer: question.correctAnswer,
    };
  });

  const wroteFreeText =
    lesson.questions.some((q) => (shortAnswers[q.id] ?? '').trim().length > 0) ||
    (lesson.writing_prompts ?? []).some((p) => (writingResponses[p.id] ?? '').trim().length > 0);

  return {
    mcq_results,
    // Left empty rather than scored 0. A zero would be averaged into the overall
    // score and read as "your writing was bad", when the truth is that it was
    // never evaluated. Empty means those sections simply do not render, and the
    // score reflects only what was actually graded.
    short_answer_evaluation: [],
    writing_evaluation: [],
    grammar_corrections: [],
    vocabulary_suggestions: [],
    overall_feedback: wroteFreeText
      ? 'This demo is graded in your browser, so your multiple-choice score is exactly what a real lesson would give you. Your written answers were not evaluated — that needs an account, because it runs a real AI request.'
      : 'This demo is graded in your browser, so your multiple-choice score is exactly what a real lesson would give you. Create an account to get AI feedback on writing too.',
  };
}
