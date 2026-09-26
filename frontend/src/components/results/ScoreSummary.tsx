import type { Feedback } from '../../types';
import { MAX_SCORE, computeSectionScores } from '../../lib/score';

interface ScoreSummaryProps {
  feedback: Feedback;
}

function CircularProgress({ score: rawScore, size = 120 }: { score: number; size?: number }) {
  // Clamped at the point of use: an out-of-range score used to render a negative
  // strokeDashoffset, which draws the ring inside-out rather than failing loudly.
  const score = Math.min(100, Math.max(0, Number.isFinite(rawScore) ? rawScore : 0));
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? 'text-sage' : 'text-terracotta';
  const trackColor = score >= 70 ? 'text-sage/20' : 'text-terracotta/20';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className={trackColor}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={color}
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-2xl font-display font-bold ${score >= 70 ? 'text-sage-dark' : 'text-terracotta'}`}>
          {Math.round(score)}%
        </span>
      </div>
    </div>
  );
}

function StatCard({ label, value, subtext }: { label: string; value: string; subtext?: string }) {
  return (
    <div className="text-center">
      <p className="text-sm text-bark-light mb-1">{label}</p>
      <p className="text-xl font-display font-semibold text-bark">{value}</p>
      {subtext && <p className="text-xs text-bark-light/60 mt-0.5">{subtext}</p>}
    </div>
  );
}

export default function ScoreSummary({ feedback }: ScoreSummaryProps) {
  const { mcqCorrect, mcqTotal, mcqPct, shortAnswerAvg, writingAvg, overall } =
    computeSectionScores(feedback);

  // Only sections the lesson actually had are rendered, so the column count has
  // to follow the data -- a fixed grid-cols-3 left a hole with one or two stats,
  // and squeezed three labels into ~90px each on a phone.
  const stats = [
    mcqPct !== null && {
      label: 'Multiple Choice',
      value: `${mcqCorrect}/${mcqTotal}`,
      subtext: `${Math.round(mcqPct)}%`,
    },
    shortAnswerAvg !== null && {
      label: 'Short Answer',
      value: `${shortAnswerAvg.toFixed(1)}/${MAX_SCORE}`,
      subtext: 'avg score',
    },
    writingAvg !== null && {
      label: 'Writing',
      value: `${writingAvg.toFixed(1)}/${MAX_SCORE}`,
      subtext: 'avg score',
    },
  ].filter((s): s is { label: string; value: string; subtext: string } => Boolean(s));

  return (
    <div className="bg-white rounded-2xl border border-sand shadow-sm px-8 py-5">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <CircularProgress score={overall ?? 0} />
        <div
          className="flex-1 grid gap-6 w-full"
          style={{ gridTemplateColumns: `repeat(${Math.min(stats.length, 2)}, minmax(0, 1fr))` }}
        >
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      </div>
    </div>
  );
}
