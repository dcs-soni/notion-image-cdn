import { useEffect } from 'react';
import { DocLayout, type SidebarSection } from '../components/docs/DocLayout';
import { CodeBlock } from '../components/docs/CodeBlock';
import {
  Layers,
  Shield,
  Zap,
  Database,
  Globe,
  GitBranch,
  Server,
  Package,
  Monitor,
  AlertTriangle,
  CheckCircle,
  Clock,
  HardDrive,
  ArrowRight,
} from 'lucide-react';

const sections: SidebarSection[] = [
  { id: 'overview', label: 'Overview' },
  {
    id: 'components',
    label: 'Components',
    children: [
      { id: 'comp-service', label: 'Service' },
      { id: 'comp-sdk', label: 'SDK' },
      { id: 'comp-web', label: 'Web' },
    ],
  },
  {
    id: 'decisions',
    label: 'Architecture Decisions',
    children: [
      { id: 'adr-fastify', label: 'Why Fastify' },
      { id: 'adr-sharp', label: 'Why Sharp' },
      { id: 'adr-cache', label: 'Multi-Tier Cache' },
      { id: 'adr-singleflight', label: 'Singleflight Pattern' },
      { id: 'adr-ssrf', label: 'SSRF Protection' },
    ],
  },
  { id: 'request-flow', label: 'Request Flow' },
  { id: 'quickstart', label: 'Quick Start Guide' },
  {
    id: 'examples',
    label: 'Code Examples',
    children: [
      { id: 'ex-sdk', label: 'SDK Usage' },
      { id: 'ex-react', label: 'React Component' },
      { id: 'ex-markdown', label: 'Markdown Plugin' },
      { id: 'ex-curl', label: 'cURL Examples' },
    ],
  },
  { id: 'configuration', label: 'Configuration' },
  { id: 'limitations', label: 'Limitations' },
  { id: 'edge-cases', label: 'Edge Cases' },
  { id: 'performance', label: 'Performance' },
];

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    navigator.clipboard.writeText(url);
  };

  return (
    <h2
      id={id}
      className="scroll-mt-20 font-serif text-[clamp(1.5rem,3vw,2.25rem)] leading-[1.15] tracking-tight text-foreground mb-4 group cursor-pointer"
      onClick={handleCopyLink}
    >
      {children}
      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-cobalt ml-2 text-lg">
        #
      </span>
    </h2>
  );
}

function SubHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="scroll-mt-20 font-sans text-lg font-medium text-foreground/90 mb-3 mt-8">
      {children}
    </h3>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-muted-foreground leading-relaxed space-y-3">{children}</div>;
}

