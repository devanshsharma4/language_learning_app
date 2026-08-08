import type { Feedback } from '../../types';

interface ScoreSummaryProps {
  feedback: Feedback;
}

function CircularProgress({ score, size = 120 }: { score: number; size?: number }) {
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
  const { mcq_results, short_answer_evaluation, writing_evaluation } = feedback;

  const mcqCorrect = mcq_results.filter(r => r.correct).length;
  const mcqTotal = mcq_results.length;
  const mcqPct = mcqTotal > 0 ? (mcqCorrect / mcqTotal) * 100 : 0;

  const saAvg =
    short_answer_evaluation.length > 0
      ? short_answer_evaluation.reduce((sum, e) => sum + e.score, 0) / short_answer_evaluation.length
      : 0;

  const writingAvg =
    writing_evaluation.length > 0
      ? writing_evaluation.reduce((sum, e) => sum + e.score, 0) / writing_evaluation.length
      : 0;

  // Weighted overall: MCQ 40%, short answer 30%, writing 30%
  const parts: number[] = [];
  if (mcqTotal > 0) parts.push(mcqPct);
  if (short_answer_evaluation.length > 0) parts.push(saAvg * 10); // scores are 1-10, scale to 100
  if (writing_evaluation.length > 0) parts.push(writingAvg * 10);
  const overall = parts.length > 0 ? parts.reduce((a, b) => a + b, 0) / parts.length : 0;

  return (
    <div className="bg-white rounded-2xl border border-sand shadow-sm px-8 py-5">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <CircularProgress score={overall} />
        <div className="flex-1 grid grid-cols-3 gap-6">
          {mcqTotal > 0 && (
            <StatCard
              label="Multiple Choice"
              value={`${mcqCorrect}/${mcqTotal}`}
              subtext={`${Math.round(mcqPct)}%`}
            />
          )}
          {short_answer_evaluation.length > 0 && (
            <StatCard
              label="Short Answer"
              value={`${saAvg.toFixed(1)}/10`}
              subtext="avg score"
            />
          )}
          {writing_evaluation.length > 0 && (
            <StatCard
              label="Writing"
              value={`${writingAvg.toFixed(1)}/10`}
              subtext="avg score"
            />
          )}
        </div>
      </div>
    </div>
  );
}
