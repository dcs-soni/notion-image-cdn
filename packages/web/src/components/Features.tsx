import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Zap, Shield, Layers, Code2, Container, HardDrive } from 'lucide-react';

const features = [
  {
    icon: <Zap size={18} />,
    title: 'Image Optimization',
    desc: 'Sharp-powered pipeline: resize, format conversion (WebP, AVIF), and quality compression in a single pass.',
    detail: 'Responsive images at a fraction of the original size.',
  },
  {
    icon: <Layers size={18} />,
    title: 'Multi-Tier Cache',
    desc: 'L1 browser headers + L2 Redis edge + L3 persistent S3/R2. Each tier serves a different latency budget.',
    detail: 'Sub-5ms response times on cache hits.',
  },
  {
    icon: <Code2 size={18} />,
    title: 'SDK + React Component',
    desc: 'Zero-dependency URL rewriter, drop-in <NotionImage /> component, and a plugin factory for markdown renderers.',
    detail: 'Works with react-markdown, MDX, and any renderer.',
  },
  {
    icon: <Shield size={18} />,
    title: 'Security First',
    desc: 'Domain allowlist, SSRF protection, HTTPS enforcement, rate limiting, content-type validation, and Helmet headers.',
    detail: 'Seven security layers before any image is served.',
  },
  {
    icon: <Container size={18} />,
    title: 'Docker Ready',
    desc: 'One-command deployment with Docker Compose. Includes Redis and optional MinIO for local S3 testing.',
    detail: 'Production-ready container configuration.',
  },
  {
    icon: <HardDrive size={18} />,
    title: 'Flexible Storage',
    desc: 'Choose filesystem, AWS S3, or Cloudflare R2 as your persistent backend. Swap with a single env var.',
    detail: 'STORAGE_BACKEND=fs | s3 | r2',
  },
];

export function Features() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="features" ref={ref} className="w-full py-24 lg:py-32">
      <div className="w-full max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section header — two-column */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16 lg:mb-20">
          <div className="lg:col-span-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-cobalt mb-5 block">
                Features
              </span>
              <h2 className="font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.1] tracking-tighter text-foreground">
                Everything you need. Nothing you don't.
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
              A complete solution — from URL rewriting in the browser to persistent storage on the
              edge. Every layer is independently replaceable.
            </motion.p>
          </div>
        </div>

        {/* Feature grid — 3 columns, full width */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px"
          style={{ backgroundColor: 'var(--micro-border)' }}
        >
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.08 }}
              className="bg-background p-8 group cursor-default"
            >
              <div className="text-muted-foreground group-hover:text-cobalt transition-colors duration-300 mb-5">
                {feature.icon}
              </div>
              <h3 className="font-sans text-sm font-semibold text-foreground mb-2 tracking-tight">
                {feature.title}
              </h3>
              <p className="font-sans text-sm text-muted-foreground leading-relaxed mb-4">
                {feature.desc}
              </p>
              <span className="font-mono text-[11px] text-muted-foreground/50 tracking-wider">
                {feature.detail}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
