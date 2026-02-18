import { type ReactNode } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { useMousePosition } from '../../hooks/useMousePosition';

interface GlassmorphismPanelProps {
  children: ReactNode;
  className?: string;
  /** Max px shift on each axis. Default 15 */
  intensity?: number;
}

/**
 * A glassmorphism container that subtly parallaxes with mouse movement.
 * Applies backdrop-blur, semi-transparent bg, and an inner glow border.
 */
export function GlassmorphismPanel({
  children,
  className = '',
  intensity = 15,
}: GlassmorphismPanelProps) {
  const { x: mouseX, y: mouseY } = useMousePosition();

  const smoothX = useSpring(useTransform(mouseX, [-1, 1], [-intensity, intensity]), {
    damping: 30,
    stiffness: 100,
  });
  const smoothY = useSpring(useTransform(mouseY, [-1, 1], [-intensity, intensity]), {
    damping: 30,
    stiffness: 100,
  });

  return (
    <motion.div
      style={{ x: smoothX, y: smoothY }}
      className={`relative backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] ${className}`}
    >
      {children}
    </motion.div>
  );
}
