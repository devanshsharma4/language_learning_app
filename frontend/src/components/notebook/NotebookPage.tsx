import type { ReactNode } from 'react';

interface NotebookPageProps {
  children: ReactNode;
  /**
   * The red margin line runs the height of the page at x=150px, inside the
   * centered content column. Screens with no left margin rail (the welcome
   * page, 404) switch it off.
   */
  marginLine?: boolean;
  className?: string;
}

/**
 * The page ground for every screen: paper, a 24px grid, and the red margin
 * line. Replaces the grain overlay and blurred circles that were duplicated
 * across six page files in the old design.
 *
 * The margin line is positioned inside the centered 1440px column rather than
 * against the viewport, so it stays locked to the content on wide displays
 * instead of drifting left.
 */
export default function NotebookPage({
  children,
  marginLine = true,
  className = '',
}: NotebookPageProps) {
  return (
    <div className={`notebook-grid min-h-screen ${className}`}>
      <div className="relative mx-auto max-w-[1440px]">
        {marginLine && (
          <div
            aria-hidden="true"
            className="absolute bottom-0 left-[150px] top-[72px] hidden w-[2px] bg-margin xl:block"
          />
        )}
        {children}
      </div>
    </div>
  );
}
