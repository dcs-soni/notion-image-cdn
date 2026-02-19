import { useEffect, useRef } from 'react';
import { useMotionValue } from 'framer-motion';

// Returns normalized mouse coordinates relative to viewport center.
//x, y range: [-1, 1] where (0,0) is center of viewport.
//  Throttled to rAF for 60fps performance.

export function useMousePosition() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const raf = useRef(0);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        x.set((e.clientX / window.innerWidth) * 2 - 1);
        y.set((e.clientY / window.innerHeight) * 2 - 1);
      });
    };

    window.addEventListener('mousemove', handler, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handler);
      cancelAnimationFrame(raf.current);
    };
  }, [x, y]);

  return { x, y };
}
