import { useRef, useState } from 'react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { type ReactNode } from 'react';

interface FeatureItem {
  icon: ReactNode;
  title: string;
  desc: string;
  detail: string;
}

interface StickyFeaturesProps {
  features: FeatureItem[];
  /** Section eyebrow text */
  eyebrow?: string;
  /** Section heading */
  heading?: string;
  /** Section description */
  description?: string;
}

/**
 * Sticky-left, scroll-right feature layout.
 * Left column (heading + feature nav) stays fixed.
 * Right column scrolls through feature content with cross-fade.
 * Falls back to standard grid on mobile.
 */
export function StickyFeatures({
  features,
  eyebrow = 'Features',
  heading = "Everything you need. Nothing you don't.",
  description = 'A complete solution — from URL rewriting in the browser to persistent storage on the edge.',
}: StickyFeaturesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    const idx = Math.min(features.length - 1, Math.floor(latest * features.length));
    setActiveIndex(idx);
  });

  return (
    <section id="features" className="w-full">
      {/* Mobile: standard grid (hidden on lg+) */}
      <div className="lg:hidden py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-cobalt mb-5 block">
            {eyebrow}
          </span>
          <h2 className="font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.1] tracking-tighter text-foreground mb-8">
            {heading}
          </h2>
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-px"
            style={{ backgroundColor: 'var(--micro-border)' }}
          >
            {features.map((feature, i) => (
              <div key={i} className="bg-background p-8">
                <div className="text-muted-foreground mb-4">{feature.icon}</div>
                <h3 className="font-sans text-sm font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="font-sans text-sm text-muted-foreground leading-relaxed mb-3">
                  {feature.desc}
                </p>
                <span className="font-mono text-[11px] text-muted-foreground/50">
                  {feature.detail}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop: sticky-left layout */}
      <div
        ref={containerRef}
        className="hidden lg:block relative"
        style={{ height: `${features.length * 100}vh` }}
      >
        <div className="sticky top-0 h-screen flex">
          <div className="w-full max-w-7xl mx-auto px-8 grid grid-cols-12 gap-16 items-center">
            {/* Left sticky column */}
            <div className="col-span-4">
              <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-cobalt mb-5 block">
                {eyebrow}
              </span>
              <h2 className="font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.1] tracking-tighter text-foreground mb-6">
                {heading}
              </h2>
              <p className="font-sans text-sm text-muted-foreground leading-relaxed mb-10">
                {description}
              </p>

              {/* Feature nav */}
              <nav className="space-y-1">
                {features.map((feature, i) => (
                  <button
                    key={i}
                    className={`w-full text-left px-4 py-3 font-sans text-sm transition-all duration-300 flex items-center gap-3 ${
                      activeIndex === i
                        ? 'text-foreground bg-white/[0.04] border-l-2 border-cobalt'
                        : 'text-muted-foreground hover:text-foreground/70 border-l-2 border-transparent'
                    }`}
                  >
                    <span
                      className={`transition-colors duration-300 ${activeIndex === i ? 'text-cobalt' : ''}`}
                    >
                      {feature.icon}
                    </span>
                    {feature.title}
                  </button>
                ))}
              </nav>
            </div>

            {/* Right scrolling content */}
            <div className="col-span-8 relative h-[400px]">
              {features.map((feature, i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 flex flex-col justify-center"
                  initial={false}
                  animate={{
                    opacity: activeIndex === i ? 1 : 0,
                    y: activeIndex === i ? 0 : activeIndex > i ? -20 : 20,
                  }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  style={{ pointerEvents: activeIndex === i ? 'auto' : 'none' }}
                >
                  <div className="border border-white/[0.06] bg-white/[0.02] p-10">
                    <div className="text-cobalt mb-6">{feature.icon}</div>
                    <h3 className="font-sans text-xl font-semibold text-foreground mb-4 tracking-tight">
                      {feature.title}
                    </h3>
                    <p className="font-sans text-base text-muted-foreground leading-relaxed mb-6 max-w-lg">
                      {feature.desc}
                    </p>
                    <div className="border-t border-white/[0.06] pt-4">
                      <span className="font-mono text-xs text-muted-foreground/60 tracking-wider">
                        {feature.detail}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Progress indicator */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 flex flex-col gap-2">
                {features.map((_, i) => (
                  <div
                    key={i}
                    className={`w-px h-6 transition-all duration-300 ${
                      activeIndex === i ? 'bg-cobalt' : 'bg-white/[0.08]'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
