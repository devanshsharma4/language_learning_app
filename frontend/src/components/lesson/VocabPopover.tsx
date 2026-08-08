import { useEffect, useRef, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { VocabularyItem } from '../../types';
import api from '../../api/client';

interface VocabPopoverProps {
  vocab: VocabularyItem;
  language: string;
  lessonId?: string;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
}

export default function VocabPopover({ vocab, language, lessonId, anchorRef, onClose }: VocabPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [saved, setSaved] = useState(false);

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

  const handleSave = async () => {
    try {
      await api.post('/vocabulary/save', {
        word: vocab.word,
        translation: vocab.translation,
        explanation: vocab.explanation,
        context: vocab.context || vocab.example || '',
        language,
        lessonId: lessonId ? Number(lessonId) : undefined,
      });
      setSaved(true);
    } catch {
      // silently fail for MVP
    }
  };

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

      <button
        onClick={handleSave}
        disabled={saved}
        className={`mt-3 text-xs transition-colors duration-200 ${
          saved
            ? 'text-sage-dark/60 cursor-default'
            : 'text-sage-dark hover:text-olive cursor-pointer'
        }`}
      >
        {saved ? (
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Saved
          </span>
        ) : (
          '+ Save to vocabulary'
        )}
      </button>
    </div>,
    document.body,
  );
}
