import { useReducer, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../api/client';
import { useDebounce } from '../hooks/useDebounce';
import { hasAuthToken } from '../hooks/useAuth';
import type { Lesson, LessonResponse, LessonSummary } from '../types';
import { MOCK_LESSON } from '../fixtures/mockLesson';
import { gradeDemoLesson } from '../lib/demoGrading';
import {
  estimateReadMinutes,
  languageCode,
  languageNativeName,
} from '../lib/languages';
import { Button, NotebookPage, Spinner, TopNav } from '../components/notebook';
import ArticleSection from '../components/lesson/ArticleSection';
import LessonOutline, { type OutlineSection } from '../components/lesson/LessonOutline';
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
      return { ...state, mcqAnswers: { ...state.mcqAnswers, [action.questionId]: action.optionIndex } };
    case 'SET_SHORT_ANSWER':
      return { ...state, shortAnswers: { ...state.shortAnswers, [action.questionId]: action.value } };
    case 'SET_WRITING':
      return {
        ...state,
        writingResponses: { ...state.writingResponses, [action.promptId]: action.value },
      };
  }
}

const DRAFT_KEY_PREFIX = 'lesson-draft-';

const EMPTY_FORM: FormState = { mcqAnswers: {}, shortAnswers: {}, writingResponses: {} };

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

/*
 * The form keeps answers keyed by id for cheap lookup while typing; both the
 * API and the results page want arrays. Shared by the real submit and the
 * demo's local grading so the two produce the same shape.
 */
const toMcqAnswers = (answers: FormState['mcqAnswers']) =>
  Object.entries(answers).map(([questionId, selectedOption]) => ({ questionId, selectedOption }));

const toShortAnswers = (answers: FormState['shortAnswers']) =>
  Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer }));

const toWritingResponses = (responses: FormState['writingResponses']) =>
  Object.entries(responses).map(([promptId, response]) => ({ promptId, response }));

function sourceLabel(articleUrl?: string): string {
  if (!articleUrl) return 'pasted text';
  try {
    return new URL(articleUrl).hostname.replace(/^www\./, '');
  } catch {
    return 'pasted text';
  }
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <NotebookPage marginLine={false}>
      <TopNav />
      <div className="flex min-h-[60vh] items-center justify-center px-6 text-center">
        {children}
      </div>
    </NotebookPage>
  );
}

