import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, Link, Navigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../api/client';
import { useDebounce } from '../hooks/useDebounce';
import type { Lesson, LessonResponse, Note, SavedVocabulary } from '../types';
import ScoreSummary from '../components/results/ScoreSummary';
import MCQResults from '../components/results/MCQResults';
import ShortAnswerResults from '../components/results/ShortAnswerResults';
import WritingResults from '../components/results/WritingResults';
import GrammarCorrections from '../components/results/GrammarCorrections';
import VocabSuggestions from '../components/results/VocabSuggestions';

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

export default function LessonResults() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navState = location.state as LocationState | null;
  const isDemo = id === 'demo';

  const [noteContent, setNoteContent] = useState('');
  const [noteLoaded, setNoteLoaded] = useState(false);
  const [vocabOpen, setVocabOpen] = useState(false);
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

  // Fetch note + saved vocab for this lesson
  const { data: notesData } = useQuery<NotesData>({
    queryKey: ['notes', 'lesson', id],
    queryFn: async () => {
      const { data } = await api.get(`/notes/lesson/${id}`);
      return data.data ?? data;
    },
    enabled: !!id && !isDemo,
  });

  // Load existing note into state
  useEffect(() => {
    if (notesData && !noteLoaded) {
      const existing = notesData.note ?? notesData.notes?.[0];
      const content = existing?.content ?? '';
      setNoteContent(content);
      lastSavedNote.current = content;
      setNoteLoaded(true);
    }
  }, [notesData, noteLoaded]);

  // Auto-save note.
  //
  // An empty note is sent as a deletion rather than skipped: the old guard
  // required non-empty content, so clearing a note never persisted and the old
  // text reappeared on the next visit.
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
      <div className="min-h-screen bg-cream font-body flex items-center justify-center">
        <div className="flex items-center gap-3 text-bark-light">
          <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading results...
        </div>
      </div>
    );
  }

  if (error || !lesson || !feedback) {
    // The demo is graded in the browser and its results live only in router
    // state, so a direct visit or a refresh has nothing to show. Send the user
    // back to take it rather than showing a dead end.
    if (isDemo) {
      return <Navigate to="/lessons/demo" replace />;
    }

    const isMissingResults = !error;

    return (
      <div className="min-h-screen bg-cream font-body flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <p className="text-bark font-medium mb-2">
            {isMissingResults ? 'This lesson hasn’t been submitted yet' : 'Couldn’t load results'}
          </p>
          <p className="text-bark-light text-sm mb-5">
            {isMissingResults
              ? 'Answer the questions and submit to see your feedback.'
              : 'Something went wrong fetching your feedback. Try again in a moment.'}
          </p>
          <div className="flex items-center justify-center gap-4">
            {isMissingResults && id && (
              <Link
                to={`/lessons/${id}`}
                className="bg-sage hover:bg-sage-dark text-white font-semibold rounded-2xl px-5 py-2.5 transition-colors duration-200"
              >
                Go to lesson
              </Link>
            )}
            <Link
              to="/dashboard"
              className="text-sage-dark hover:text-olive transition-colors duration-200"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-cream font-body overflow-hidden">
      {/* Grain texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-bark-light hover:text-bark transition-colors mb-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </Link>
          <h1 className="font-display text-3xl font-bold text-bark">
            Lesson Results
          </h1>
          {lesson.article_title && (
            <p className="text-bark-light mt-1">{lesson.article_title}</p>
          )}
        </div>

        {/* Score Summary */}
        <ScoreSummary feedback={feedback} />

        {/* Overall Feedback */}
        {feedback.overall_feedback && (
          <div className="mt-8 bg-sage/10 border border-sage/20 rounded-2xl p-6">
            <h3 className="font-display text-lg font-semibold text-bark mb-2">
              Overall Feedback
            </h3>
            <p className="text-bark-light leading-relaxed">{feedback.overall_feedback}</p>
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 my-10">
          <span className="flex-1 h-px bg-sand" />
          <span className="text-sm text-bark-light/50 font-medium tracking-wide uppercase">
            Detailed Results
          </span>
          <span className="flex-1 h-px bg-sand" />
        </div>

        {/* Detailed sections */}
        <div className="space-y-10">
          <MCQResults
            mcqResults={feedback.mcq_results}
            questions={lesson.questions}
          />

          <ShortAnswerResults
            evaluations={feedback.short_answer_evaluation}
            responses={response.short_answer_responses}
            questions={lesson.questions}
          />

          <WritingResults
            evaluations={feedback.writing_evaluation}
            responses={response.writing_responses}
            prompts={lesson.writing_prompts}
          />

          <GrammarCorrections corrections={feedback.grammar_corrections} />

          <VocabSuggestions suggestions={feedback.vocabulary_suggestions} />
        </div>

        {/* Notes & Vocab */}
        {!isDemo && (
          <>
            <div className="flex items-center gap-3 my-10">
              <span className="flex-1 h-px bg-sand" />
              <span className="text-sm text-bark-light/50 font-medium tracking-wide uppercase">
                Your Notes
              </span>
              <span className="flex-1 h-px bg-sand" />
            </div>

            {/* Note textarea */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label htmlFor="lesson-note" className="font-display text-2xl font-semibold text-bark">
                  My Notes
                </label>
                {/* aria-live so the save state is announced, not just shown. */}
                <span role="status" aria-live="polite" className="text-xs">
                  {saveMutation.isPending && <span className="text-bark-light">Saving...</span>}
                  {saveMutation.isError && !saveMutation.isPending && (
                    <span className="text-terracotta font-medium">
                      Couldn&apos;t save — your text is still here, retrying on the next edit.
                    </span>
                  )}
                  {saveMutation.isSuccess && !saveMutation.isPending && (
                    <span className="text-sage-dark">Saved</span>
                  )}
                </span>
              </div>
              <textarea
                id="lesson-note"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Jot down thoughts, things to remember, patterns you noticed..."
                rows={4}
                className="w-full px-4 py-4 bg-white rounded-2xl border border-sand text-bark placeholder:text-bark-light/60 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/50 shadow-sm hover:shadow-md transition-all duration-200 resize-none"
              />
            </div>

            {/* Saved Vocabulary (collapsible) */}
            {savedVocab.length > 0 && (
              <div className="mb-6">
                <button
                  onClick={() => setVocabOpen(!vocabOpen)}
                  className="flex items-center gap-2 text-bark font-display text-lg font-semibold cursor-pointer hover:text-sage-dark transition-colors"
                >
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${vocabOpen ? 'rotate-90' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  Saved Vocabulary ({savedVocab.length})
                </button>
                {vocabOpen && (
                  <div className="mt-3 space-y-2">
                    {savedVocab.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white rounded-xl border border-sand shadow-sm px-4 py-3"
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="font-medium text-bark">{item.word}</span>
                          <span className="text-sm text-sage-dark flex-shrink-0">{item.translation}</span>
                        </div>
                        {item.explanation && (
                          <p className="text-sm text-bark-light mt-0.5">{item.explanation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Bottom navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12 mb-8">
          <Link
            to={`/lessons/${id}`}
            className="px-6 py-3 border border-sand rounded-2xl text-bark hover:bg-white hover:shadow-sm transition-all duration-200"
          >
            Review Article
          </Link>
          <Link
            to="/dashboard"
            className="px-6 py-3 bg-sage hover:bg-sage-dark text-white font-semibold rounded-2xl shadow-md hover:shadow-lg transition-all duration-200"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
