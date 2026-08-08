import type { Feedback, LessonResponse, WritingPrompt } from '../../types';

interface WritingResultsProps {
  evaluations: Feedback['writing_evaluation'];
  responses: LessonResponse['writing_responses'];
  prompts: WritingPrompt[];
}

export default function WritingResults({ evaluations, responses, prompts }: WritingResultsProps) {
  if (evaluations.length === 0) return null;

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold text-bark mb-6">
        Writing
      </h2>
      <div className="space-y-4">
        {evaluations.map((evaluation, idx) => {
          const prompt = prompts.find(p => p.id === evaluation.promptId);
          const userResponse = responses.find(r => r.promptId === evaluation.promptId);
          const scoreColor = evaluation.score >= 7 ? 'text-sage-dark bg-sage/10' : 'text-terracotta bg-terracotta/10';

          return (
            <div key={evaluation.promptId} className="bg-white rounded-2xl border border-sand shadow-sm p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <p className="text-bark font-medium italic">
                  <span className="text-sage-dark mr-2 not-italic">{idx + 1}.</span>
                  {prompt?.prompt}
                </p>
                <span className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-semibold ${scoreColor}`}>
                  {evaluation.score}/10
                </span>
              </div>

              {userResponse && (
                <blockquote className="ml-6 pl-4 border-l-2 border-sand text-bark-light mb-4">
                  {userResponse.response}
                </blockquote>
              )}

              <div className="ml-6 text-sm text-bark-light leading-relaxed mb-4">
                {evaluation.feedback}
              </div>

              {evaluation.strengths.length > 0 && (
                <div className="ml-6 mb-3">
                  <p className="text-sm font-medium text-sage-dark mb-2">Strengths</p>
                  <ul className="space-y-1">
                    {evaluation.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-bark-light">
                        <svg className="w-4 h-4 text-sage flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {evaluation.improvements.length > 0 && (
                <div className="ml-6">
                  <p className="text-sm font-medium text-terracotta mb-2">Areas to Improve</p>
                  <ul className="space-y-1">
                    {evaluation.improvements.map((imp, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-bark-light">
                        <svg className="w-4 h-4 text-terracotta flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" />
                        </svg>
                        {imp}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
