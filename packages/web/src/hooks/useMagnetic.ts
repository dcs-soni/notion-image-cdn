import { useRef, useEffect, type RefObject } from 'react';
import { useMotionValue, useSpring } from 'framer-motion';

interface MagneticOptions {
  /** Pull strength, 0–1. Default 0.3 */
  strength?: number;
  /** Activation radius in px. Default 120 */
  radius?: number;
  /** Spring damping. Default 20 */
  damping?: number;
  /** Spring stiffness. Default 150 */
  stiffness?: number;
}

/**
 * Makes an element subtly gravitate toward the cursor when it's nearby.
 * Returns { ref, x, y } — bind ref to the element, use x/y as motion style transforms.
 */
export function useMagnetic<T extends HTMLElement = HTMLElement>(options: MagneticOptions = {}) {
  const { strength = 0.3, radius = 120, damping = 20, stiffness = 150 } = options;

  const ref = useRef<T>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { damping, stiffness });
  const y = useSpring(rawY, { damping, stiffness });
  const raf = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handler = (e: MouseEvent) => {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < radius) {
          const pull = (1 - dist / radius) * strength;
          rawX.set(dx * pull);
          rawY.set(dy * pull);
        } else {
          rawX.set(0);
          rawY.set(0);
        }
      });
    };

    const leave = () => {
      rawX.set(0);
      rawY.set(0);
    };

    window.addEventListener('mousemove', handler, { passive: true });
    el.addEventListener('mouseleave', leave);

    return () => {
      window.removeEventListener('mousemove', handler);
      el.removeEventListener('mouseleave', leave);
      cancelAnimationFrame(raf.current);
    };
  }, [strength, radius, rawX, rawY]);

  return { ref: ref as RefObject<T>, x, y };
}
