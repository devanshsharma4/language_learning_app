import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { VocabularyItem } from '../../types';
import api from '../../api/client';
import { hasAuthToken } from '../../hooks/useAuth';
import { partOfSpeechStyle, normalizePartOfSpeech } from '../../lib/partOfSpeech';
import { isCJK } from '../../lib/languages';
import { quote } from '../../lib/quotes';
import { Tape } from '../notebook';

interface DefinitionCardProps {
  vocab: VocabularyItem;
  /** The form as it appears in the article, when it differs from the headword. */
  surfaceForm?: string;
  language: string;
  lessonId?: string;
  alreadySaved: boolean;
  onClose: () => void;
  /** Offset from the top of the margin column, already clamped by the caller. */
  top: number;
}

/**
 * One definition, written on a card pinned in the right margin.
 *
 * There is only ever one of these on screen. Tapping another word moves this
 * card rather than opening a second — the old design's popovers could not
 * stack either, but they appeared over the text they were explaining, which
 * meant looking up a word hid the sentence it was in.
 */
export default function DefinitionCard({
  vocab,
  surfaceForm,
  language,
  lessonId,
  alreadySaved,
  onClose,
  top,
}: DefinitionCardProps) {
  const queryClient = useQueryClient();
  const style = partOfSpeechStyle(vocab.partOfSpeech);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const save = useMutation({
    mutationFn: async () => {
      // `lessonId` is a route param and is the string "demo" on the public
      // lesson. JSON has no NaN — it serializes to null, which the route's
      // z.number().optional() rejects — so the key is omitted instead.
      const numericLessonId = Number(lessonId);
      await api.post('/vocabulary/save', {
        word: vocab.word,
        translation: vocab.translation,
        explanation: vocab.explanation,
        context: vocab.context || vocab.example || '',
        // Normalized here rather than server-side: the route only accepts the
        // five buckets, and the model's raw label ("nm", "verbe") is not one.
        partOfSpeech: normalizePartOfSpeech(vocab.partOfSpeech),
        language,
        lessonId: Number.isFinite(numericLessonId) ? numericLessonId : undefined,
      });
    },
    // Prefix match, so the collection page and every open lesson refresh.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vocabulary'] }),
  });

  const saved = alreadySaved || save.isSuccess;
  const signedIn = hasAuthToken();
  // The headword is the dictionary form; show it only when the article used a
  // different one, so the line earns its space.
  const showsBaseForm = Boolean(surfaceForm && surfaceForm.toLowerCase() !== vocab.word.toLowerCase());

  return (
    <div
      role="dialog"
      aria-label={`${vocab.word} — definition`}
      /*
       * In the margin at xl and above, aligned to the word's line. Narrower
       * than that there is no margin to sit in, so it becomes a sheet at the
       * bottom of the viewport — not the popover the handoff eventually wants,
       * but it keeps the lookup usable instead of breaking the layout.
       */
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-[340px] bg-white shadow-card xl:absolute xl:inset-x-auto xl:bottom-auto xl:left-0 xl:top-[var(--card-top)] xl:mx-0 xl:w-[264px] xl:max-w-none xl:rotate-[1deg]"
      style={{ '--card-top': `${top}px` } as React.CSSProperties}
    >
      {/* Pointer back to the word in the text. */}
      <div
        aria-hidden="true"
        className="absolute -left-3 top-6 hidden h-0 w-0 border-y-[10px] border-r-[12px] border-y-transparent border-r-white xl:block"
      />
      <Tape tone="sand" className="-top-3 left-24" rotate={-3} width={88} />

      <div
        lang={language}
        className="flex items-start justify-between gap-2 border-b-[3px] px-4 pb-2 pt-4"
        style={{ borderColor: `rgba(${style.rgb},0.85)` }}
      >
        <div className="min-w-0">
          <div className="font-display text-[26px] font-bold leading-none">
            {surfaceForm || vocab.word}
          </div>
          <span
            lang="en"
            className={`mono mt-1.5 inline-block rounded px-1.5 py-0.5 text-[11px] font-bold ${style.chip}`}
          >
            {normalizePartOfSpeech(vocab.partOfSpeech)}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close definition"
          className="-mr-1.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded text-ink-3 hover:text-ink"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div className="ruled px-4 pb-4 pt-1 font-read text-[14px] leading-[26px]">
        <div className="text-[16px] font-bold text-pen">{vocab.translation}</div>

        {showsBaseForm && (
          <div className="mono text-[11px] text-ink-3">base form: {vocab.word}</div>
        )}

        <div className="text-ink-2">{vocab.explanation}</div>

        {vocab.example && (
          /*
           * Quoted in the marks the language actually uses — guillemets for
           * French and Spanish, corner brackets for Japanese. The marks are
           * part of the writing system being learned, so setting a French
           * sentence in English curly quotes teaches the wrong convention.
           */
          <div lang={language} className={`text-ink-2 ${isCJK(language) ? '' : 'italic'}`}>
            {quote(vocab.example, language)}
          </div>
        )}

        {saved ? (
          <div className="mono mt-2.5 flex items-center gap-1.5 text-[11px] leading-normal text-ink-3">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2B4FD8" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12l5 5 9-10" />
            </svg>
            Saved
            {/* New tab: navigating away would unmount the lesson and lose any
                answers typed so far. */}
            <Link to="/vocabulary" target="_blank" rel="noopener noreferrer" className="text-pen">
              your words
            </Link>
          </div>
        ) : !signedIn ? (
          // The demo lesson is public. Saving needs an account, and a 401 here
          // hard-redirects to /login, discarding the lesson.
          <Link
            to="/register"
            className="mono mt-2.5 inline-block text-[11px] font-bold leading-normal text-pen"
          >
            Sign up to keep words
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="mt-2.5 flex items-center gap-1.5 rounded-lg border-[1.5px] border-pen bg-pen-tint px-3 py-1 text-[13px] font-bold leading-normal text-pen-dark hover:bg-pen-chip disabled:opacity-60"
          >
            {!save.isPending && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            )}
            {save.isPending ? 'Saving…' : save.isError ? 'Try again' : 'Save word'}
          </button>
        )}
      </div>
    </div>
  );
}