function InfoCard({
  icon: Icon,
  title,
  children,
  accent = 'cobalt',
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  accent?: string;
}) {
  const accentColors: Record<string, string> = {
    cobalt: 'border-cobalt/20 bg-cobalt/[0.03]',
    emerald: 'border-emerald-500/20 bg-emerald-500/[0.03]',
    amber: 'border-amber-500/20 bg-amber-500/[0.03]',
    red: 'border-red-500/20 bg-red-500/[0.03]',
    purple: 'border-purple-500/20 bg-purple-500/[0.03]',
  };
  const iconColors: Record<string, string> = {
    cobalt: 'text-cobalt',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    purple: 'text-purple-400',
  };
  return (
    <div className={`border p-5 ${accentColors[accent]}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} className={iconColors[accent]} />
        <span className="font-mono text-xs tracking-wider font-medium text-foreground/90">
          {title}
        </span>
      </div>
      <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}

function ADRCard({
  id,
  title,
  decision,
  rationale,
  alternatives,
}: {
  id: string;
  title: string;
  decision: string;
  rationale: string;
  alternatives: string;
}) {
  return (
    <div id={id} className="scroll-mt-20 border border-white/[0.06] bg-white/[0.015] p-5">
      <h4 className="font-mono text-sm font-medium text-foreground/90 mb-4">{title}</h4>
      <div className="space-y-3 text-sm">
        <div>
          <span className="font-mono text-[10px] tracking-wider text-emerald-400 uppercase block mb-1">
            Decision
          </span>
          <p className="text-muted-foreground leading-relaxed">{decision}</p>
        </div>
        <div>
          <span className="font-mono text-[10px] tracking-wider text-cobalt uppercase block mb-1">
            Rationale
          </span>
          <p className="text-muted-foreground leading-relaxed">{rationale}</p>
        </div>
        <div>
          <span className="font-mono text-[10px] tracking-wider text-amber-400 uppercase block mb-1">
            Alternatives Considered
          </span>
          <p className="text-muted-foreground/60 leading-relaxed">{alternatives}</p>
        </div>
      </div>
    </div>
  );
}

function FlowStep({
  step,
  title,
  description,
  isLast = false,
}: {
  step: number;
  title: string;
  description: string;
  isLast?: boolean;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center shrink-0">
        <div className="w-8 h-8 border border-cobalt/30 bg-cobalt/10 flex items-center justify-center">
          <span className="font-mono text-xs text-cobalt font-medium">{step}</span>
        </div>
        {!isLast && <div className="w-px flex-1 bg-white/[0.06] min-h-[24px]" />}
      </div>
      <div className="pb-6">
        <h4 className="font-mono text-sm font-medium text-foreground/90 mb-1">{title}</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

const configTable = [
  {
    category: 'Server',
    vars: [
      { name: 'PORT', type: 'number', default: '3002', desc: 'Server port', validation: '1-65535' },
      { name: 'HOST', type: 'string', default: '0.0.0.0', desc: 'Bind address', validation: '' },
      {
        name: 'LOG_LEVEL',
        type: 'enum',
        default: 'info',
        desc: 'Pino log level',
        validation: 'fatal|error|warn|info|debug|trace',
      },
      {
        name: 'NODE_ENV',
        type: 'enum',
        default: 'development',
        desc: 'Environment mode',
        validation: 'development|production|test',
      },
    ],
  },
  {
    category: 'Storage',
    vars: [
      {
        name: 'STORAGE_BACKEND',
        type: 'enum',
        default: 'fs',
        desc: 'Persistent storage backend',
        validation: 'fs|s3|r2',
      },
      {
        name: 'CACHE_DIR',
        type: 'string',
        default: './cache',
        desc: 'Local cache directory (fs backend only)',
        validation: '',
      },
      {
        name: 'S3_BUCKET',
        type: 'string',
        default: '—',
        desc: 'S3/R2 bucket name (required for s3/r2)',
        validation: '',
      },
      { name: 'S3_REGION', type: 'string', default: '—', desc: 'S3 region', validation: '' },
      {
        name: 'S3_ENDPOINT',
        type: 'url',
        default: '—',
        desc: 'Custom endpoint for R2/MinIO',
        validation: 'Valid URL',
      },
      {
        name: 'S3_ACCESS_KEY',
        type: 'string',
        default: '—',
        desc: 'S3 access key ID',
        validation: '',
      },
      {
        name: 'S3_SECRET_KEY',
        type: 'string',
        default: '—',
        desc: 'S3 secret access key',
        validation: '',
      },
    ],
  },
  {
    category: 'Cache',
    vars: [
      {
        name: 'REDIS_URL',
        type: 'string',
        default: '—',
        desc: 'Redis connection string for L2 edge cache',
        validation: '',
      },
      {
        name: 'CACHE_TTL_SECONDS',
        type: 'number',
        default: '86400',
        desc: 'L2/s-maxage TTL in seconds',
        validation: '≥ 60',
      },
    ],
  },
  {
    category: 'Security',
    vars: [
      {
        name: 'ALLOWED_DOMAINS',
        type: 'string',
        default: 'Notion S3 hosts',
        desc: 'Comma-separated upstream domain allowlist',
        validation: '',
      },
      {
        name: 'MAX_IMAGE_SIZE_BYTES',
        type: 'number',
        default: '26214400',
        desc: 'Maximum upstream image size (25 MB)',
        validation: '≥ 1024',
      },
      {
        name: 'UPSTREAM_TIMEOUT_MS',
        type: 'number',
        default: '15000',
        desc: 'Upstream fetch timeout',
        validation: '≥ 1000',
      },
      {
        name: 'RATE_LIMIT_PER_MINUTE',
        type: 'number',
        default: '100',
        desc: 'Max requests per minute per IP',
        validation: '≥ 1',
      },
      {
        name: 'API_KEYS_ENABLED',
        type: 'boolean',
        default: 'false',
        desc: 'Enable API key authentication',
        validation: '',
      },
      {
        name: 'API_KEYS',
        type: 'string',
        default: '—',
        desc: 'Comma-separated API keys (required when enabled)',
        validation: '',
      },
      {
        name: 'HMAC_SECRET',
        type: 'string',
        default: '—',
        desc: 'HMAC secret for signed URLs',
        validation: '≥ 32 chars',
      },
    ],
  },
  {
    category: 'CORS',
    vars: [
      {
        name: 'CORS_ORIGINS',
        type: 'string',
        default: '*',
        desc: 'Comma-separated allowed origins',
        validation: '',
      },
    ],
  },
];

export function ArchitecturePage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <DocLayout title="Architecture" subtitle="Documentation" sections={sections}>
      {/* ── Overview ────────────────────────── */}
      <section className="mb-16">
        <SectionHeading id="overview">Overview</SectionHeading>
        <Prose>
          <p>
            <strong className="text-foreground">notion-image-cdn</strong> solves a fundamental
            problem: Notion's image URLs expire. Every S3-signed link breaks after roughly one hour,
            causing broken blog images, failed embeds, and unreliable content.
          </p>
          <p>
            This project is a lightweight proxy service that fetches, optimizes, caches, and serves
            Notion images behind permanent, stable URLs — paired with a zero-dependency SDK that
            rewrites URLs client-side.
          </p>
        </Prose>

        {/* High-level architecture visual */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoCard icon={Package} title="SDK" accent="cobalt">
            Zero-dependency URL rewriter. Transforms expiring Notion S3 URLs into permanent CDN
            URLs. Ships React component + plugin factory.
          </InfoCard>
          <InfoCard icon={Server} title="Service" accent="emerald">
            Fastify-based proxy. Fetches from Notion S3, optimizes with Sharp, stores in multi-tier
            cache. Deployed on Render.
          </InfoCard>
          <InfoCard icon={Monitor} title="Web" accent="purple">
            Vite + React landing page with interactive documentation. Deployed on Vercel.
          </InfoCard>
        </div>

        {/* Flow diagram */}
        <div className="mt-8 border border-white/[0.06] bg-white/[0.015] p-6 overflow-x-auto">
          <div className="flex items-center gap-3 min-w-[600px] justify-center flex-wrap">
            {[
              {
                label: 'Notion S3 URL',
                sub: 'expires ~1hr',
                color: 'border-red-500/30 text-red-400',
              },
              { label: 'SDK Rewriter', sub: 'client-side', color: 'border-cobalt/30 text-cobalt' },
              {
                label: 'CDN Service',
                sub: 'fetch + optimize',
                color: 'border-emerald-500/30 text-emerald-400',
              },
              {
                label: 'Multi-Tier Cache',
                sub: 'L1 → L2 → L3',
                color: 'border-amber-500/30 text-amber-400',
              },
              {
                label: 'Permanent URL',
                sub: 'never expires',
                color: 'border-emerald-500/30 text-emerald-400',
              },
            ].map((item, i, arr) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`border ${item.color} bg-white/[0.02] px-4 py-3 text-center`}>
                  <div className="font-mono text-xs font-medium">{item.label}</div>
                  <div className="font-mono text-[10px] text-muted-foreground/50 mt-0.5">
                    {item.sub}
                  </div>
                </div>
                {i < arr.length - 1 && (
                  <ArrowRight size={14} className="text-muted-foreground/30 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mb-16">
        <SectionHeading id="components">Components</SectionHeading>

        <SubHeading id="comp-service">Service (packages/service)</SubHeading>
        <Prose>
          <p>
            The core proxy and optimization engine. A Fastify v5 server running on Bun that handles
            image proxying, transformation, and multi-tier caching.
          </p>
        </Prose>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoCard icon={Server} title="Fastify v5" accent="cobalt">
            HTTP framework with plugin-based architecture, request lifecycle hooks, schema
            validation, and built-in rate limiting.
          </InfoCard>
          <InfoCard icon={Zap} title="Sharp" accent="emerald">
            Native image processing — resize, format conversion (WebP, AVIF, PNG, JPEG), quality
            control, EXIF stripping. Runs natively via libvips.
          </InfoCard>
          <InfoCard icon={Database} title="Multi-Tier Cache" accent="amber">
            L1 (Browser via Cache-Control) → L2 (Redis/In-Memory, TTL: 24h) → L3 (Filesystem/S3/R2,
            indefinite). Each tier serves different latency/durability needs.
          </InfoCard>
          <InfoCard icon={Shield} title="Singleflight" accent="purple">
            Request coalescing prevents thundering herd. Concurrent requests for the same image
            share a single upstream fetch — only the leader fetches.
          </InfoCard>
        </div>

        <div className="mt-4">
          <CodeBlock
            label="File Structure"
            language="bash"
            code={`packages/service/src/
├── config/          # Zod-validated env config
├── cache/           # L2 edge cache (Memory, Redis)
├── storage/         # L3 persistent (Filesystem, S3/R2)
├── middleware/      # Auth, security headers, request ID
├── routes/          # proxy, image, cache, health
├── lib/             # Core pipeline: fetcher, optimizer,
│                    #   validator, singleflight, cache-key
├── types/           # TypeScript interfaces
├── server.ts        # Fastify server factory
└── index.ts         # Entry point`}
          />
        </div>

        <SubHeading id="comp-sdk">SDK (packages/sdk)</SubHeading>
        <Prose>
          <p>
            A zero-dependency TypeScript library for frontend use. Its sole job is to transform
            Notion's expiring S3 URLs into permanent CDN URLs. Ships as an NPM package with:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              <code className="font-mono text-xs text-cobalt">getOptimizedUrl()</code> — Core URL
              rewriting function
            </li>
            <li>
              <code className="font-mono text-xs text-cobalt">isNotionImageUrl()</code> — URL
              detection utility
            </li>
            <li>
              <code className="font-mono text-xs text-cobalt">createNotionImagePlugin()</code> —
              Pre-configured rewriter factory
            </li>
            <li>
              <code className="font-mono text-xs text-cobalt">{'<NotionImage />'}</code> — Drop-in
              React img replacement
            </li>
          </ul>
        </Prose>
        <div className="mt-4">
          <CodeBlock
            label="File Structure"
            language="bash"
            code={`packages/sdk/src/
├── url-rewriter.ts  # Core URL transformation logic
├── react.tsx        # <NotionImage /> component
├── types.ts         # TypeScript interfaces
└── index.ts         # Public API exports`}
          />
        </div>

        <SubHeading id="comp-web">Web (packages/web)</SubHeading>
        <Prose>
          <p>
            The project's marketing site and documentation hub. A Vite + React app with Tailwind CSS
            v4, Framer Motion animations, and custom design system (dark obsidian theme, cobalt
            accents, DM Serif Display + JetBrains Mono typography). Deployed on Vercel.
          </p>
        </Prose>
      </section>

      <section className="mb-16">
        <SectionHeading id="decisions">Architecture Decisions</SectionHeading>
        <Prose>
          <p>Key technical decisions documented in ADR format:</p>
        </Prose>
        <div className="mt-6 space-y-4">
          <ADRCard
            id="adr-fastify"
            title="ADR-001: Fastify over Express"
            decision="Use Fastify v5 as the HTTP framework."
            rationale="Fastify offers 2-3x better throughput than Express in benchmarks, has a plugin-based architecture that maps naturally to our middleware pipeline (CORS, rate limiting, auth, security headers), and provides built-in schema validation via JSON Schema. The decorator pattern (server.decorate) cleanly exposes shared resources (config, storage, edgeCache) to route handlers without global state."
            alternatives="Express (slower, middleware model less structured), Hono (newer, less ecosystem for Bun), bare http module (too low-level for production middleware)."
          />
          <ADRCard
            id="adr-sharp"
            title="ADR-002: Sharp for Image Processing"
            decision="Use Sharp (libvips) for on-the-fly image optimization."
            rationale="Sharp processes images via native C bindings to libvips — 4-10x faster than Jimp or canvas for resize/format operations. It supports WebP, AVIF, PNG, JPEG output with quality control, handles EXIF rotation automatically, and includes decompression bomb protection (limitInputPixels). Stateless pipeline: Buffer in → Buffer out."
            alternatives="Jimp (pure JS, much slower), canvas/node-canvas (heavy dependency, complex builds), Cloudflare Image Resizing (vendor lock-in, not self-hostable)."
          />
          <ADRCard
            id="adr-cache"
            title="ADR-003: Multi-Tier Caching Strategy"
            decision="Implement a 3-tier cache hierarchy: L1 (Browser) → L2 (Redis/In-Memory) → L3 (Filesystem/S3/R2)."
            rationale="Each tier optimizes for different trade-offs. L1 eliminates repeat requests without hitting our server (Cache-Control: max-age=3600). L2 provides sub-5ms shared cache across all users. L3 provides indefinite persistence that survives restarts. On L3 hit, content is promoted to L2 (fire-and-forget). Cache keys use SHA-256 of the base URL (without S3 signature) plus a variant suffix for transforms."
            alternatives="Single CDN cache (no control over eviction), Redis-only (memory-bound, expensive at scale), filesystem-only (no shared edge layer)."
          />
          <ADRCard
            id="adr-singleflight"
            title="ADR-004: Singleflight Pattern (Thundering Herd)"
            decision="Implement request coalescing via a Singleflight class."
            rationale="When a popular image is first requested, hundreds of concurrent requests could all miss the cache simultaneously and hammer the upstream Notion S3 origin. The Singleflight pattern ensures only one 'leader' request fetches from upstream — all concurrent 'followers' await the same Promise. The shared promise never rejects (errors are wrapped in settled results) to prevent cascading catch handlers. This patterns is borrowed from Go's singleflight package."
            alternatives="Mutex/lock per key (complex, still blocks), no coalescing (thundering herd on cold cache), queue-based (adds latency for first request)."
          />
          <ADRCard
            id="adr-ssrf"
            title="ADR-005: Defense-in-Depth SSRF Protection"
            decision="Multi-layered URL validation: domain allowlist → HTTPS enforcement → private IP blocking → credential detection → redirect chain validation."
            rationale="An image proxy is an SSRF vector by definition — it fetches URLs from user input. The validator uses strict 4-octet IPv4 parsing with leading-zero rejection (prevents octal interpretation like 0177.0.0.1), covers all RFC 1918/5735 ranges, blocks IPv6 loopback/link-local, rejects URLs with embedded credentials, and validates every redirect hop against the allowlist (max 5 hops). The URL constructor (not regex) is used for safe parsing."
            alternatives="Regex-only validation (bypassable), allowlist-only (misses IP-based bypasses), library-based (ssrf-guard, but adds dependency and may not cover all vectors)."
          />
        </div>
      </section>

      <section className="mb-16">
        <SectionHeading id="request-flow">Request Flow</SectionHeading>
        <Prose>
          <p>
            Step-by-step lifecycle of a proxy request from client to response. This flow is
            implemented in{' '}
            <code className="font-mono text-xs text-cobalt">lib/image-pipeline.ts</code>.
          </p>
        </Prose>
        <div className="mt-6">
          <FlowStep
            step={1}
            title="Client sends request"
            description="GET /api/v1/proxy?url=<encoded-notion-url>&w=800&fmt=webp — The SDK generates this URL by rewriting the Notion S3 URL."
          />
          <FlowStep
            step={2}
            title="Middleware pipeline"
            description="Request passes through: Request ID assignment → CORS headers → Rate limiting (100 req/min/IP) → Security headers → API key validation (if enabled)."
          />
          <FlowStep
            step={3}
            title="URL validation"
            description="The url parameter is validated: domain must be in allowlist, protocol must be HTTPS, hostname must not resolve to private IP (SSRF protection), no embedded credentials, URL length ≤ 4096 chars."
          />
          <FlowStep
            step={4}
            title="L2 edge cache check"
            description="Lookup in Redis (or in-memory fallback). Cache key is SHA-256(base URL) + variant suffix (e.g., w800_fwebp_q85). On HIT → respond immediately with X-Cache: HIT, X-Cache-Tier: L2_EDGE."
          />
          <FlowStep
            step={5}
            title="L3 persistent storage check"
            description="On L2 MISS, check filesystem/S3/R2. On HIT → promote to L2 (fire-and-forget, async) and respond with X-Cache-Tier: L3_PERSISTENT."
          />
          <FlowStep
            step={6}
            title="Singleflight coalescing"
            description="On full cache MISS, the Singleflight gate checks if another request for the same cache key is already in-flight. If so, this request becomes a 'follower' and awaits the leader's result."
          />
          <FlowStep
            step={7}
            title="Upstream fetch"
            description="Leader fetches from Notion S3 with 15s timeout, 25MB size limit, streaming with byte counting, manual redirect following (max 5 hops, each validated against allowlist). Content-Type must be image/*."
          />
          <FlowStep
            step={8}
            title="Image optimization"
            description="Sharp processes the raw image: resize (width/height with fit mode), format conversion (WebP/AVIF/PNG/JPEG with content negotiation from Accept header), quality control, auto-rotation from EXIF, metadata stripping."
          />
          <FlowStep
            step={9}
            title="Cache population"
            description="Optimized bytes are written to L3 persistent storage and L2 edge cache. Both writes are fire-and-forget (async, non-blocking) — they do not delay the response."
          />
          <FlowStep
            step={10}
            title="Response"
            description="Image bytes sent with headers: Content-Type, Cache-Control (public, max-age=3600, s-maxage=86400), X-Cache: MISS, X-Cache-Tier: ORIGIN, X-Original-Size, X-Optimized-Size."
            isLast
          />
        </div>
      </section>

      <section className="mb-16">
        <SectionHeading id="quickstart">Quick Start Guide</SectionHeading>

        <Prose>
          <p>Get the service running locally in 4 commands.</p>
        </Prose>

        <div className="mt-4 space-y-3">
          <div>
            <span className="font-mono text-[10px] tracking-wider text-muted-foreground/50 uppercase block mb-2">
              Prerequisites
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                'Bun v1+',
                'Redis (optional, for L2)',
                'S3/R2 (optional, defaults to filesystem)',
              ].map((req) => (
                <span
                  key={req}
                  className="font-mono text-[11px] text-muted-foreground/60 px-2 py-1 border border-white/[0.06]"
                >
                  {req}
                </span>
              ))}
            </div>
          </div>

          <CodeBlock
            label="Terminal"
            language="bash"
            code={`# Clone the repository
git clone https://github.com/dcs-soni/notion-image-cdn.git
cd notion-image-cdn

# Install dependencies
bun install

# Copy and edit environment config
cp .env.example .env
# Edit .env — at minimum, set ALLOWED_DOMAINS and CORS_ORIGINS

# Start the service
bun run dev`}
            showLineNumbers
          />

          <InfoCard icon={CheckCircle} title="Service Ready" accent="emerald">
            The service starts at <code className="font-mono text-xs">http://localhost:3002</code>.
            Verify with:{' '}
            <code className="font-mono text-xs">curl http://localhost:3002/health</code>
          </InfoCard>

          <div className="mt-6">
            <span className="font-mono text-[10px] tracking-wider text-muted-foreground/50 uppercase block mb-2">
              Docker Alternative
            </span>
            <CodeBlock
              language="bash"
              tabs={[
                {
                  label: 'Basic',
                  language: 'bash',
                  code: '# Filesystem cache + Redis\ndocker compose up',
                },
                {
                  label: 'With S3',
                  language: 'bash',
                  code: '# With local S3 (MinIO) for testing\ndocker compose --profile s3 up',
                },
              ]}
            />
          </div>

          <div className="mt-6">
            <span className="font-mono text-[10px] tracking-wider text-muted-foreground/50 uppercase block mb-2">
              SDK Installation
            </span>
            <CodeBlock language="bash" code="npm install notion-image-cdn" />
          </div>
        </div>
      </section>

      <section className="mb-16">
        <SectionHeading id="examples">Code Examples</SectionHeading>

        <SubHeading id="ex-sdk">SDK — Basic Usage</SubHeading>
        <CodeBlock
          language="typescript"
          showLineNumbers
          code={`import { getOptimizedUrl, isNotionImageUrl } from 'notion-image-cdn';

const notionUrl =
  'https://prod-files-secure.s3.us-west-2.amazonaws.com/abc/def/photo.jpg?X-Amz-...';

if (isNotionImageUrl(notionUrl)) {
  const cdnUrl = getOptimizedUrl(notionUrl, {
    cdnBaseUrl: 'https://notion-image-cdn.onrender.com',
    width: 800,
    format: 'webp',
    quality: 85,
  });
  // → https://notion-image-cdn.onrender.com/img/abc/def/photo.jpg?w=800&fmt=webp&q=85
}

// Non-Notion URLs pass through unchanged
const regularUrl = getOptimizedUrl('https://example.com/logo.png', {
  cdnBaseUrl: 'https://notion-image-cdn.onrender.com',
});
// → 'https://example.com/logo.png' (unchanged)`}
        />

        <SubHeading id="ex-react">React Component</SubHeading>
        <CodeBlock
          language="tsx"
          showLineNumbers
          code={`import { NotionImage } from 'notion-image-cdn/react';

function BlogPost({ coverImage }: { coverImage: string }) {
  return (
    <NotionImage
      src={coverImage}
      cdnBaseUrl="https://notion-image-cdn.onrender.com"
      alt="Blog cover"
      width={1200}
      format="webp"
      quality={85}
      loading="lazy"
      className="rounded-lg w-full"
    />
  );
}`}
        />

        <SubHeading id="ex-markdown">Markdown Plugin</SubHeading>
        <CodeBlock
          language="typescript"
          showLineNumbers
          code={`import { createNotionImagePlugin } from 'notion-image-cdn';

// Create a pre-configured rewriter
const rewrite = createNotionImagePlugin({
  cdnBaseUrl: 'https://notion-image-cdn.onrender.com',
  defaultFormat: 'webp',
  defaultQuality: 85,
  defaultWidth: 1200,
});

// Use with react-markdown, MDX, or any renderer
const components = {
  img: ({ src, alt }) => (
    <img src={rewrite(src)} alt={alt} loading="lazy" />
  ),
};

// Usage with react-markdown
<ReactMarkdown components={components}>
  {markdownContent}
</ReactMarkdown>`}
        />

        <SubHeading id="ex-curl">cURL Examples</SubHeading>
        <CodeBlock
          tabs={[
            {
              label: 'Proxy',
              language: 'bash',
              code: `# Proxy a Notion image (first request — cache miss → fetches from upstream)
curl -v "https://notion-image-cdn.onrender.com/api/v1/proxy?url=https%3A%2F%2Fprod-files-secure.s3.us-west-2.amazonaws.com%2Fabc%2Fdef%2Fphoto.jpg&w=800&fmt=webp&q=85"

# Response headers:
#   X-Cache: MISS
#   X-Cache-Tier: ORIGIN
#   X-Original-Size: 2457600
#   X-Optimized-Size: 184320`,
            },
            {
              label: 'Clean URL',
              language: 'bash',
              code: `# Fetch via clean URL (after proxying — cache hit)
curl "https://notion-image-cdn.onrender.com/img/abc/def/photo.jpg?w=800&fmt=webp"

# Response headers:
#   X-Cache: HIT
#   X-Cache-Tier: L2_EDGE`,
            },
            {
              label: 'Cache Purge',
              language: 'bash',
              code: `# Purge a specific image from all cache tiers
curl -X DELETE "https://notion-image-cdn.onrender.com/api/v1/cache?url=https%3A%2F%2Fprod-files-secure.s3.us-west-2.amazonaws.com%2Fabc%2Fdef%2Fphoto.jpg"

# Response: { "message": "Cache purged successfully" }`,
            },
            {
              label: 'Health',
              language: 'bash',
              code: `# Health check
curl "https://notion-image-cdn.onrender.com/health"

# Response:
# {
#   "status": "ok",
#   "version": "1.0.0",
#   "uptime": 3600,
#   "checks": { "storage": "ok", "cache": "ok" }
# }`,
            },
          ]}
        />
      </section>

      <section className="mb-16">
        <SectionHeading id="configuration">Configuration</SectionHeading>
        <Prose>
          <p>
            All configuration is via environment variables, validated at startup with Zod. Invalid
            config causes immediate exit with a descriptive error message.
          </p>
        </Prose>

        <div className="mt-6 space-y-6">
          {configTable.map((group) => (
            <div key={group.category}>
              <h4 className="font-mono text-xs tracking-wider text-cobalt uppercase mb-3">
                {group.category}
              </h4>
              <div className="border border-white/[0.06] overflow-hidden">
                <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 bg-white/[0.02] border-b border-white/[0.06]">
                  <div className="col-span-3 font-mono text-[10px] text-muted-foreground/50 uppercase">
                    Variable
                  </div>
                  <div className="col-span-1 font-mono text-[10px] text-muted-foreground/50 uppercase">
                    Type
                  </div>
                  <div className="col-span-2 font-mono text-[10px] text-muted-foreground/50 uppercase">
                    Default
                  </div>
                  <div className="col-span-4 font-mono text-[10px] text-muted-foreground/50 uppercase">
                    Description
                  </div>
                  <div className="col-span-2 font-mono text-[10px] text-muted-foreground/50 uppercase">
                    Validation
                  </div>
                </div>
                {group.vars.map((v, i) => (
                  <div
                    key={v.name}
                    className={`px-4 py-2.5 ${i < group.vars.length - 1 ? 'border-b border-white/[0.04]' : ''}`}
                  >
                    <div className="hidden md:grid grid-cols-12 gap-2 items-start">
                      <code className="col-span-3 font-mono text-[12px] text-foreground/80">
                        {v.name}
                      </code>
                      <span className="col-span-1 font-mono text-[10px] text-amber-400/70">
                        {v.type}
                      </span>
                      <code className="col-span-2 font-mono text-[11px] text-muted-foreground/50">
                        {v.default}
                      </code>
                      <span className="col-span-4 text-[12px] text-muted-foreground">{v.desc}</span>
                      <span className="col-span-2 font-mono text-[10px] text-muted-foreground/40">
                        {v.validation || '—'}
                      </span>
                    </div>
                    <div className="md:hidden">
                      <code className="font-mono text-[12px] text-foreground/80 block mb-1">
                        {v.name}
                      </code>
                      <span className="text-[12px] text-muted-foreground">{v.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-16">
        <SectionHeading id="limitations">Limitations</SectionHeading>
        <div className="space-y-3">
          {[
            {
              severity: 'medium',
              title: 'No GIF Animation Support',
              desc: 'Sharp converts animated GIFs to static images. The first frame is extracted. Consider serving GIFs without format conversion.',
            },
            {
              severity: 'medium',
              title: 'Sharp Memory Constraints',
              desc: 'Image processing is memory-intensive. A 25MB JPEG can inflate to ~300MB in memory during processing. The limitInputPixels setting (268M pixels) prevents decompression bombs.',
            },
            {
              severity: 'low',
              title: 'Single-Region Design',
              desc: 'The service runs in a single region. For global deployments, deploy multiple instances behind a global load balancer or use Cloudflare R2 (which has global replication).',
            },
            {
              severity: 'low',
              title: 'No WebSocket Support',
              desc: 'The service is request/response only. No real-time cache invalidation or push notifications. Use webhook-based cache purging instead.',
            },
            {
              severity: 'info',
              title: 'Max Image Size: 25MB',
              desc: 'Upstream images exceeding MAX_IMAGE_SIZE_BYTES (default 25MB) are rejected during streaming — partial downloads are discarded. This is enforced both via Content-Length header and actual byte counting.',
            },
            {
              severity: 'info',
              title: 'Notion URL Formats',
              desc: 'The SDK recognizes 4 Notion URL formats: prod-files-secure.s3, s3.us-west-2, file.notion.so, and img.notionusercontent.com. Other Notion URL formats may not be recognized.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="border border-white/[0.06] bg-white/[0.015] p-4 flex items-start gap-3"
            >
              <div className="shrink-0 mt-0.5">
                {item.severity === 'medium' ? (
                  <AlertTriangle size={14} className="text-amber-400" />
                ) : item.severity === 'low' ? (
                  <Globe size={14} className="text-muted-foreground/50" />
                ) : (
                  <Layers size={14} className="text-cobalt/60" />
                )}
              </div>
              <div>
                <span className="font-mono text-xs font-medium text-foreground/90 block mb-1">
                  {item.title}
                  <span
                    className={`ml-2 font-mono text-[9px] px-1.5 py-0.5 ${
                      item.severity === 'medium'
                        ? 'bg-amber-500/10 text-amber-400'
                        : item.severity === 'low'
                          ? 'bg-white/[0.04] text-muted-foreground/50'
                          : 'bg-cobalt/10 text-cobalt/60'
                    }`}
                  >
                    {item.severity}
                  </span>
                </span>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-16">
        <SectionHeading id="edge-cases">Edge Cases</SectionHeading>
        <div className="space-y-3">
          {[
            {
              problem: 'Expired Notion S3 URL',
              behavior: 'Upstream returns 403 Forbidden.',
              resolution:
                'The /img/ clean URL route returns 404 IMAGE_NOT_CACHED with a message guiding the caller to re-proxy via /api/v1/proxy. The proxy route forwards the 403 as 502 UPSTREAM_ERROR.',
            },
            {
              problem: 'Concurrent Duplicate Requests (Cold Cache)',
              behavior: 'Multiple requests for the same uncached image arrive simultaneously.',
              resolution:
                'Singleflight coalesces them — only one upstream fetch occurs. Followers receive the same result with X-Cache-Tier: L2_EDGE (coalesced). The shared promise uses settled results to prevent error cascading.',
            },
            {
              problem: 'Oversized Image (> 25MB)',
              behavior: 'Image exceeds MAX_IMAGE_SIZE_BYTES during streaming transfer.',
              resolution:
                'The reader is cancelled mid-stream after the byte limit is reached. Returns 413 IMAGE_TOO_LARGE. The check is performed both on Content-Length header and actual transferred bytes.',
            },
            {
              problem: 'Non-Image Content Type',
              behavior: 'Upstream returns Content-Type that is not image/*.',
              resolution:
                'Returns 400 INVALID_CONTENT_TYPE. This prevents serving HTML/JS that could be used for XSS if the proxy is on a trusted domain.',
            },
            {
              problem: 'Redirect Chain',
              behavior: 'Upstream issues multiple 3xx redirects.',
              resolution:
                'Follows up to 5 redirects. Each redirect URL is validated against the domain allowlist and SSRF checks. Exceeding 5 hops returns 502 TOO_MANY_REDIRECTS.',
            },
            {
              problem: 'SSRF Attempt (Private IP)',
              behavior:
                'Attacker passes a URL pointing to localhost, 169.254.169.254 (cloud metadata), or an internal IP.',
              resolution:
                'The validator parses the hostname via URL constructor, then checks against all RFC 1918/5735 private ranges using numeric IPv4 parsing. Blocks localhost, .local, .internal, IPv6 loopback (::1), unique-local (fc00::/7), link-local (fe80::/10), and IPv4-mapped IPv6 (::ffff:127.0.0.1).',
            },
            {
              problem: 'Malformed URL',
              behavior: 'URL parameter fails URL constructor parsing.',
              resolution:
                'Returns 403 INVALID_URL immediately, before any network request is made.',
            },
            {
              problem: 'Sharp Optimization Failure',
              behavior: 'Image cannot be processed (corrupt, unsupported format).',
              resolution:
                'Optimization failure is caught — the original unoptimized image is served instead. A warning is logged but the request succeeds.',
            },
          ].map((item) => (
            <div key={item.problem} className="border border-white/[0.06] bg-white/[0.015] p-5">
              <h4 className="font-mono text-xs font-medium text-foreground/90 mb-3">
                {item.problem}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-mono text-[10px] tracking-wider text-amber-400 uppercase block mb-1">
                    Behavior
                  </span>
                  <p className="text-muted-foreground leading-relaxed">{item.behavior}</p>
                </div>
                <div>
                  <span className="font-mono text-[10px] tracking-wider text-emerald-400 uppercase block mb-1">
                    Resolution
                  </span>
                  <p className="text-muted-foreground leading-relaxed">{item.resolution}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-16">
        <SectionHeading id="performance">Performance Considerations</SectionHeading>

        <Prose>
          <p>Key performance characteristics and optimization decisions:</p>
        </Prose>

        {/* Latency table */}
        <div className="mt-6 border border-white/[0.06] overflow-hidden">
          <div className="px-4 py-2 bg-white/[0.02] border-b border-white/[0.06]">
            <span className="font-mono text-[10px] tracking-wider text-muted-foreground/50 uppercase">
              Cache Tier Latency Comparison
            </span>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {[
              {
                tier: 'L1 — Browser',
                latency: '0 ms',
                cost: 'Zero (client-side)',
                scope: 'Per-user, per-device',
              },
              {
                tier: 'L2 — Edge (Redis)',
                latency: '1-5 ms',
                cost: 'Memory-bound',
                scope: 'Shared across all users',
              },
              {
                tier: 'L2 — Edge (In-Memory)',
                latency: '< 1 ms',
                cost: 'Process memory',
                scope: 'Per-instance only',
              },
              {
                tier: 'L3 — Filesystem',
                latency: '5-20 ms',
                cost: 'Disk I/O',
                scope: 'Per-instance',
              },
              {
                tier: 'L3 — S3/R2',
                latency: '10-50 ms',
                cost: 'API calls',
                scope: 'Durable, multi-region (R2)',
              },
              {
                tier: 'Origin — Notion S3',
                latency: '100-500 ms',
                cost: 'Network + compute',
                scope: 'URLs expire ~1hr',
              },
            ].map((row) => (
              <div key={row.tier} className="px-4 py-2.5 grid grid-cols-4 gap-2 text-sm">
                <span className="font-mono text-[12px] text-foreground/80">{row.tier}</span>
                <span className="font-mono text-[12px] text-emerald-400/80">{row.latency}</span>
                <span className="text-[12px] text-muted-foreground">{row.cost}</span>
                <span className="text-[12px] text-muted-foreground/60">{row.scope}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoCard icon={Zap} title="Fire-and-Forget Writes" accent="emerald">
            L2 and L3 cache writes are async and non-blocking. The response is sent to the client
            immediately after optimization — cache population happens in the background. Failed
            writes are logged but don't affect the response.
          </InfoCard>
          <InfoCard icon={HardDrive} title="Streaming Fetch" accent="amber">
            Upstream images are fetched using streaming (ReadableStream reader) with real-time byte
            counting. The stream is cancelled immediately upon exceeding the size limit — no full
            download is required to detect oversized images.
          </InfoCard>
          <InfoCard icon={Clock} title="Content Negotiation" accent="cobalt">
            The optimizer auto-selects the best format based on the Accept header. AVIF is preferred
            over WebP over original. This happens transparently — clients get the best format their
            browser supports without explicit format parameters.
          </InfoCard>
          <InfoCard icon={GitBranch} title="Cache Key Design" accent="purple">
            Cache keys use SHA-256(base URL without S3 signature) + variant suffix. This ensures:
            different S3 signatures for the same image map to the same key, different transforms get
            different keys, and prefix-based purging deletes all variants of an image.
          </InfoCard>
        </div>
      </section>
    </DocLayout>
  );
}
