import { motion } from 'framer-motion';
import { useParallax } from '../../hooks/useParallax';

interface ParallaxTextProps {
  /** Large background keyword to render */
  text: string;
  /** Speed multiplier, negative = opposite scroll. Default -0.15 */
  speed?: number;
  className?: string;
}

/**
 * Renders a large, low-opacity background text that moves at a different
 * speed than the foreground on scroll for a parallax depth effect.
 */
export function ParallaxText({ text, speed = -0.15, className = '' }: ParallaxTextProps) {
  const { ref, y } = useParallax({ speed });

  return (
    <div
      ref={ref}
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      aria-hidden
    >
      <motion.span
        style={{ y }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-serif text-[clamp(8rem,20vw,18rem)] leading-none tracking-tighter text-foreground/[0.02] whitespace-nowrap select-none"
      >
        {text}
      </motion.span>
    </div>
  );
}
