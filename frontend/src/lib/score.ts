import type { Feedback } from '../types';

/**
 * Free-text scores are 0-10; MCQs are a ratio. Kept deliberately in step with
 * `clampScore` / `computeOverallScore` in src/services/lesson/lessonService.ts,
 * because both sides compute a score the user sees: the backend for the history
 * list's badge, the frontend for the results ring. They disagreed before -- the
 * prompt asked the model for 0-100 while every consumer multiplied by 10, so a
 * score of 85 rendered as "850%".
 *
 * There is no shared types package yet (see docs/SCALE.md), so this mirroring is
 * manual. Change one, change the other.
 */
export const MAX_SCORE = 10;

export function clampScore(score: unknown): number {
  const n = typeof score === 'number' ? score : Number(score);
  if (!Number.isFinite(n)) return 0;
  return Math.min(MAX_SCORE, Math.max(0, n));
}

export interface SectionScores {
  mcqCorrect: number;
  mcqTotal: number;
  /** null when the lesson had no questions of that kind. */
  mcqPct: number | null;
  shortAnswerAvg: number | null;
  writingAvg: number | null;
  /** Percentage 0-100, averaging whichever sections exist; null if none do. */
  overall: number | null;
}

function average(scores: Array<{ score: unknown }>): number | null {
  if (scores.length === 0) return null;
  return scores.reduce((sum, e) => sum + clampScore(e.score), 0) / scores.length;
}

export function computeSectionScores(feedback: Feedback): SectionScores {
  const mcq = feedback.mcq_results ?? [];
  const mcqCorrect = mcq.filter((r) => r.correct).length;
  const mcqTotal = mcq.length;
  const mcqPct = mcqTotal > 0 ? (mcqCorrect / mcqTotal) * 100 : null;

  const shortAnswerAvg = average(feedback.short_answer_evaluation ?? []);
  const writingAvg = average(feedback.writing_evaluation ?? []);

  const parts: number[] = [];
  if (mcqPct !== null) parts.push(mcqPct);
  if (shortAnswerAvg !== null) parts.push(shortAnswerAvg * 10);
  if (writingAvg !== null) parts.push(writingAvg * 10);

  return {
    mcqCorrect,
    mcqTotal,
    mcqPct,
    shortAnswerAvg,
    writingAvg,
    overall: parts.length > 0 ? parts.reduce((a, b) => a + b, 0) / parts.length : null,
  };
}
