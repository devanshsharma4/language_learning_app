import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useLocation, Link, Navigate, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../api/client';
import { useDebounce } from '../hooks/useDebounce';
import { hasAuthToken } from '../hooks/useAuth';
import type { Lesson, LessonResponse, LessonSummary, Note, SavedVocabulary } from '../types';
import { languageCode } from '../lib/languages';
import { Button, ButtonLink, NotebookPage, Spinner, TopNav } from '../components/notebook';
import ScoreSummary from '../components/results/ScoreSummary';
import TutorNote from '../components/results/TutorNote';
import ResultsTabs, { type ResultsTab } from '../components/results/ResultsTabs';
import MCQResults from '../components/results/MCQResults';
import ShortAnswerResults from '../components/results/ShortAnswerResults';
import WritingResults from '../components/results/WritingResults';
import GrammarCorrections from '../components/results/GrammarCorrections';
import VocabSuggestions from '../components/results/VocabSuggestions';
import { NotesPanel, SavedWordsPanel } from '../components/results/ResultsSidebar';

interface LocationState {
  lesson: Lesson;
  response: LessonResponse;
}

interface NotesData {
  note?: Note;
  notes?: Note[];
  vocabulary: SavedVocabulary[];
  lesson: { id: number; article_title?: string; language: string; difficulty: string };
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

export default function LessonResults() {
  const { id: routeId } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const navState = location.state as LocationState | null;

  /**
   * `/lessons/demo/results` is a static route, so it captures no `:id` param —
   * `useParams().id` is undefined there and a check of `id === 'demo'` never
   * fires. Derive it from the path, the same as the lesson view.
   */
  const isDemo = location.pathname.startsWith('/lessons/demo');
  const id = routeId ?? (isDemo ? 'demo' : undefined);

  const [noteContent, setNoteContent] = useState('');
  const [noteLoaded, setNoteLoaded] = useState(false);
  const debouncedNote = useDebounce(noteContent, 1000);
  // What the server is known to hold. Compared against before every autosave so
  // simply opening the page does not re-POST the note it just loaded.
  const lastSavedNote = useRef<string | null>(null);

  const { data, isLoading, error } = useQuery<{ lesson: Lesson; response: LessonResponse }>({
    queryKey: ['lessonResults', id],
    queryFn: async () => {
      const { data } = await api.get(`/lessons/${id}`);
      const payload = data.data ?? data;
      return { lesson: payload.lesson, response: payload.response };
    },
    enabled: !!id && !navState && !isDemo,
  });

  const { data: notesData } = useQuery<NotesData>({
    queryKey: ['notes', 'lesson', id],
    queryFn: async () => {
      const { data } = await api.get(`/notes/lesson/${id}`);
      return data.data ?? data;
    },
    enabled: !!id && !isDemo,
  });

  // Shares LessonHistory's cache entry, so the page number costs no extra
  // request when arriving from that list.
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

  useEffect(() => {
    if (notesData && !noteLoaded) {
      const existing = notesData.note ?? notesData.notes?.[0];
      const content = existing?.content ?? '';
      setNoteContent(content);
      lastSavedNote.current = content;
      setNoteLoaded(true);
    }
  }, [notesData, noteLoaded]);

  /**
   * Auto-save the note.
   *
   * An empty note is sent as a deletion rather than skipped: an earlier guard
   * required non-empty content, so clearing a note never persisted and the old
   * text reappeared on the next visit.
   */
  const saveMutation = useMutation({
    mutationFn: async (content: string) => {
      if (content === '') {
        const existing = notesData?.note ?? notesData?.notes?.[0];
        if (existing) await api.delete(`/notes/${existing.id}`);
        return;
      }
      await api.post('/notes', { lessonId: Number(id), content });
    },
    onSuccess: (_result, content) => {
      lastSavedNote.current = content;
    },
  });

  useEffect(() => {
    if (!noteLoaded || isDemo) return;

    const next = debouncedNote.trim();
    // Skip when nothing changed. Without this, loading a note set state, the
    // debounce caught up, and every page view wrote the note back unchanged.
    if (next === lastSavedNote.current) return;

    saveMutation.mutate(next);
    // saveMutation is intentionally omitted: it is recreated each render and
    // including it would re-fire the effect on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedNote, noteLoaded, isDemo]);

  const lesson = navState?.lesson ?? data?.lesson;
  const response = navState?.response ?? data?.response;
  const feedback = response?.ai_feedback;
  const savedVocab = notesData?.vocabulary ?? [];

  if (isLoading) {
    return (
      <CenteredMessage>
        <div className="flex items-center gap-3 text-ink-2">
          <Spinner size={24} label="Loading results" />
          Fetching your marks…
        </div>
      </CenteredMessage>
    );
  }

  if (error || !lesson || !feedback || !response) {
    // The demo is graded in the browser and its results live only in router
    // state, so a direct visit or a refresh has nothing to show. Send the
    // visitor back to take it rather than showing a dead end.
    if (isDemo) return <Navigate to="/lessons/demo" replace />;

    const notSubmitted = !error;

    return (
      <CenteredMessage>
        <div className="max-w-sm">
          <h1 className="mb-2 font-display text-3xl font-bold">
            {notSubmitted ? 'This one isn’t handed in yet' : 'Couldn’t load your marks'}
          </h1>
          <p className="mb-6 text-ink-2">
            {notSubmitted
              ? 'Answer the questions and hand it in to see how you did.'
              : 'Something went wrong fetching your feedback. Try again in a moment.'}
          </p>
          <div className="flex items-center justify-center gap-4">
            {notSubmitted && id ? (
              <ButtonLink to={`/lessons/${id}`}>Go to the lesson</ButtonLink>
            ) : (
              <Button onClick={() => navigate('/lessons')}>Go to my lessons</Button>
            )}
          </div>
        </div>
      </CenteredMessage>
    );
  }

  const { language } = lesson;
  const readingResults = feedback.mcq_results.filter((r) => r.type === 'reading_comprehension');
  const vocabResults = feedback.mcq_results.filter((r) => r.type === 'vocabulary');

  // Only sections this lesson produced get a tab, so the row never advertises
  // a heading that isn't on the page.
  const tabs: ResultsTab[] = [
    readingResults.length > 0 && { id: 'mc', label: 'Multiple choice' },
    vocabResults.length > 0 && { id: 'vocab', label: 'Vocabulary' },
    // Keyed off what the lesson contained, not what got graded — a section
    // where everything was skipped still renders, so it still needs a tab.
    lesson.questions.some((q) => q.type === 'short_answer') && { id: 'sa', label: 'Short answer' },
    lesson.writing_prompts.length > 0 && { id: 'wr', label: 'Writing' },
    feedback.grammar_corrections.length > 0 && {
      id: 'fix',
      label: 'Corrections',
      badge: feedback.grammar_corrections.length,
    },
    feedback.vocabulary_suggestions.length > 0 && { id: 'up', label: 'Word upgrades' },
  ].filter((tab): tab is ResultsTab => Boolean(tab));

  const noteStatus = saveMutation.isPending
    ? 'saving'
    : saveMutation.isError
      ? 'error'
      : saveMutation.isSuccess
        ? 'saved'
        : 'idle';

  return (
    <NotebookPage>
      <TopNav />

      <main className="px-6 pb-24 pt-10 xl:pl-[210px] xl:pr-8">
        <Link
          to={isDemo ? '/' : '/lessons'}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink no-underline hover:text-pen"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
          {isDemo ? 'Home' : 'My lessons'}
        </Link>

        <p className="mono mt-8 text-[13px] font-semibold text-ink-3">
          {pageNumber !== undefined && `page ${pageNumber} · `}
          graded · {languageCode(language)} · {lesson.difficulty}
        </p>
        <h1 className="mb-1 mt-1.5 font-display text-[38px] font-bold leading-[1.02] tracking-[-0.5px] xl:text-[46px]">
          Here&apos;s how you did
        </h1>
        {(lesson.article_title_english || lesson.article_title) && (
          <p
            lang={lesson.article_title_english ? 'en' : language}
            className="m-0 font-read text-[18px] italic text-ink-2"
          >
            {lesson.article_title_english || lesson.article_title}
          </p>
        )}

        <div className="mt-10 flex flex-col items-start gap-10 xl:mt-12 xl:flex-row xl:items-center xl:gap-14">
          <div className="w-full min-w-0 max-w-[620px] flex-1">
            <ScoreSummary feedback={feedback} />
          </div>
          {feedback.overall_feedback && <TutorNote>{feedback.overall_feedback}</TutorNote>}
        </div>

        <div className="mt-14 max-w-[1120px]">
          <ResultsTabs tabs={tabs} />
        </div>

        <div className="mt-12 flex flex-col gap-14 xl:flex-row xl:gap-14">
          <div className="flex min-w-0 flex-col gap-[72px] xl:w-[720px] xl:flex-shrink-0">
            <MCQResults
              mcqResults={feedback.mcq_results}
              questions={lesson.questions}
              language={language}
            />
            <ShortAnswerResults
              evaluations={feedback.short_answer_evaluation}
              responses={response.short_answer_responses}
              questions={lesson.questions}
              language={language}
            />
            <WritingResults
              evaluations={feedback.writing_evaluation}
              responses={response.writing_responses}
              prompts={lesson.writing_prompts}
              language={language}
            />
            <GrammarCorrections corrections={feedback.grammar_corrections} language={language} />
            <VocabSuggestions suggestions={feedback.vocabulary_suggestions} language={language} />

            <div className="flex flex-wrap gap-4 border-t-[1.5px] border-dashed border-line-dash pt-7">
              <ButtonLink to={isDemo ? '/lessons/demo' : `/lessons/${id}`} variant="quiet">
                Reread the article
              </ButtonLink>
              <ButtonLink to={isDemo ? '/register' : '/dashboard'}>
                {isDemo ? 'Make this your notebook' : 'Start a new page'}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </ButtonLink>
            </div>
          </div>

          {/* The demo keeps no notes and saves no words, so it gets no sidebar
              rather than an empty one inviting sign-in at every turn. */}
          {!isDemo && (
            <aside className="flex w-full flex-col gap-11 xl:w-[340px]">
              <NotesPanel value={noteContent} onChange={setNoteContent} status={noteStatus} />
              <SavedWordsPanel words={savedVocab} />
            </aside>
          )}
        </div>
      </main>
    </NotebookPage>
  );
}
