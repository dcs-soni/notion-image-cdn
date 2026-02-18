import { useRef } from 'react';
import { useScroll, useTransform, type MotionValue } from 'framer-motion';

interface ParallaxOptions {
  /** Speed multiplier. Negative = opposite direction. Default -0.15 */
  speed?: number;
}

/**
 * Returns a parallax-transformed Y value driven by scroll position.
 * Attach the returned `y` to a motion element's style.
 */
export function useParallax(options: ParallaxOptions = {}): {
  ref: React.RefObject<HTMLDivElement | null>;
  y: MotionValue<number>;
  progress: MotionValue<number>;
} {
  const { speed = -0.15 } = options;
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], [speed * 200, -speed * 200]);

  return { ref, y, progress: scrollYProgress };
}
