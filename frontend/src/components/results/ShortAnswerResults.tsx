import type { Feedback, LessonQuestion, LessonResponse } from '../../types';

interface ShortAnswerResultsProps {
  evaluations: Feedback['short_answer_evaluation'];
  responses: LessonResponse['short_answer_responses'];
  questions: LessonQuestion[];
}

export default function ShortAnswerResults({ evaluations, responses, questions }: ShortAnswerResultsProps) {
  if (evaluations.length === 0) return null;

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold text-bark mb-6">
        Short Answer
      </h2>
      <div className="space-y-4">
        {evaluations.map((evaluation, idx) => {
          const question = questions.find(q => q.id === evaluation.questionId);
          const userResponse = responses.find(r => r.questionId === evaluation.questionId);
          const scoreColor = evaluation.score >= 7 ? 'text-sage-dark bg-sage/10' : 'text-terracotta bg-terracotta/10';

          return (
            <div key={evaluation.questionId} className="bg-white rounded-2xl border border-sand shadow-sm p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <p className="text-bark font-medium">
                  <span className="text-sage-dark mr-2">{idx + 1}.</span>
                  {question?.question}
                </p>
                <span className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-semibold ${scoreColor}`}>
                  {evaluation.score}/10
                </span>
              </div>

              {userResponse && (
                <blockquote className="ml-6 pl-4 border-l-2 border-sand text-bark-light italic mb-4">
                  {userResponse.answer}
                </blockquote>
              )}

              <div className="ml-6 text-sm text-bark-light leading-relaxed">
                {evaluation.feedback}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