export default function LessonView() {
  const { id: routeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * `/lessons/demo` is declared as a static route so it wins over `/lessons/:id`,
   * which means it captures no param — `useParams().id` is undefined there, and
   * a check of `id === 'demo'` never fires. Derive it from the path instead.
   */
  const isDemo = location.pathname.startsWith('/lessons/demo') || routeId === 'demo';
  const id = routeId ?? (isDemo ? 'demo' : undefined);

  // Set by the dashboard when the source article exceeded the length cap.
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

  const {
    data: fetchedData,
    isLoading,
    error,
  } = useQuery<{ lesson: Lesson; response?: LessonResponse }>({
    queryKey: ['lesson', id],
    queryFn: async () => {
      const { data } = await api.get(`/lessons/${id}`);
      const payload = data.data ?? data;
      return { lesson: payload.lesson ?? payload, response: payload.response };
    },
    enabled: !!id && !isDemo,
  });

  /**
   * The lesson's page number is its position in the user's notebook, oldest
   * first. The list arrives newest-first with a total, so the page number is
   * the total minus the row's offset. Shares LessonHistory's cache entry, so
   * arriving from that page costs no extra request.
   */
  const { data: lessonList } = useQuery<{ lessons: LessonSummary[]; total: number }>({
    queryKey: ['lessons'],
    queryFn: async () => {
      const { data } = await api.get('/lessons?limit=50');
      return data.data ?? data;
    },
    enabled: !isDemo && hasAuthToken(),
  });

  const pageNumber = useMemo(() => {
    if (!lessonList || !id) return undefined;
    const index = lessonList.lessons.findIndex((lesson) => String(lesson.id) === String(id));
    return index === -1 ? undefined : lessonList.total - index;
  }, [lessonList, id]);

  const lesson = isDemo ? MOCK_LESSON : fetchedData?.lesson;

  // Already submitted elsewhere — send them to the feedback, not a form they
  // would be filling in a second time.
  useEffect(() => {
    if (fetchedData?.response?.ai_feedback && id) {
      localStorage.removeItem(draftKey(id));
      navigate(`/lessons/${id}/results`, {
        replace: true,
        state: { lesson: fetchedData.lesson, response: fetchedData.response },
      });
    }
  }, [fetchedData, id, navigate]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      // The demo lesson has no row in the database — 'demo' is a route param,
      // not an id — so submitting it to the API returns 400. Grade it here
      // instead; MCQ scoring is identical to the server's.
      if (isDemo && lesson) {
        return {
          response: {
            // The responses are carried through, not just the feedback. The
            // results page shows you what you wrote back alongside each
            // question, and it reads the same shape the API returns — a
            // feedback-only object left those arrays undefined and crashed it.
            mcq_answers: toMcqAnswers(formState.mcqAnswers),
            short_answer_responses: toShortAnswers(formState.shortAnswers),
            writing_responses: toWritingResponses(formState.writingResponses),
            ai_feedback: gradeDemoLesson(
              lesson,
              formState.mcqAnswers,
              formState.shortAnswers,
              formState.writingResponses,
            ),
          },
        };
      }

      const { data } = await api.post(`/lessons/${id}/submit`, {
        mcqAnswers: toMcqAnswers(formState.mcqAnswers),
        shortAnswerResponses: toShortAnswers(formState.shortAnswers),
        writingResponses: toWritingResponses(formState.writingResponses),
      });
      return data;
    },
    onSuccess: (data) => {
      const response: LessonResponse = data.data?.response ?? data.response ?? data;
      if (id) localStorage.removeItem(draftKey(id));
      navigate(`/lessons/${id}/results`, { state: { lesson, response } });
    },
  });

  if (isLoading) {
    return (
      <CenteredMessage>
        <div className="flex items-center gap-3 text-ink-2">
          <Spinner size={24} label="Loading lesson" />
          Opening your lesson…
        </div>
      </CenteredMessage>
    );
  }

  if (error || !lesson) {
    return (
      <CenteredMessage>
        <div>
          <h1 className="mb-2 font-display text-3xl font-bold">That lesson didn&apos;t open</h1>
          <p className="mb-6 text-ink-2">
            It may have been deleted, or the link may be out of date.
          </p>
          <Button onClick={() => navigate('/lessons')}>Go to my lessons</Button>
        </div>
      </CenteredMessage>
    );
  }

  const englishTitle = lesson.article_title_english?.trim();
  const ownTitle = lesson.article_title?.trim();
  /*
   * The article's headline only goes inside the card when the page heading is
   * something else — otherwise the same words are printed twice, once large and
   * once small. That happens on older lessons with no English gloss, and on
   * English-language articles where the two titles coincide.
   */
  const cardTitle = englishTitle && ownTitle && ownTitle !== englishTitle ? ownTitle : undefined;

  const readingCount = lesson.questions.filter((q) => q.type === 'reading_comprehension').length;
  const vocabCount = lesson.questions.filter((q) => q.type === 'vocabulary').length;
  const shortAnswerCount = lesson.questions.filter((q) => q.type === 'short_answer').length;
  const promptCount = lesson.writing_prompts.length;

  /*
   * One list drives three things: the margin outline, the "part N" chips, and
   * the anchor ids. A lesson can be missing any section — a beginner lesson has
   * one writing prompt and no short answers — so the numbers are positional
   * rather than fixed, and the chip can never disagree with the margin.
   */
  const sections: OutlineSection[] = [
    { id: 'read', label: 'read' },
    ...(readingCount > 0 ? [{ id: 'questions', label: 'questions' }] : []),
    ...(vocabCount > 0 ? [{ id: 'vocabulary', label: 'vocabulary' }] : []),
    ...(shortAnswerCount > 0 ? [{ id: 'short', label: 'short answer' }] : []),
    ...(promptCount > 0 ? [{ id: 'writing', label: 'writing' }] : []),
  ];

  const partNumbers = Object.fromEntries(
    sections.map((section, index) => [section.id, index + 1]),
  );

  const totalTasks = readingCount + vocabCount + shortAnswerCount + promptCount;
  const answered =
    Object.keys(formState.mcqAnswers).length +
    Object.values(formState.shortAnswers).filter((value) => value.trim()).length +
    Object.values(formState.writingResponses).filter((value) => value.trim()).length;

  return (
    <NotebookPage>
      <TopNav />

      <div className="flex">
        <LessonOutline sections={sections} pageNumber={pageNumber} />

        {/* 150px rail + 190px gutter puts the article at x=340, leaving the
            margin line well clear of the text — the gutter is what makes the
            red rule read as a margin rather than a border. */}
        <main className="min-w-0 flex-1 px-6 pb-24 pt-10 xl:pl-[190px] xl:pr-6">
          <div className="xl:w-[1016px]">
            <div className="flex max-w-[720px] flex-wrap items-center justify-between gap-3">
              <Link
                to={isDemo ? '/' : '/lessons'}
                className="flex items-center gap-1.5 text-sm font-semibold text-ink-2 no-underline hover:text-ink"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 6l-6 6 6 6" />
                </svg>
                {isDemo ? 'Home' : 'My lessons'}
              </Link>

              <div className="mono flex gap-2 text-xs font-semibold">
                <span className="rounded-md bg-pen-chip px-2.5 py-[5px] text-pen-dark">
                  {languageCode(lesson.language)} · {languageNativeName(lesson.language)}
                </span>
                <span className="rounded-md bg-wrong-tint px-2.5 py-[5px] capitalize text-wrong-text">
                  {lesson.difficulty}
                </span>
                <span className="rounded-md border-[1.5px] border-dashed border-line-dash px-2.5 py-[5px] text-ink-3">
                  ~{estimateReadMinutes(lesson.article_text, lesson.language)} min read
                </span>
              </div>
            </div>

            {/*
              * Two titles, doing different jobs. The English gloss goes here,
              * outside the sheet, so you know the subject before meeting it in
              * a language you are still learning. The article's own headline
              * goes inside the sheet, where its author put it.
              *
              * Lessons created before the English title was stored have only
              * the one, so it heads the page alone and the card opens straight
              * into the text.
              */}
            <h1
              id="read"
              lang={englishTitle ? 'en' : lesson.language}
              className="mb-2 mt-9 max-w-[720px] scroll-mt-6 font-display text-[34px] font-bold leading-[1.04] tracking-[-0.4px] xl:text-[44px]"
            >
              {englishTitle || lesson.article_title || 'Untitled article'}
            </h1>
            <p className="mono mb-9 text-[13px] text-ink-3">
              {sourceLabel(lesson.article_url)} · {lesson.vocabulary.length} highlighted words
              {lesson.vocabulary.length > 0 && ' · tap one to look it up'}
            </p>

            {articleTruncated && (
              <div className="mb-7 flex max-w-[720px] items-start gap-3 rounded-xl border-[1.5px] border-dashed border-line-dash bg-white px-4 py-3">
                <p className="text-sm text-ink-2">
                  That article was long, so this lesson covers the opening section.
                  {lesson.article_url && (
                    <>
                      {' '}
                      <a
                        href={lesson.article_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold"
                      >
                        Read the whole thing
                      </a>
                      .
                    </>
                  )}
                </p>
              </div>
            )}

            <ArticleSection
              title={cardTitle}
              articleText={lesson.article_text}
              vocabulary={lesson.vocabulary}
              language={lesson.language}
              lessonId={id}
            />

            <div className="max-w-[720px]">
              <QuestionsSection
                questions={lesson.questions}
                language={lesson.language}
                partNumbers={partNumbers}
                mcqAnswers={formState.mcqAnswers}
                shortAnswers={formState.shortAnswers}
                onMCQChange={(questionId, optionIndex) =>
                  dispatch({ type: 'SET_MCQ', questionId, optionIndex })
                }
                onShortAnswerChange={(questionId, value) =>
                  dispatch({ type: 'SET_SHORT_ANSWER', questionId, value })
                }
              />

              {promptCount > 0 && (
                <WritingPromptsSection
                  prompts={lesson.writing_prompts}
                  language={lesson.language}
                  partNumber={partNumbers.writing}
                  responses={formState.writingResponses}
                  onResponseChange={(promptId, value) =>
                    dispatch({ type: 'SET_WRITING', promptId, value })
                  }
                />
              )}

              <div className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t-[1.5px] border-dashed border-line-dash pt-6">
                <span className="mono flex items-center gap-2 text-[13px] text-ink-3">
                  {answered > 0 && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2F8A4C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l5 5 9-10" />
                    </svg>
                  )}
                  {answered > 0 ? 'draft saved · ' : ''}
                  {answered} of {totalTasks} answered
                </span>

                <Button
                  onClick={() => submitMutation.mutate()}
                  loading={submitMutation.isPending}
                >
                  Hand it in
                  {!submitMutation.isPending && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  )}
                </Button>
              </div>

              {submitMutation.isError && (
                <p className="mt-4 rounded-xl border-[1.5px] border-wrong bg-wrong-tint px-4 py-3 text-sm text-wrong-text">
                  That didn&apos;t go through. Your answers are still here — try handing it in again.
                </p>
              )}
            </div>
          </div>
        </main>
      </div>
    </NotebookPage>
  );
}
