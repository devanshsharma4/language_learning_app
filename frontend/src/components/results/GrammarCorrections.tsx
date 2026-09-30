import type { Feedback } from '../../types';
import { PART_OF_SPEECH_STYLES } from '../../lib/partOfSpeech';
import SectionHeading from './SectionHeading';

const CORRECT_INK = { '--hl': PART_OF_SPEECH_STYLES.adverb.rgb } as React.CSSProperties;

interface GrammarCorrectionsProps {
  corrections: Feedback['grammar_corrections'];
  language: string;
}

/**
 * Corrections, marked the way a teacher marks them: the wrong form struck
 * through in pink, the right one written beside it in green.
 *
 * The model returns only the two forms and an explanation — not the sentence
 * they came from — so the pair is shown on its own rather than set back into
 * context. Inventing the surrounding sentence would put words in the learner's
 * mouth that they may not have written.
 */
export default function GrammarCorrections({ corrections, language }: GrammarCorrectionsProps) {
  if (corrections.length === 0) return null;

  return (
    <section id="fix" className="scroll-mt-6">
      <SectionHeading heading="Corrections" aside="from your answers" />

      <div className="overflow-hidden rounded-2xl border-[1.5px] border-line-strong bg-white">
        {corrections.map((correction, idx) => (
          <div
            key={idx}
            className="border-b border-dashed border-line-strong px-6 py-5 last:border-b-0"
          >
            <div lang={language} className="flex flex-wrap items-center gap-2.5 font-read text-[17px] leading-relaxed">
              <span className="text-ink-3 line-through decoration-wrong decoration-2">
                {correction.original}
              </span>
              <span className="hl font-750 text-pen-dark" style={CORRECT_INK}>
                {correction.corrected}
              </span>
            </div>
            <p className="mt-1.5 text-sm text-ink-2">{correction.explanation}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
