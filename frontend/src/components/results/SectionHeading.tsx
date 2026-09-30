interface SectionHeadingProps {
  heading: string;
  /**
   * The one-line summary that sits on the heading's baseline — "7 right · 2 to
   * review", "avg 6.5/10". It answers the question the heading raises before
   * you read a single card, so it is data rather than a label.
   */
  aside?: string;
}

export default function SectionHeading({ heading, aside }: SectionHeadingProps) {
  return (
    <div className="mb-6 flex items-baseline justify-between gap-4">
      <h2 className="m-0 font-display text-[30px] font-bold tracking-[-0.3px]">{heading}</h2>
      {aside && <span className="mono flex-shrink-0 text-[13px] text-ink-3">{aside}</span>}
    </div>
  );
}
