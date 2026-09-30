import type { ReactNode } from 'react';
import { OPTION_LABELS } from '../../lib/mcq';

/*
 * Only the answerable states live here. The results page shows just the two
 * answers that matter — what you picked and what was right — rather than
 * re-rendering all four options, so it draws its own rows and needs none of
 * this.
 */
type Tone = 'default' | 'selected';

const ROW_TONES: Record<Tone, string> = {
  default: 'border-[1.5px] border-line bg-white',
  selected: 'border-2 border-pen bg-pen-tint font-semibold text-pen-text shadow-choice',
};

const BADGE_TONES: Record<Tone, string> = {
  default: 'border-[1.5px] border-line-badge bg-pen-badge text-ink-2',
  selected: 'border-[1.5px] border-pen bg-pen text-white',
};

interface RowProps {
  optionIndex: number;
  children: ReactNode;
  tone?: Tone;
}

/** The shell: A–D badge, then the option text. */
function Row({ optionIndex, children, tone = 'default' }: RowProps) {
  return (
    <div className={`flex items-center gap-3.5 rounded-xl px-4 py-3 ${ROW_TONES[tone]}`}>
      <span
        aria-hidden="true"
        className={`mono flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-hand text-[13px] font-extrabold ${BADGE_TONES[tone]}`}
      >
        {OPTION_LABELS[optionIndex]}
      </span>
      <span className="flex-1 font-read text-[17px]">{children}</span>
    </div>
  );
}

interface SelectableChoiceRowProps {
  optionIndex: number;
  children: ReactNode;
  name: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  lang?: string;
}

/**
 * An answerable option.
 *
 * The radio input stays visually hidden and the styled row is the control, so
 * the label carries `focus-within` styling — without it a keyboard user
 * arrowing through a question had no idea where focus was. A–D shortcuts are
 * handled by the parent fieldset.
 */
export function SelectableChoiceRow({
  optionIndex,
  children,
  name,
  selected,
  onSelect,
  disabled,
  lang,
}: SelectableChoiceRowProps) {
  return (
    <label
      lang={lang}
      className={`cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-pen ${
        disabled ? 'cursor-not-allowed opacity-60' : ''
      }`}
    >
      <input
        type="radio"
        name={name}
        checked={selected}
        onChange={onSelect}
        disabled={disabled}
        className="sr-only"
      />
      <Row optionIndex={optionIndex} tone={selected ? 'selected' : 'default'}>
        {children}
      </Row>
    </label>
  );
}
