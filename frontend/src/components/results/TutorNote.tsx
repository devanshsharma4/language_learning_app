import { Tape } from '../notebook';

/**
 * The overall feedback, written on a slip and taped to the page.
 *
 * It is the one piece of prose on a screen otherwise made of scores, so it gets
 * its own colour and the only rotation on the page. Everything around it is
 * square to the grid, which is what makes this read as something a person added
 * afterwards rather than another generated panel.
 */
export default function TutorNote({ children }: { children: string }) {
  return (
    <div className="relative w-full max-w-[380px] rotate-[-1.4deg] bg-[#DCEAFF] px-7 pb-7 pt-6 shadow-card">
      <Tape tone="sand" className="-top-3 left-1/2 -ml-12" rotate={3} width={96} />
      <p className="mono mb-2.5 text-xs font-bold text-pen-dark">note from your tutor</p>
      <p className="m-0 text-[15px] leading-relaxed text-ink">{children}</p>
    </div>
  );
}
