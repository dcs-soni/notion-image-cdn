import { useEffect, useState, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

function getIsTouch() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

/**
 * Context-aware custom cursor.
 * - Default: 12px ring following the cursor with spring physics
 * - On [data-cursor="view"] elements: expands to 64px with "View" label
 * - Hidden on touch devices (pointer: coarse)
 */
export function CustomCursor() {
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const springX = useSpring(cursorX, { damping: 25, stiffness: 250 });
  const springY = useSpring(cursorY, { damping: 25, stiffness: 250 });

  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isTouch, setIsTouch] = useState(getIsTouch);
  const raf = useRef(0);

  useEffect(() => {
    // Track changes to pointer type
    const mq = window.matchMedia('(pointer: coarse)');
    const onChange = (e: MediaQueryListEvent) => setIsTouch(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (isTouch) return;

    const move = (e: MouseEvent) => {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        cursorX.set(e.clientX);
        cursorY.set(e.clientY);
        if (!visible) setVisible(true);
      });
    };

    const enter = () => setVisible(true);
    const leave = () => setVisible(false);

    window.addEventListener('mousemove', move, { passive: true });
    document.addEventListener('mouseenter', enter);
    document.addEventListener('mouseleave', leave);

    return () => {
      window.removeEventListener('mousemove', move);
      document.removeEventListener('mouseenter', enter);
      document.removeEventListener('mouseleave', leave);
      cancelAnimationFrame(raf.current);
    };
  }, [isTouch, cursorX, cursorY, visible]);

  // Watch for [data-cursor] hover zones
  useEffect(() => {
    if (isTouch) return;

    const onOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('[data-cursor]');
      setHovered(!!target);
    };

    document.addEventListener('mouseover', onOver);
    return () => document.removeEventListener('mouseover', onOver);
  }, [isTouch]);

  if (isTouch) return null;

  const size = hovered ? 64 : 12;

  return (
    <motion.div
      className="fixed top-0 left-0 pointer-events-none z-[9999] mix-blend-difference flex items-center justify-center"
      style={{
        x: springX,
        y: springY,
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
      }}
      animate={{
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        opacity: visible ? 1 : 0,
      }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
    >
      <div
        className="w-full h-full rounded-full border border-white/80 flex items-center justify-center transition-all duration-200"
        style={{ background: hovered ? 'rgba(255,255,255,0.1)' : 'transparent' }}
      >
        {hovered && (
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-[9px] font-mono tracking-wider uppercase text-white"
          >
            View
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}
