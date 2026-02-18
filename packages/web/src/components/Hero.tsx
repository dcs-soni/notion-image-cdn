import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const EASE = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  return (
    <section
      ref={ref}
      className="w-full min-h-[90vh] flex flex-col justify-center pt-20 pb-24 relative overflow-hidden"
    >
      {/* Subtle vertical grid lines — decorative */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        {[20, 40, 60, 80].map((pos) => (
          <div
            key={pos}
            className="absolute top-0 w-px h-full"
            style={{
              left: `${pos}%`,
              background:
                'linear-gradient(to bottom, transparent 5%, var(--micro-border) 40%, var(--micro-border) 60%, transparent 95%)',
            }}
          />
        ))}
      </div>

      <div className="w-full max-w-7xl mx-auto px-6 lg:px-8 relative">
        {/* 12-column hero grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left — heading + subtitle + stats */}
          <div className="lg:col-span-6 xl:col-span-7">
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="mb-7"
            >
              <span className="font-mono text-xs tracking-[0.3em] uppercase text-muted-foreground">
                Open Source · MIT License
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, scale: 0.98 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.7, ease: EASE, delay: 0.25 }}
              className="font-serif text-[clamp(3rem,7vw,5.5rem)] leading-[1.05] tracking-tighter text-foreground mb-6"
            >
              Permanent URLs
              <br />
              for Notion
              <br />
              <span className="text-cobalt">Images.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="font-sans text-base md:text-lg text-muted-foreground leading-relaxed max-w-lg mb-10"
            >
              A lightweight proxy that fetches, optimizes, caches, and serves Notion images behind
              stable CDN URLs — paired with a zero-dependency SDK.
            </motion.p>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex gap-10 md:gap-14"
            >
              {[
                { value: '3-Tier', label: 'Cache' },
                { value: '0-dep', label: 'SDK' },
                { value: '< 5ms', label: 'L2 Latency' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="font-mono text-xl md:text-2xl text-foreground tabular-nums">
                    {stat.value}
                  </div>
                  <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mt-1">
                    {stat.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right — URL transformation demo */}
          <div className="lg:col-span-6 xl:col-span-5">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.7, ease: EASE, delay: 0.5 }}
              className="border border-white/[0.08] bg-white/[0.02] p-6"
            >
              {/* Before */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-1.5 h-1.5 bg-red-500/80 shrink-0" />
                <span className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground">
                  Before — Expires in ~1 hour
                </span>
              </div>
              <code className="font-mono text-xs text-red-400/70 break-all leading-relaxed block mb-6">
                https://prod-files-secure.s3.us-west-2.amazonaws.com/abc/def/photo.jpg?X-Amz-Credential=...&X-Amz-Expires=3600
              </code>

              {/* Divider */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <motion.div
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="font-mono text-[11px] text-cobalt tracking-wider"
                >
                  ↓ notion-image-cdn
                </motion.div>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>

              {/* After */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-1.5 h-1.5 bg-emerald-500/80 shrink-0" />
                <span className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground">
                  After — Never expires
                </span>
              </div>
              <code className="font-mono text-xs text-emerald-400/70 break-all leading-relaxed block">
                https://cdn.example.com/img/abc/def/photo.jpg?w=800&fmt=webp&q=85
              </code>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 1 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-px h-10 bg-gradient-to-b from-muted-foreground/40 to-transparent"
        />
      </motion.div>
    </section>
  );
}
