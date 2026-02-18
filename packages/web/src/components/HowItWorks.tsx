import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const steps = [
  {
    num: '01',
    title: 'SDK Rewrites',
    desc: 'The SDK detects Notion S3 URLs and rewrites them to permanent CDN paths. Pure string manipulation — zero runtime dependencies.',
    code: `import { getOptimizedUrl } from 'notion-image-cdn';

const cdnUrl = getOptimizedUrl(notionUrl, {
  cdnBaseUrl: 'https://cdn.example.com',
  width: 800,
  format: 'webp',
});`,
  },
  {
    num: '02',
    title: 'Proxy Fetches',
    desc: "On cache miss, the service fetches the image from Notion's S3, validates the domain, blocks SSRF, and enforces HTTPS.",
    code: `GET /img/:workspaceId/:blockId/:filename
  → Validate domain allowlist
  → SSRF protection (block private IPs)
  → Fetch from Notion S3`,
  },
  {
    num: '03',
    title: 'Sharp Optimizes',
    desc: 'Images are resized, converted to modern formats (WebP/AVIF), and compressed — all via Sharp, in a single pipeline pass.',
    code: `// Transform pipeline
sharp(buffer)
  .resize({ width: 800, fit: 'inside' })
  .webp({ quality: 85 })
  .toBuffer();`,
  },
  {
    num: '04',
    title: 'Cache Stores',
    desc: 'Optimized images land in 3 cache tiers: L1 browser headers, L2 Redis edge cache (24hr TTL), L3 persistent storage (forever).',
    code: `L1 → Browser    Cache-Control: max-age=3600
L2 → Redis       TTL: 24 hours  ~1-5ms
L3 → S3/R2/FS    TTL: ∞         ~10-50ms`,
  },
];

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="how-it-works" ref={ref} className="w-full py-24 lg:py-32">
      <div className="w-full max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section header — full width two-column */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16 lg:mb-20">
          <div className="lg:col-span-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-cobalt mb-5 block">
                How It Works
              </span>
              <h2 className="font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.1] tracking-tighter text-foreground">
                Four steps from expiring to eternal.
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
              A four-stage pipeline that intercepts Notion image requests, optimizes them, and
              serves them from a permanent CDN URL — with zero changes to your Notion workspace.
            </motion.p>
          </div>
        </div>

        {/* Steps — each is a full-width 12-col row */}
        <div className="space-y-0 border-t border-white/[0.06]">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.99 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.15 + i * 0.1 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 py-8 lg:py-10 border-b border-white/[0.06] group"
            >
              {/* Step number */}
              <div className="lg:col-span-1 flex items-start">
                <span className="font-mono text-xs text-muted-foreground/50 group-hover:text-cobalt transition-colors duration-300 pt-0.5">
                  {step.num}
                </span>
              </div>

              {/* Title + description */}
              <div className="lg:col-span-4">
                <h3 className="font-sans text-sm font-semibold text-foreground mb-3 tracking-tight leading-snug">
                  {step.title}
                </h3>
                <p className="font-sans text-sm text-muted-foreground leading-relaxed">
                  {step.desc}
                </p>
              </div>

              {/* Code block */}
              <div className="lg:col-span-7">
                <pre className="border border-white/[0.06] bg-white/[0.02] p-4 lg:p-5 overflow-x-auto custom-scrollbar rounded-none">
                  <code className="font-mono text-xs text-muted-foreground leading-relaxed whitespace-pre">
                    {step.code}
                  </code>
                </pre>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
