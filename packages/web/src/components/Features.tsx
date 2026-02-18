import { Zap, Shield, Layers, Code2, Container, HardDrive } from 'lucide-react';
import { StickyFeatures } from './special/StickyFeatures';

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
  return (
    <StickyFeatures
      features={features}
      eyebrow="Features"
      heading="Everything you need. Nothing you don't."
      description="A complete solution — from URL rewriting in the browser to persistent storage on the edge. Every layer is independently replaceable."
    />
  );
}
