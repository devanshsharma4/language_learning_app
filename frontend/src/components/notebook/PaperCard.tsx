import type { ReactNode } from 'react';

interface PaperCardProps {
  children: ReactNode;
  className?: string;
}

/**
 * A sheet of paper lifted off the page. Corners are nearly square — paper does
 * not have a 16px radius, and rounding it was what made the old design read as
 * a stack of identical SaaS cards.
 */
export function PaperCard({ children, className = '' }: PaperCardProps) {
  return (
    <div className={`relative rounded-sm bg-white shadow-paper ${className}`}>{children}</div>
  );
}
