import { type ReactNode } from 'react';

interface GlintCardProps {
  children: ReactNode;
  className?: string;
}

/**
 * Card wrapper with a periodic metallic shimmer that sweeps across the border.
 * Uses CSS pseudo-element with conic-gradient mask rotating via @keyframes.
 */
export function GlintCard({ children, className = '' }: GlintCardProps) {
  return (
    <div className={`glint-card relative ${className}`}>
      {/* Shimmer border layer */}
      <div className="glint-border absolute inset-0 pointer-events-none" aria-hidden />
      {/* Content */}
      <div className="relative">{children}</div>
    </div>
  );
}
