import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { ParallaxText } from './special/ParallaxText';
import { GlintCard } from './special/GlintCard';

const tiers = [
  {
    name: 'L1',
    label: 'Browser',
    mechanism: 'Cache-Control Headers',
    ttl: '1 hour',
    latency: '0ms',
    scope: 'Per-user',
    color: 'bg-emerald-500',
    bar: 'w-1/3',
  },
  {
    name: 'L2',
    label: 'Edge / Redis',
    mechanism: 'Redis / In-Memory',
    ttl: '24 hours',
    latency: '~1–5ms',
    scope: 'Shared',
    color: 'bg-amber-500',
    bar: 'w-2/3',
  },
  {
    name: 'L3',
    label: 'Persistent',
    mechanism: 'S3 / R2 / Filesystem',
    ttl: '∞',
    latency: '~10–50ms',
    scope: 'Durable',
    color: 'bg-cobalt',
    bar: 'w-full',
  },
];

const flowSteps = [
  'Request',
  'L1 Check',
  'L2 Check',
  'L3 Check',
  'Origin',
  'Optimize',
  'Store + Serve',
];

export function Architecture() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="architecture" ref={ref} className="w-full py-24 lg:py-32 relative">
      <ParallaxText text="CACHE" speed={-0.12} />
      <div className="w-full max-w-7xl mx-auto px-6 lg:px-8 relative">
        {/* Section header — two-column */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16 lg:mb-20">
          <div className="lg:col-span-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-cobalt mb-5 block">
                Architecture
              </span>
              <h2 className="font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.1] tracking-tighter text-foreground">
                Multi-tier caching. Zero single points of failure.
              </h2>
            </motion.div>
          </div>
          <div className="lg:col-span-8 flex items-end">
            <motion.p
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="font-sans text-sm text-muted-foreground leading-relaxed max-w-xl"
            >
              Three independent cache layers ensure images are always served from the fastest
              available source. Each tier has a different TTL, latency profile, and scope.
            </motion.p>
          </div>
        </div>

        {/* Cache tier cards — 3 columns filling full width */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-px mb-12"
          style={{ backgroundColor: 'var(--micro-border)' }}
        >
          {tiers.map((tier, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.12 }}
              className="bg-background p-8 group"
            >
              <GlintCard>
                {/* Tier header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-2 h-2 shrink-0 ${tier.color}`} />
                  <span className="font-mono text-xs tracking-wider text-muted-foreground">
                    {tier.name}
                  </span>
                  <span className="font-sans text-sm text-foreground font-medium">
                    {tier.label}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-px bg-white/[0.06] mb-6 overflow-hidden">
                  <motion.div
                    className={`h-full ${tier.color} opacity-60`}
                    initial={{ width: 0 }}
                    animate={
                      isInView
                        ? {
                            width: tier.bar
                              .replace('w-', '')
                              .replace('full', '100%')
                              .replace('2/3', '66%')
                              .replace('1/3', '33%'),
                          }
                        : { width: 0 }
                    }
                    transition={{ duration: 0.8, delay: 0.5 + i * 0.15, ease: [0.16, 1, 0.3, 1] }}
                    style={{ width: isInView ? (i === 0 ? '33%' : i === 1 ? '66%' : '100%') : 0 }}
                  />
                </div>

                {/* Details */}
                <div className="space-y-4">
                  <div>
                    <div className="font-mono text-[10px] tracking-wider uppercase text-muted-foreground/60 mb-1">
                      Mechanism
                    </div>
                    <div className="font-sans text-sm text-foreground/80">{tier.mechanism}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="font-mono text-[10px] tracking-wider uppercase text-muted-foreground/60 mb-1">
                        TTL
                      </div>
                      <div className="font-mono text-xl text-foreground">{tier.ttl}</div>
                    </div>
                    <div>
                      <div className="font-mono text-[10px] tracking-wider uppercase text-muted-foreground/60 mb-1">
                        Latency
                      </div>
                      <div className="font-mono text-xl text-foreground">{tier.latency}</div>
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] tracking-wider uppercase text-muted-foreground/60 mb-1">
                      Scope
                    </div>
                    <div className="font-sans text-sm text-foreground/80">{tier.scope}</div>
                  </div>
                </div>
              </GlintCard>
            </motion.div>
          ))}
        </div>

        {/* Request flow — full width */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="flex items-center flex-wrap gap-2"
        >
          {flowSteps.map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="font-mono text-[11px] tracking-wider text-muted-foreground hover:text-foreground transition-colors duration-200 px-3 py-1.5 border border-white/[0.06] cursor-default">
                {step}
              </span>
              {i < flowSteps.length - 1 && (
                <span className="text-muted-foreground/30 text-xs">→</span>
              )}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
