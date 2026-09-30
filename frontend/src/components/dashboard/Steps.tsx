import type { ReactNode } from 'react';

type StepTone = 'one' | 'two' | 'three';

const STEP_TONES: Record<StepTone, string> = {
  one: 'bg-pen-chip text-pen-dark',
  two: 'bg-wrong-tint text-wrong-text',
  three: 'bg-[#FFF1C4] text-[#7A5A00]',
};

interface StepLabelProps {
  number: number;
  tone: StepTone;
  children: ReactNode;
}

/**
 * A numbered step heading.
 *
 * Numbered because this genuinely is a sequence — the language decides what the
 * level means, and both have to be right before the article is worth fetching.
 * Each step carries its own ink, matching the part chips inside a lesson, so
 * the colours mean the same thing on both screens.
 */
export function StepLabel({ number, tone, children }: StepLabelProps) {
  return (
    <span className="flex items-center gap-3 text-[17px] font-750">
      <span
        aria-hidden="true"
        className={`mono flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[13px] ${STEP_TONES[tone]}`}
      >
        {number}
      </span>
      {children}
    </span>
  );
}

interface LanguageCardProps {
  code: string;
  name: string;
  selected: boolean;
  onSelect: () => void;
}

/**
 * A language choice, labelled by its ISO code rather than a flag.
 *
 * A flag names a country, not a language — Spanish is not Spain's alone, and
 * the old design's 🇪🇸 said otherwise to every Latin American learner. The code
 * is also what the rest of the app now uses in its chips.
 */
export function LanguageCard({ code, name, selected, onSelect }: LanguageCardProps) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2.5 rounded-xl py-2.5 pl-2.5 pr-4 text-base focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-pen ${
        selected
          ? 'border-2 border-pen bg-pen-tint font-bold text-pen-text shadow-choice'
          : 'border-[1.5px] border-line bg-white hover:border-pen/40'
      }`}
    >
      <input type="radio" name="language" checked={selected} onChange={onSelect} className="sr-only" />
      <span
        aria-hidden="true"
        className={`mono flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[13px] font-extrabold ${
          selected ? 'bg-pen text-white' : 'bg-pen-badge text-ink-2'
        }`}
      >
        {code}
      </span>
      {name}
    </label>
  );
}

interface LevelPickerProps<T extends string> {
  levels: readonly T[];
  value: T;
  onChange: (level: T) => void;
}

/**
 * A segmented control for difficulty — one object with three positions, rather
 * than three separate pills. The levels are mutually exclusive points on a
 * single scale, and the enclosing border is what says so.
 */
export function LevelPicker<T extends string>({ levels, value, onChange }: LevelPickerProps<T>) {
  return (
    <div className="inline-flex gap-1.5 rounded-2xl border-[1.5px] border-line bg-white p-1.5 text-base">
      {levels.map((level) => {
        const selected = level === value;
        return (
          <label
            key={level}
            className={`cursor-pointer rounded-xl px-5 py-2.5 capitalize focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-pen ${
              selected ? 'bg-wrong-tint font-bold text-[#7A1D46]' : 'text-ink-2 hover:text-ink'
            }`}
          >
            <input
              type="radio"
              name="difficulty"
              checked={selected}
              onChange={() => onChange(level)}
              className="sr-only"
            />
            {level}
          </label>
        );
      })}
    </div>
  );
}
