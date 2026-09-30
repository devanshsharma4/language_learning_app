import type { Feedback } from '../../types';
import { MAX_SCORE, computeSectionScores } from '../../lib/score';

/**
 * The overall score, ringed by hand.
 *
 * Two irregular ellipses at opposing rotations, the way you circle a mark on a
 * paper and go round twice because the first pass missed. It replaces the
 * animated progress ring from the old design, which read as a dashboard gauge
 * and coloured itself red below 70% — a number that is already the headline
 * does not also need to be scolding.
 */
function ScoreRing({ score }: { score: number }) {
  const rounded = Math.round(Math.min(100, Math.max(0, score)));

  return (
    <div className="relative flex h-[170px] w-[190px] flex-shrink-0 flex-col items-center justify-center">
      <div
        aria-hidden="true"
        className="absolute inset-0 rotate-[-9deg] border-[3px] border-pen"
        style={{ borderRadius: '52% 48% 55% 45% / 48% 55% 45% 52%' }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-y-1.5 -right-1 left-1 rotate-[6deg] border-2 border-pen/55"
        style={{ borderRadius: '48% 55% 45% 52% / 55% 45% 52% 48%' }}
      />
      <div className="flex items-baseline font-display font-bold text-ink">
        <span className="text-[84px] leading-none tracking-[-2px]">{rounded}</span>
        <span className="text-[30px]">%</span>
      </div>
      <div className="mono mt-1 text-xs text-ink-3">overall</div>
    </div>
  );
}

interface BarProps {
  label: string;
  /** 0–100. Drives the fill width only. */
  percent: number;
  /** What the score actually was, in its own units. */
  value: string;
}

function Bar({ label, percent, value }: BarProps) {
  return (
    <div className="grid grid-cols-[110px_1fr_56px] items-center gap-3 text-[15px] sm:grid-cols-[130px_1fr_64px] sm:gap-4">
      <span className="font-650">{label}</span>
      <div
        className="h-3.5 overflow-hidden rounded border-[1.5px] border-line-strong bg-white"
        role="img"
        aria-label={`${label}: ${value}`}
      >
        <div className="h-full bg-sticker/85" style={{ width: `${Math.min(100, percent)}%` }} />
      </div>
      <span className="mono text-right font-bold">{value}</span>
    </div>
  );
}

export default function ScoreSummary({ feedback }: { feedback: Feedback }) {
  const { mcqCorrect, mcqTotal, mcqPct, shortAnswerAvg, writingAvg, overall } =
    computeSectionScores(feedback);

  // Only the sections this lesson actually had. A beginner lesson has no short
  // answers, and a bar reading 0/10 for a section that was never set would be a
  // failure the learner never had the chance to avoid.
  const bars = [
    mcqPct !== null && {
      label: 'Multiple choice',
      percent: mcqPct,
      value: `${mcqCorrect}/${mcqTotal}`,
    },
    shortAnswerAvg !== null && {
      label: 'Short answer',
      percent: shortAnswerAvg * 10,
      value: `${shortAnswerAvg.toFixed(1)}/${MAX_SCORE}`,
    },
    writingAvg !== null && {
      label: 'Writing',
      percent: writingAvg * 10,
      value: `${writingAvg.toFixed(1)}/${MAX_SCORE}`,
    },
  ].filter((bar): bar is BarProps => Boolean(bar));

  return (
    <div className="flex flex-wrap items-center gap-8 sm:flex-nowrap sm:gap-12">
      <ScoreRing score={overall ?? 0} />

      {/* min-w-0 with a floor: inside nested flex containers the bar column
          collapses to nothing without it, leaving the label and the score with
          a sliver between them. */}
      <div className="flex w-full min-w-0 flex-1 flex-col gap-4 sm:min-w-[260px]">
        {bars.map((bar) => (
          <Bar key={bar.label} {...bar} />
        ))}
        {/* Saying how the number was reached, because an unexplained composite
            score invites the reader to distrust it. */}
        <p className="mono m-0 text-xs text-ink-3">
          overall = the average of {bars.length === 1 ? 'this' : `these ${bars.length}`}
        </p>
      </div>
    </div>
  );
}
