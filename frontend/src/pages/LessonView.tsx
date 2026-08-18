import { useReducer, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../api/client';
import { useDebounce } from '../hooks/useDebounce';
import type { Lesson, LessonResponse } from '../types';
import { MOCK_LESSON } from '../fixtures/mockLesson';
import LessonHeader from '../components/lesson/LessonHeader';
import ArticleSection from '../components/lesson/ArticleSection';
import QuestionsSection from '../components/lesson/QuestionsSection';
import WritingPromptsSection from '../components/lesson/WritingPromptsSection';

interface FormState {
  mcqAnswers: Record<string, number>;
  shortAnswers: Record<string, string>;
  writingResponses: Record<string, string>;
}

type Action =
  | { type: 'SET_MCQ'; questionId: string; optionIndex: number }
  | { type: 'SET_SHORT_ANSWER'; questionId: string; value: string }
  | { type: 'SET_WRITING'; promptId: string; value: string };

function formReducer(state: FormState, action: Action): FormState {
  switch (action.type) {
    case 'SET_MCQ':
      return {
        ...state,
        mcqAnswers: {
          ...state.mcqAnswers,
          [action.questionId]: action.optionIndex,
        },
      };
    case 'SET_SHORT_ANSWER':
      return {
        ...state,
        shortAnswers: {
          ...state.shortAnswers,
          [action.questionId]: action.value,
        },
      };
    case 'SET_WRITING':
      return {
        ...state,
        writingResponses: {
          ...state.writingResponses,
          [action.promptId]: action.value,
        },
      };
  }
}

const DRAFT_KEY_PREFIX = 'lesson-draft-';

const EMPTY_FORM: FormState = {
  mcqAnswers: {},
  shortAnswers: {},
  writingResponses: {},
};

const draftKey = (lessonId: string) => `${DRAFT_KEY_PREFIX}${lessonId}`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isFormEmpty(state: FormState) {
  return (
    Object.keys(state.mcqAnswers).length === 0 &&
    Object.keys(state.shortAnswers).length === 0 &&
    Object.keys(state.writingResponses).length === 0
  );
}

/**
 * Restores in-progress answers so a refresh or a stray back-navigation doesn't
 * discard them.
 *
 * localStorage is user-editable and a malformed draft must never be able to
 * crash the lesson page, so anything that isn't the exact shape we wrote is
 * dropped in favour of a blank form.
 */
function loadDraft(lessonId: string | undefined): FormState {
  if (!lessonId) return EMPTY_FORM;

  try {
    const raw = localStorage.getItem(draftKey(lessonId));
    if (!raw) return EMPTY_FORM;

    const parsed: unknown = JSON.parse(raw);
    if (
      !isRecord(parsed) ||
      !isRecord(parsed.mcqAnswers) ||
      !isRecord(parsed.shortAnswers) ||
      !isRecord(parsed.writingResponses)
    ) {
      return EMPTY_FORM;
    }

    return {
      mcqAnswers: parsed.mcqAnswers as FormState['mcqAnswers'],
      shortAnswers: parsed.shortAnswers as FormState['shortAnswers'],
      writingResponses: parsed.writingResponses as FormState['writingResponses'],
    };
  } catch {
    return EMPTY_FORM;
  }
}

export default function LessonView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Set by the Dashboard when the source article exceeded the length cap.
  const articleTruncated = Boolean(
    (location.state as { articleTruncated?: boolean } | null)?.articleTruncated,
  );

  // Lazy init, so a restored draft is present on the first render with no flicker.
  const [formState, dispatch] = useReducer(formReducer, id, loadDraft);

  // Persist on a debounce rather than every keystroke.
  const debouncedForm = useDebounce(formState, 500);

  useEffect(() => {
    if (!id) return;
    if (isFormEmpty(debouncedForm)) {
      localStorage.removeItem(draftKey(id));
    } else {
      localStorage.setItem(draftKey(id), JSON.stringify(debouncedForm));
    }
  }, [debouncedForm, id]);

  const isDemo = id === 'demo';

  const {
    data: fetchedData,
    isLoading,
    error,
  } = useQuery<{ lesson: Lesson; response?: LessonResponse }>({
    queryKey: ['lesson', id],
    queryFn: async () => {
      const { data } = await api.get(`/lessons/${id}`);
      const payload = data.data ?? data;
      return {
        lesson: payload.lesson ?? payload,
        response: payload.response,
      };
    },
    enabled: !!id && !isDemo,
  });

  const lesson = isDemo ? MOCK_LESSON : fetchedData?.lesson;

  // Redirect to results if lesson already has a submitted response with feedback
  useEffect(() => {
    if (fetchedData?.response?.ai_feedback && id) {
      // Already submitted elsewhere — any local draft is stale.
      localStorage.removeItem(draftKey(id));
      navigate(`/lessons/${id}/results`, {
        replace: true,
        state: { lesson: fetchedData.lesson, response: fetchedData.response },
      });
    }
  }, [fetchedData, id, navigate]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const mcqAnswers = Object.entries(formState.mcqAnswers).map(
        ([questionId, selectedOption]) => ({ questionId, selectedOption })
      );
      const shortAnswerResponses = Object.entries(formState.shortAnswers).map(
        ([questionId, answer]) => ({ questionId, answer })
      );
      const writingResponses = Object.entries(formState.writingResponses).map(
        ([promptId, response]) => ({ promptId, response })
      );

      const { data } = await api.post(`/lessons/${id}/submit`, {
        mcqAnswers,
        shortAnswerResponses,
        writingResponses,
      });
      return data;
    },
    onSuccess: (data) => {
      const response: LessonResponse = data.data?.response ?? data.response ?? data;
      if (id) localStorage.removeItem(draftKey(id));
      navigate(`/lessons/${id}/results`, {
        state: { lesson, response },
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream font-body flex items-center justify-center">
        <div className="flex items-center gap-3 text-bark-light">
          <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Loading lesson...
        </div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="min-h-screen bg-cream font-body flex items-center justify-center">
        <div className="text-center">
          <p className="text-bark-light mb-4">Failed to load lesson.</p>
          <a
            href="/dashboard"
            className="text-sage-dark hover:text-olive transition-colors duration-200"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-cream font-body overflow-hidden">
      {/* Soft grain texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-8">
        <LessonHeader language={lesson.language} difficulty={lesson.difficulty} />

        {articleTruncated && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-sand bg-cream-dark/60 px-4 py-3">
            <svg
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-bark-light/60"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="12" cy="12" r="10" />
              <path strokeLinecap="round" d="M12 8v5m0 3h.01" />
            </svg>
            <p className="text-sm text-bark-light">
              That article was long, so this lesson covers the opening section.
              {lesson.article_url && (
                <>
                  {' '}
                  <a
                    href={lesson.article_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-sage-dark underline underline-offset-2 hover:text-olive"
                  >
                    Read the full article
                  </a>
                  .
                </>
              )}
            </p>
          </div>
        )}

        {/* Article */}
        <ArticleSection
          title={lesson.article_title}
          articleText={lesson.article_text}
          vocabulary={lesson.vocabulary}
          language={lesson.language}
          lessonId={id}
        />

        {/* Divider */}
        <div className="flex items-center gap-3 my-12">
          <span className="flex-1 h-px bg-sand" />
          <div className="text-sage">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.5" />
              <path d="M9 12H4" />
            </svg>
          </div>
          <span className="flex-1 h-px bg-sand" />
        </div>

        {/* Questions */}
        {lesson.questions.length > 0 && (
          <QuestionsSection
            questions={lesson.questions}
            mcqAnswers={formState.mcqAnswers}
            shortAnswers={formState.shortAnswers}
            onMCQChange={(qId, optIdx) =>
              dispatch({ type: 'SET_MCQ', questionId: qId, optionIndex: optIdx })
            }
            onShortAnswerChange={(qId, val) =>
              dispatch({ type: 'SET_SHORT_ANSWER', questionId: qId, value: val })
            }
          />
        )}

        {/* Writing Prompts */}
        {lesson.writing_prompts.length > 0 && (
          <>
            <div className="flex items-center gap-3 my-12">
              <span className="flex-1 h-px bg-sand" />
              <span className="text-sm text-bark-light/50 font-medium tracking-wide uppercase">
                Writing
              </span>
              <span className="flex-1 h-px bg-sand" />
            </div>

            <WritingPromptsSection
              prompts={lesson.writing_prompts}
              responses={formState.writingResponses}
              onResponseChange={(pId, val) =>
                dispatch({ type: 'SET_WRITING', promptId: pId, value: val })
              }
            />
          </>
        )}

        {/* Submit */}
        <button
          onClick={() => submitMutation.mutate()}
          disabled={submitMutation.isPending}
          className="w-full mt-10 mb-8 py-4 bg-sage hover:bg-sage-dark active:bg-olive text-white font-semibold rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed text-lg cursor-pointer"
        >
          {submitMutation.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Submitting...
            </span>
          ) : (
            'Submit Answers'
          )}
        </button>

        {submitMutation.isError && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-center mb-8">
            Something went wrong. Please try again.
          </div>
        )}
      </div>
    </div>
  );
}
