import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { ImageOff, Clock, AlertTriangle } from 'lucide-react';
import { ParallaxText } from './special/ParallaxText';

const problems = [
  {
    icon: <Clock size={18} />,
    title: 'URLs Expire in ~1 Hour',
    desc: 'Notion signs S3 URLs with a short-lived token. Every image link is a ticking clock.',
  },
  {
    icon: <ImageOff size={18} />,
    title: 'Broken Blog Images',
    desc: "ISR pages cache HTML for hours, but Notion's image URLs die in 60 minutes. Result: broken images everywhere.",
  },
  {
    icon: <AlertTriangle size={18} />,
    title: 'No Native Solution',
    desc: "Notion offers no public CDN, no permanent links, no webhook for URL rotation. You're on your own.",
  },
];

export function ProblemSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} className="w-full py-24 lg:py-32 relative">
      <ParallaxText text="BROKEN" speed={-0.1} />
      <div className="w-full max-w-7xl mx-auto px-6 lg:px-8 relative">
        {/* Two-column layout: heading left, cards right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Left — sticky heading column */}
          <div className="lg:col-span-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-cobalt mb-5 block">
                The Problem
              </span>
              <h2 className="font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.1] tracking-tighter text-foreground">
                Notion images break. Every single hour.
              </h2>
              <p className="mt-4 font-sans text-sm text-muted-foreground leading-relaxed">
                The root cause is architectural — Notion's S3 signed URLs have a 1-hour TTL baked
                in. There's no workaround without a proxy.
              </p>
            </motion.div>
          </div>

          {/* Right — problem cards */}
          <div
            className="lg:col-span-8 flex flex-col gap-px"
            style={{ backgroundColor: 'var(--micro-border)' }}
          >
            {problems.map((problem, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                className="bg-background p-7 lg:p-8 group flex gap-5"
              >
                <div className="text-muted-foreground group-hover:text-cobalt transition-colors duration-300 mt-0.5 shrink-0">
                  {problem.icon}
                </div>
                <div>
                  <h3 className="font-sans text-sm font-semibold text-foreground mb-2 tracking-tight">
                    {problem.title}
                  </h3>
                  <p className="font-sans text-sm text-muted-foreground leading-relaxed">
                    {problem.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
