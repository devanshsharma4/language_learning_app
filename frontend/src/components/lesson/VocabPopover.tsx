import { useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { VocabularyItem } from '../../types';
import api from '../../api/client';

interface VocabPopoverProps {
  vocab: VocabularyItem;
  language: string;
  lessonId?: string;
  alreadySaved?: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
}

export default function VocabPopover({
  vocab,
  language,
  lessonId,
  alreadySaved = false,
  anchorRef,
  onClose,
}: VocabPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    // Defer so the current click doesn't immediately trigger close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);
    document.addEventListener('keydown', handleEscape);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose, anchorRef]);

  useLayoutEffect(() => {
    const popover = popoverRef.current;
    const anchor = anchorRef.current;
    if (!popover || !anchor) return;

    const anchorRect = anchor.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();

    // Position below the word
    let top = anchorRect.bottom + 8;
    let left = anchorRect.left + anchorRect.width / 2 - popoverRect.width / 2;

    // If not enough room below, shift to the right of the word
    if (top + popoverRect.height > window.innerHeight) {
      top = anchorRect.top;
      left = anchorRect.right + 8;
    }
    if (left < 8) left = 8;
    if (left + popoverRect.width > window.innerWidth - 8) {
      left = window.innerWidth - popoverRect.width - 8;
    }

    popover.style.top = `${top + window.scrollY}px`;
    popover.style.left = `${left}px`;
  });

  const save = useMutation({
    mutationFn: async () => {
      // `lessonId` is a route param, and on /lessons/demo it is not a number at
      // all. JSON has no NaN — it serializes to null, which the route's
      // `z.number().optional()` rejects with a 400 — so omit the key instead.
      const numericLessonId = Number(lessonId);

      await api.post('/vocabulary/save', {
        word: vocab.word,
        translation: vocab.translation,
        explanation: vocab.explanation,
        context: vocab.context || vocab.example || '',
        language,
        lessonId: Number.isFinite(numericLessonId) ? numericLessonId : undefined,
      });
    },
    onSuccess: () => {
      // Prefix match: refreshes the collection page and any other open lesson.
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] });
    },
  });

  const saved = alreadySaved || save.isSuccess;

  // Portal to document.body so the popover isn't clipped by the <p> tag,
  // but it still visually appears right next to the clicked word
  return createPortal(
    <div
      ref={popoverRef}
      className="absolute z-50 w-72 bg-white rounded-2xl border border-sand shadow-lg p-4"
    >
      <div className="flex items-baseline gap-2 mb-1">
        <span className="font-display text-lg font-semibold text-bark">
          {vocab.word}
        </span>
        {vocab.partOfSpeech && (
          <span className="text-sm text-bark-light italic">
            {vocab.partOfSpeech}
          </span>
        )}
      </div>

      <p className="text-sage-dark font-medium text-base mb-2">
        {vocab.translation}
      </p>

      <p className="text-bark-light text-sm">
        {vocab.explanation}
      </p>

      {vocab.example && (
        <p className="text-sm text-bark-light/80 italic mt-2 border-l-2 border-sage/30 pl-3">
          {vocab.example}
        </p>
      )}

      {saved ? (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-sage-dark/60">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Saved
          <span className="text-bark-light/30">·</span>
          {/* New tab on purpose: navigating away would unmount the lesson and
              lose any answers typed so far. */}
          <Link
            to="/vocabulary"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sage-dark hover:text-olive transition-colors duration-200"
          >
            View collection
          </Link>
        </div>
      ) : (
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className={`mt-3 text-xs transition-colors duration-200 cursor-pointer ${
            save.isError
              ? 'text-terracotta hover:text-terracotta/80'
              : 'text-sage-dark hover:text-olive'
          } disabled:cursor-default disabled:text-sage-dark/60`}
        >
          {save.isPending
            ? 'Saving…'
            : save.isError
              ? "Couldn't save — retry"
              : '+ Save to vocabulary'}
        </button>
      )}
    </div>,
    document.body,
  );
}
