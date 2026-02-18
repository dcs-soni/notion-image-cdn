import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useMagnetic } from '../../hooks/useMagnetic';

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  /** Pull strength 0–1. Default 0.3 */
  strength?: number;
  /** Activation radius in px. Default 120 */
  radius?: number;
}

/**
 * Wraps any element with a magnetic pull effect.
 * The element subtly gravitates toward the cursor when it's within radius.
 */
export function MagneticButton({
  children,
  className = '',
  strength = 0.3,
  radius = 120,
}: MagneticButtonProps) {
  const { ref, x, y } = useMagnetic<HTMLDivElement>({ strength, radius });

  return (
    <motion.div ref={ref} style={{ x, y }} className={`inline-block ${className}`}>
      {children}
    </motion.div>
  );
}
