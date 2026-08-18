import { useRef } from 'react';
import type { VocabularyItem } from '../../types';
import VocabPopover from './VocabPopover';

interface VocabHighlightProps {
  text: string;
  vocab: VocabularyItem;
  language: string;
  lessonId?: string;
  alreadySaved?: boolean;
  isActive: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export default function VocabHighlight({
  text,
  vocab,
  language,
  lessonId,
  alreadySaved,
  isActive,
  onToggle,
  onClose,
}: VocabHighlightProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={buttonRef}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={onToggle}
        className="bg-sage/15 text-sage-dark border-b-2 border-sage/40 rounded-sm px-0.5 cursor-pointer hover:bg-sage/25 transition-colors duration-200 inline"
      >
        {text}
      </button>
      {isActive && (
        <VocabPopover
          vocab={vocab}
          language={language}
          lessonId={lessonId}
          alreadySaved={alreadySaved}
          anchorRef={buttonRef}
          onClose={onClose}
        />
      )}
    </>
  );
}
