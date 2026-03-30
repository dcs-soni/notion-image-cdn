import { useState, useEffect } from 'react';
import { DocLayout, type SidebarSection } from '../components/docs/DocLayout';
import { CodeBlock } from '../components/docs/CodeBlock';
import { EndpointCard } from '../components/docs/EndpointCard';
import { ParamTable, type Param } from '../components/docs/ParamTable';
import { SchemaExplorer, type SchemaField } from '../components/docs/SchemaExplorer';
import { TryItPanel } from '../components/docs/TryItPanel';
import { Globe, ToggleLeft, ToggleRight } from 'lucide-react';

const BASE_URLS = {
  production: 'https://notion-image-cdn.vercel.app',
  local: 'http://localhost:3002',
};

const sections: SidebarSection[] = [
  { id: 'api-overview', label: 'Overview' },
  {
    id: 'service-api',
    label: 'Service API',
    children: [
      { id: 'ep-proxy', label: 'GET /api/v1/proxy' },
      { id: 'ep-image', label: 'GET /img/:ws/:blk/:file' },
      { id: 'ep-cache', label: 'DELETE /api/v1/cache' },
      { id: 'ep-stats', label: 'GET /api/v1/stats' },
      { id: 'ep-health', label: 'GET /health' },
    ],
  },
  {
    id: 'sdk-api',
    label: 'SDK API',
    children: [
      { id: 'sdk-getOptimizedUrl', label: 'getOptimizedUrl()' },
      { id: 'sdk-isNotionImageUrl', label: 'isNotionImageUrl()' },
      { id: 'sdk-createPlugin', label: 'createNotionImagePlugin()' },
      { id: 'sdk-react', label: '<NotionImage />' },
    ],
  },
  { id: 'error-reference', label: 'Error Reference' },
  { id: 'response-headers', label: 'Response Headers' },
];

const errorCodes = [
  {
    code: 'MISSING_URL',
    status: 400,
    trigger: 'No url query parameter provided',
    endpoint: '/api/v1/proxy',
  },
  {
    code: 'INVALID_URL',
    status: 403,
    trigger: 'URL failed URL constructor parsing',
    endpoint: '/api/v1/proxy',
  },
  {
    code: 'DOMAIN_NOT_ALLOWED',
    status: 403,
    trigger: 'Hostname not in ALLOWED_DOMAINS list',
    endpoint: '/api/v1/proxy',
  },
  {
    code: 'PRIVATE_HOST',
    status: 403,
    trigger: 'SSRF — URL resolves to private/internal IP',
    endpoint: '/api/v1/proxy',
  },
  {
    code: 'HTTPS_REQUIRED',
    status: 403,
    trigger: 'Non-HTTPS URL provided',
    endpoint: '/api/v1/proxy',
  },
  {
    code: 'CREDENTIALS_IN_URL',
    status: 403,
    trigger: 'URL contains embedded username:password',
    endpoint: '/api/v1/proxy',
  },
  {
    code: 'URL_TOO_LONG',
    status: 403,
    trigger: 'URL exceeds 4096 characters',
    endpoint: '/api/v1/proxy',
  },
  {
    code: 'RATE_LIMIT_EXCEEDED',
    status: 429,
    trigger: 'Exceeded RATE_LIMIT_PER_MINUTE per IP',
    endpoint: 'All',
  },
  {
    code: 'IMAGE_TOO_LARGE',
    status: 413,
    trigger: 'Image exceeds MAX_IMAGE_SIZE_BYTES (25MB)',
    endpoint: '/api/v1/proxy',
  },
  {
    code: 'INVALID_CONTENT_TYPE',
    status: 400,
    trigger: 'Upstream Content-Type is not image/*',
    endpoint: '/api/v1/proxy',
  },
  {
    code: 'UPSTREAM_TIMEOUT',
    status: 504,
    trigger: 'Upstream fetch exceeded UPSTREAM_TIMEOUT_MS (15s)',
    endpoint: '/api/v1/proxy',
  },
  {
    code: 'UPSTREAM_ERROR',
    status: 502,
    trigger: 'Upstream returned non-2xx status code',
    endpoint: '/api/v1/proxy',
  },
  {
    code: 'FETCH_FAILED',
    status: 502,
    trigger: 'Network error during upstream fetch',
    endpoint: '/api/v1/proxy',
  },
  {
    code: 'TOO_MANY_REDIRECTS',
    status: 502,
    trigger: 'Upstream exceeded 5 redirect hops',
    endpoint: '/api/v1/proxy',
  },
  {
    code: 'REDIRECT_BLOCKED',
    status: 403,
    trigger: 'Redirect target hostname not in allowlist',
    endpoint: '/api/v1/proxy',
  },
  {
    code: 'EMPTY_RESPONSE',
    status: 502,
    trigger: 'Upstream returned empty response body',
    endpoint: '/api/v1/proxy',
  },
  {
    code: 'IMAGE_NOT_CACHED',
    status: 404,
    trigger: 'Clean URL requested for uncached image',
    endpoint: '/img/:ws/:blk/:file',
  },
  {
    code: 'MISSING_PARAMS',
    status: 400,
    trigger: 'Required path or query parameters missing',
    endpoint: 'Multiple',
  },
  {
    code: 'INVALID_PARAMS',
    status: 400,
    trigger: 'Path traversal (..) detected in parameters',
    endpoint: '/img/:ws/:blk/:file',
  },
  { code: 'NOT_FOUND', status: 404, trigger: 'Route does not exist', endpoint: 'All' },
  { code: 'INTERNAL_ERROR', status: 500, trigger: 'Unhandled server error', endpoint: 'All' },
  {
    code: 'PURGE_FAILED',
    status: 500,
    trigger: 'Cache purge operation failed',
    endpoint: '/api/v1/cache',
  },
  {
    code: 'NOT_IMPLEMENTED',
    status: 501,
    trigger: 'Feature not yet available (page_id purge)',
    endpoint: '/api/v1/cache',
  },
];

const errorResponseSchema: SchemaField[] = [
  {
    name: 'error',
    type: 'object',
    required: true,
    description: 'Error details container',
    children: [
      { name: 'status', type: 'number', required: true, description: 'HTTP status code' },
      {
        name: 'code',
        type: 'string',
        required: true,
        description: 'Machine-readable error code (e.g., MISSING_URL)',
      },
      {
        name: 'message',
        type: 'string',
        required: true,
        description: 'Human-readable error description',
      },
      {
        name: 'requestId',
        type: 'string',
        required: true,
        description: 'Unique request ID for tracing (UUID v4)',
      },
    ],
  },
];

const healthResponseSchema: SchemaField[] = [
  {
    name: 'status',
    type: 'string',
    required: true,
    description: '"ok" | "degraded" — overall service health',
  },
  {
    name: 'version',
    type: 'string',
    required: true,
    description: 'Service version from package.json',
  },
  {
    name: 'uptime',
    type: 'number',
    required: true,
    description: 'Uptime in seconds since process start',
  },
  {
    name: 'timestamp',
    type: 'string',
    required: true,
    description: 'ISO 8601 current server time',
  },
  {
    name: 'checks',
    type: 'object',
    required: true,
    description: 'Subsystem health checks',
    children: [
      {
        name: 'storage',
        type: 'string',
        required: true,
        description: '"ok" | "error" — persistent storage status',
      },
      {
        name: 'cache',
        type: 'string',
        required: true,
        description: '"ok" | "error" | "disabled" — edge cache status',
      },
    ],
  },
];

const purgeResponseSchema: SchemaField[] = [
  { name: 'message', type: 'string', required: true, description: 'Success confirmation message' },
  { name: 'purgedBy', type: 'string', required: true, description: '"url" — purge method used' },
  { name: 'target', type: 'string', required: true, description: 'Base URL that was purged' },
  { name: 'requestId', type: 'string', required: true, description: 'Request trace ID' },
];

const proxyParams: Param[] = [
  {
    name: 'url',
    location: 'query',
    type: 'string',
    required: true,
    description: 'URL-encoded Notion S3 image URL',
    validation: 'Must be HTTPS, domain in allowlist',
  },
  {
    name: 'w',
    location: 'query',
    type: 'number',
    required: false,
    description: 'Target width in pixels',
    validation: '1-10000',
  },
  {
    name: 'h',
    location: 'query',
    type: 'number',
    required: false,
    description: 'Target height in pixels',
    validation: '1-10000',
  },
  {
    name: 'fmt',
    location: 'query',
    type: 'string',
    required: false,
    description: 'Output format',
    validation: 'webp | avif | png | jpeg',
  },
  {
    name: 'q',
    location: 'query',
    type: 'number',
    required: false,
    description: 'Output quality',
    validation: '1-100',
    defaultValue: '80',
  },
  {
    name: 'fit',
    location: 'query',
    type: 'string',
    required: false,
    description: 'Resize fit mode',
    validation: 'cover | contain | fill | inside | outside',
    defaultValue: 'inside',
  },
];

const imageParams: Param[] = [
  {
    name: 'workspaceId',
    location: 'path',
    type: 'string',
    required: true,
    description: 'Notion workspace ID',
    validation: 'No path traversal (..)',
  },
  {
    name: 'blockId',
    location: 'path',
    type: 'string',
    required: true,
    description: 'Notion block/file ID',
    validation: 'No path traversal (..)',
  },
  {
    name: 'filename',
    location: 'path',
    type: 'string',
    required: true,
    description: 'Image filename (e.g., photo.jpg)',
    validation: 'No path traversal (..)',
  },
  {
    name: 'w',
    location: 'query',
    type: 'number',
    required: false,
    description: 'Target width in pixels',
    validation: '1-10000',
  },
  {
    name: 'h',
    location: 'query',
    type: 'number',
    required: false,
    description: 'Target height in pixels',
    validation: '1-10000',
  },
  {
    name: 'fmt',
    location: 'query',
    type: 'string',
    required: false,
    description: 'Output format',
    validation: 'webp | avif | png | jpeg',
  },
  {
    name: 'q',
    location: 'query',
    type: 'number',
    required: false,
    description: 'Output quality',
    validation: '1-100',
  },
  {
    name: 'fit',
    location: 'query',
    type: 'string',
    required: false,
    description: 'Resize fit mode',
    validation: 'cover | contain | fill | inside | outside',
  },
];

const cacheParams: Param[] = [
  {
    name: 'url',
    location: 'query',
    type: 'string',
    required: false,
    description: 'URL-encoded Notion S3 image URL to purge',
    validation: 'At least one of url or page_id required',
  },
  {
    name: 'page_id',
    location: 'query',
    type: 'string',
    required: false,
    description: 'Notion page ID to purge (not yet implemented)',
    validation: 'Returns 501',
  },
];

export function ApiReferencePage() {
  const [env, setEnv] = useState<'production' | 'local'>('production');
  const baseUrl = BASE_URLS[env];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <DocLayout title="API Reference" subtitle="Endpoints" sections={sections}>
      {/* Overview */}
      <section className="mb-12">
        <h2
          id="api-overview"
          className="scroll-mt-20 font-serif text-[clamp(1.5rem,3vw,2.25rem)] leading-[1.15] tracking-tight text-foreground mb-4"
        >
          API Reference
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-2xl">
          Complete reference for the notion-image-cdn Service API and SDK. All endpoints return JSON
          error responses with consistent error shapes. Image endpoints return binary image data
          with informational headers.
        </p>

        {/* Environment switcher */}
        <div className="inline-flex items-center gap-3 border border-white/[0.06] bg-white/[0.015] px-4 py-2.5">
          <Globe size={13} className="text-muted-foreground/50" />
          <span className="font-mono text-[10px] tracking-wider text-muted-foreground/50 uppercase">
            Base URL
          </span>
          <button
            onClick={() => setEnv(env === 'production' ? 'local' : 'production')}
            className="flex items-center gap-2 group"
          >
            {env === 'production' ? (
              <ToggleRight size={18} className="text-cobalt" />
            ) : (
              <ToggleLeft size={18} className="text-muted-foreground" />
            )}
            <code className="font-mono text-xs text-foreground/80">{baseUrl}</code>
          </button>
          <span className="font-mono text-[9px] text-muted-foreground/30">
            {env === 'production' ? 'Production' : 'Local Dev'}
          </span>
        </div>
      </section>

      <section className="mb-16">
        <h2
          id="service-api"
          className="scroll-mt-20 font-serif text-2xl tracking-tight text-foreground mb-6"
        >
          Service API
        </h2>

        <div className="space-y-4">
          {/* GET /api/v1/proxy */}
          <EndpointCard
            id="ep-proxy"
            method="GET"
            path="/api/v1/proxy"
            description="Proxy and optimize a Notion image. This is the primary endpoint — pass the full Notion S3 URL (URL-encoded) and get back the optimized image."
            defaultExpanded
          >
            <div className="space-y-6">
              <div>
                <h4 className="font-mono text-[10px] tracking-wider text-muted-foreground/50 uppercase mb-3">
                  Parameters
                </h4>
                <ParamTable params={proxyParams} />
              </div>

              <TryItPanel
                method="GET"
                path="/api/v1/proxy"
                baseUrl={baseUrl}
                fields={[
                  {
                    name: 'url',
                    location: 'query',
                    placeholder: 'https://prod-files-secure.s3...',
                    required: true,
                    defaultValue:
                      'https://prod-files-secure.s3.us-west-2.amazonaws.com/abc/def/photo.jpg',
                  },
                  { name: 'w', location: 'query', placeholder: '800' },
                  { name: 'fmt', location: 'query', placeholder: 'webp', defaultValue: 'webp' },
                  { name: 'q', location: 'query', placeholder: '85' },
                ]}
              />

              <div>
                <h4 className="font-mono text-[10px] tracking-wider text-muted-foreground/50 uppercase mb-3">
                  Request Examples
                </h4>
                <CodeBlock
                  tabs={[
                    {
                      label: 'curl',
                      language: 'bash',
                      code: `curl "${baseUrl}/api/v1/proxy?url=https%3A%2F%2Fprod-files-secure.s3.us-west-2.amazonaws.com%2Fabc%2Fdef%2Fphoto.jpg&w=800&fmt=webp&q=85"`,
                    },
                    {
                      label: 'JavaScript',
                      language: 'javascript',
                      code: `const url = new URL('${baseUrl}/api/v1/proxy');
url.searchParams.set('url', notionS3Url);
url.searchParams.set('w', '800');
url.searchParams.set('fmt', 'webp');

const response = await fetch(url);
const imageBlob = await response.blob();

console.log(response.headers.get('X-Cache'));      // "HIT" or "MISS"
console.log(response.headers.get('X-Cache-Tier')); // "L2_EDGE", "L3_PERSISTENT", or "ORIGIN"`,
                    },
                    {
                      label: 'Python',
                      language: 'python',
                      code: `import requests

response = requests.get(
    '${baseUrl}/api/v1/proxy',
    params={
        'url': 'https://prod-files-secure.s3.us-west-2.amazonaws.com/abc/def/photo.jpg',
        'w': 800,
        'fmt': 'webp',
        'q': 85,
    }
)

with open('image.webp', 'wb') as f:
    f.write(response.content)

print(f"Cache: {response.headers['X-Cache']}")`,
                    },
                    {
                      label: 'Go',
                      language: 'go',
                      code: `package main

import (
    "fmt"
    "io"
    "net/http"
    "net/url"
    "os"
)

func main() {
    params := url.Values{}
    params.Set("url", "https://prod-files-secure.s3.us-west-2.amazonaws.com/abc/def/photo.jpg")
    params.Set("w", "800")
    params.Set("fmt", "webp")

    resp, err := http.Get("${baseUrl}/api/v1/proxy?" + params.Encode())
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    fmt.Println("Cache:", resp.Header.Get("X-Cache"))
}`,
                    },
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-mono text-[10px] tracking-wider text-muted-foreground/50 uppercase mb-3">
                    Success Response (200)
                  </h4>
                  <div className="border border-white/[0.06] bg-white/[0.015] p-4">
                    <p className="text-xs text-muted-foreground mb-2">
                      Returns binary image data with Content-Type header.
                    </p>
                    <code className="font-mono text-[11px] text-emerald-400/70">
                      Content-Type: image/webp
                    </code>
                  </div>
                </div>
                <div>
                  <h4 className="font-mono text-[10px] tracking-wider text-muted-foreground/50 uppercase mb-3">
                    Error Response
                  </h4>
                  <CodeBlock
                    language="json"
                    code={`{
  "error": {
    "status": 403,
    "code": "DOMAIN_NOT_ALLOWED",
    "message": "Domain \\"evil.com\\" is not in the allowlist",
    "requestId": "a1b2c3d4-e5f6-..."
  }
}`}
                  />
                </div>
              </div>
            </div>
          </EndpointCard>

          {/* GET /img/:workspaceId/:blockId/:filename */}
          <EndpointCard
            id="ep-image"
            method="GET"
            path="/img/:workspaceId/:blockId/:filename"
            description="Serve a cached image via clean, permanent URL. This is what the SDK generates. Returns 404 if the image hasn't been proxied yet."
          >
            <div className="space-y-6">
              <ParamTable params={imageParams} />

              <TryItPanel
                method="GET"
                path="/img/:workspaceId/:blockId/:filename"
                baseUrl={baseUrl}
                fields={[
                  {
                    name: 'workspaceId',
                    location: 'path',
                    placeholder: 'abc-workspace-id',
                    required: true,
                    defaultValue: 'abc-workspace-id',
                  },
                  {
                    name: 'blockId',
                    location: 'path',
                    placeholder: 'def-block-id',
                    required: true,
                    defaultValue: 'def-block-id',
                  },
                  {
                    name: 'filename',
                    location: 'path',
                    placeholder: 'photo.jpg',
                    required: true,
                    defaultValue: 'photo.jpg',
                  },
                  { name: 'w', location: 'query', placeholder: '800' },
                  { name: 'fmt', location: 'query', placeholder: 'webp' },
                ]}
              />

              <CodeBlock
                tabs={[
                  {
                    label: 'curl',
                    language: 'bash',
                    code: `curl "${baseUrl}/img/abc-workspace/def-block/photo.jpg?w=800&fmt=webp"`,
                  },
                  {
                    label: 'HTML',
                    language: 'typescript',
                    code: `<img src="${baseUrl}/img/abc-workspace/def-block/photo.jpg?w=800&fmt=webp" alt="Photo" loading="lazy" />`,
                  },
                ]}
              />

              <div>
                <h4 className="font-mono text-[10px] tracking-wider text-muted-foreground/50 uppercase mb-3">
                  404 Response (Not Yet Cached)
                </h4>
                <CodeBlock
                  language="json"
                  code={`{
  "error": {
    "status": 404,
    "code": "IMAGE_NOT_CACHED",
    "message": "This image is not yet cached. Use /api/v1/proxy?url=<encoded-notion-url> to cache it first.",
    "requestId": "..."
  }
}`}
                />
              </div>
            </div>
          </EndpointCard>

          {/* DELETE /api/v1/cache */}
          <EndpointCard
            id="ep-cache"
            method="DELETE"
            path="/api/v1/cache"
            description="Purge a specific image (all variants) from all cache tiers (L2 edge + L3 persistent)."
          >
            <div className="space-y-6">
              <ParamTable params={cacheParams} />

              <TryItPanel
                method="DELETE"
                path="/api/v1/cache"
                baseUrl={baseUrl}
                fields={[
                  {
                    name: 'url',
                    location: 'query',
                    placeholder: 'https://prod-files-secure.s3...',
                    required: false,
                    defaultValue:
                      'https://prod-files-secure.s3.us-west-2.amazonaws.com/abc/def/photo.jpg',
                  },
                ]}
              />

              <div>
                <h4 className="font-mono text-[10px] tracking-wider text-muted-foreground/50 uppercase mb-3">
                  Success Response (200)
                </h4>
                <SchemaExplorer title="Response Schema" schema={purgeResponseSchema} />
                <div className="mt-3">
                  <CodeBlock
                    language="json"
                    code={`{
  "message": "Cache purged successfully",
  "purgedBy": "url",
  "target": "https://prod-files-secure.s3.us-west-2.amazonaws.com/abc/def/photo.jpg",
  "requestId": "a1b2c3d4-..."
}`}
                  />
                </div>
              </div>
            </div>
          </EndpointCard>

          {/* GET /api/v1/stats */}
          <EndpointCard
            id="ep-stats"
            method="GET"
            path="/api/v1/stats"
            description="Returns basic service usage statistics including storage and cache backend status."
          >
            <div className="space-y-4">
              <CodeBlock language="bash" code={`curl "${baseUrl}/api/v1/stats"`} />
              <CodeBlock
                language="json"
                code={`{
  "status": "ok",
  "message": "Statistics endpoint. Detailed metrics available in Phase 4 (Dashboard).",
  "storage": "filesystem",
  "cache": "redis"
}`}
              />
            </div>
          </EndpointCard>

          {/* GET /health */}
          <EndpointCard
            id="ep-health"
            method="GET"
            path="/health"
            description="Health check endpoint. Returns service status, version, uptime, and subsystem health. Returns 503 if storage is unhealthy."
          >
            <div className="space-y-6">
              <CodeBlock language="bash" code={`curl "${baseUrl}/health"`} />

              <SchemaExplorer title="Response Schema" schema={healthResponseSchema} />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-mono text-[10px] tracking-wider text-emerald-400 uppercase mb-2">
                    200 — Healthy
                  </h4>
                  <CodeBlock
                    language="json"
                    code={`{
  "status": "ok",
  "version": "1.0.0",
  "uptime": 86400,
  "timestamp": "2026-03-30T08:00:00.000Z",
  "checks": {
    "storage": "ok",
    "cache": "ok"
  }
}`}
                  />
                </div>
                <div>
                  <h4 className="font-mono text-[10px] tracking-wider text-red-400 uppercase mb-2">
                    503 — Degraded
                  </h4>
                  <CodeBlock
                    language="json"
                    code={`{
  "status": "degraded",
  "version": "1.0.0",
  "uptime": 86400,
  "timestamp": "2026-03-30T08:00:00.000Z",
  "checks": {
    "storage": "error",
    "cache": "ok"
  }
}`}
                  />
                </div>
              </div>
            </div>
          </EndpointCard>
        </div>
      </section>

      <section className="mb-16">
        <h2
          id="sdk-api"
          className="scroll-mt-20 font-serif text-2xl tracking-tight text-foreground mb-2"
        >
          SDK API
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          <code className="font-mono text-xs text-cobalt">npm install notion-image-cdn</code> —
          Zero-dependency TypeScript SDK for URL rewriting.
        </p>

        <div className="space-y-8">
          {/* getOptimizedUrl */}
          <div
            id="sdk-getOptimizedUrl"
            className="scroll-mt-20 border border-white/[0.06] bg-white/[0.015] p-5"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="font-mono text-[9px] px-1.5 py-0.5 bg-cobalt/10 text-cobalt tracking-wide uppercase">
                Function
              </span>
              <code className="font-mono text-sm text-foreground/90">
                getOptimizedUrl(url, options)
              </code>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Rewrites a Notion S3 image URL to a permanent CDN URL. Returns the original URL
              unchanged if it's not a recognized Notion image. Safe to call on any URL.
            </p>

            <h4 className="font-mono text-[10px] tracking-wider text-muted-foreground/50 uppercase mb-3">
              Options
            </h4>
            <ParamTable
              params={[
                {
                  name: 'cdnBaseUrl',
                  location: 'body',
                  type: 'string',
                  required: true,
                  description: 'Base URL of your deployed service',
                },
                {
                  name: 'width',
                  location: 'body',
                  type: 'number',
                  required: false,
                  description: 'Target width in pixels',
                },
                {
                  name: 'height',
                  location: 'body',
                  type: 'number',
                  required: false,
                  description: 'Target height in pixels',
                },
                {
                  name: 'format',
                  location: 'body',
                  type: 'string',
                  required: false,
                  description: 'Output format: webp | avif | png | jpeg',
                },
                {
                  name: 'quality',
                  location: 'body',
                  type: 'number',
                  required: false,
                  description: 'Output quality (1-100)',
                },
                {
                  name: 'fit',
                  location: 'body',
                  type: 'string',
                  required: false,
                  description: 'Resize fit: cover | contain | fill | inside | outside',
                },
              ]}
            />

            <div className="mt-4">
              <CodeBlock
                language="typescript"
                showLineNumbers
                code={`import { getOptimizedUrl } from 'notion-image-cdn';

// Basic usage
const cdnUrl = getOptimizedUrl(notionS3Url, {
  cdnBaseUrl: '${baseUrl}',
  width: 800,
  format: 'webp',
  quality: 85,
});
// → '${baseUrl}/img/abc/def/photo.jpg?w=800&fmt=webp&q=85'

// Non-Notion URL — passes through unchanged
const regular = getOptimizedUrl('https://example.com/logo.png', {
  cdnBaseUrl: '${baseUrl}',
});
// → 'https://example.com/logo.png'`}
              />
            </div>
          </div>

          {/* isNotionImageUrl */}
          <div
            id="sdk-isNotionImageUrl"
            className="scroll-mt-20 border border-white/[0.06] bg-white/[0.015] p-5"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="font-mono text-[9px] px-1.5 py-0.5 bg-cobalt/10 text-cobalt tracking-wide uppercase">
                Function
              </span>
              <code className="font-mono text-sm text-foreground/90">isNotionImageUrl(url)</code>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Returns <code className="font-mono text-xs text-emerald-400">true</code> if the URL is
              a recognized Notion S3 image URL. Checks against 4 known hostnames.
            </p>

            <div className="mt-3">
              <h4 className="font-mono text-[10px] tracking-wider text-muted-foreground/50 uppercase mb-2">
                Recognized Hosts
              </h4>
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  'prod-files-secure.s3.us-west-2.amazonaws.com',
                  's3.us-west-2.amazonaws.com',
                  'file.notion.so',
                  'img.notionusercontent.com',
                ].map((host) => (
                  <code
                    key={host}
                    className="font-mono text-[10px] text-muted-foreground/60 px-2 py-1 border border-white/[0.06]"
                  >
                    {host}
                  </code>
                ))}
              </div>
            </div>

            <CodeBlock
              language="typescript"
              code={`import { isNotionImageUrl } from 'notion-image-cdn';

isNotionImageUrl('https://prod-files-secure.s3.us-west-2.amazonaws.com/abc/def/img.jpg');
// → true

isNotionImageUrl('https://img.notionusercontent.com/s3/prod-files-secure%2Fabc/size/w=1200');
// → true

isNotionImageUrl('https://example.com/image.png');
// → false`}
            />
          </div>

          {/* createNotionImagePlugin */}
          <div
            id="sdk-createPlugin"
            className="scroll-mt-20 border border-white/[0.06] bg-white/[0.015] p-5"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="font-mono text-[9px] px-1.5 py-0.5 bg-cobalt/10 text-cobalt tracking-wide uppercase">
                Factory
              </span>
              <code className="font-mono text-sm text-foreground/90">
                createNotionImagePlugin(config)
              </code>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Returns a <code className="font-mono text-xs">(src: string) =&gt; string</code>{' '}
              function with baked-in defaults. Ideal for markdown renderers and template systems.
            </p>

            <CodeBlock
              language="typescript"
              showLineNumbers
              code={`import { createNotionImagePlugin } from 'notion-image-cdn';

const rewrite = createNotionImagePlugin({
  cdnBaseUrl: '${baseUrl}',
  defaultFormat: 'webp',
  defaultQuality: 85,
  defaultWidth: 1200,
});

// Use with react-markdown
const components = {
  img: ({ src, alt }) => (
    <img src={rewrite(src)} alt={alt} loading="lazy" />
  ),
};`}
            />
          </div>

          {/* NotionImage React component */}
          <div
            id="sdk-react"
            className="scroll-mt-20 border border-white/[0.06] bg-white/[0.015] p-5"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="font-mono text-[9px] px-1.5 py-0.5 bg-purple-500/10 text-purple-400 tracking-wide uppercase">
                Component
              </span>
              <code className="font-mono text-sm text-foreground/90">{'<NotionImage />'}</code>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Drop-in <code className="font-mono text-xs">{'<img>'}</code> replacement that handles
              URL rewriting automatically. Passes through all standard img attributes.
            </p>

            <h4 className="font-mono text-[10px] tracking-wider text-muted-foreground/50 uppercase mb-3">
              Props
            </h4>
            <ParamTable
              params={[
                {
                  name: 'src',
                  location: 'body',
                  type: 'string',
                  required: true,
                  description: 'Notion S3 image URL (or any URL — non-Notion passes through)',
                },
                {
                  name: 'cdnBaseUrl',
                  location: 'body',
                  type: 'string',
                  required: true,
                  description: 'Base URL of your CDN service',
                },
                {
                  name: 'width',
                  location: 'body',
                  type: 'number',
                  required: false,
                  description: 'Target image width',
                },
                {
                  name: 'height',
                  location: 'body',
                  type: 'number',
                  required: false,
                  description: 'Target image height',
                },
                {
                  name: 'format',
                  location: 'body',
                  type: 'string',
                  required: false,
                  description: 'webp | avif | png | jpeg',
                },
                {
                  name: 'quality',
                  location: 'body',
                  type: 'number',
                  required: false,
                  description: 'Output quality (1-100)',
                },
                {
                  name: 'fit',
                  location: 'body',
                  type: 'string',
                  required: false,
                  description: 'cover | contain | fill | inside | outside',
                },
                {
                  name: '...rest',
                  location: 'body',
                  type: 'ImgHTMLAttributes',
                  required: false,
                  description: 'All standard <img> attributes (alt, className, loading, etc.)',
                },
              ]}
            />

            <div className="mt-4">
              <CodeBlock
                language="tsx"
                showLineNumbers
                code={`import { NotionImage } from 'notion-image-cdn/react';

// Basic usage
<NotionImage
  src={notionUrl}
  cdnBaseUrl="${baseUrl}"
  alt="Blog header"
  width={1200}
  format="webp"
  quality={85}
  loading="lazy"
  className="rounded-lg w-full"
/>

// With responsive widths
<NotionImage
  src={notionUrl}
  cdnBaseUrl="${baseUrl}"
  width={600}
  format="webp"
  className="md:hidden"
/>
<NotionImage
  src={notionUrl}
  cdnBaseUrl="${baseUrl}"
  width={1200}
  format="webp"
  className="hidden md:block"
/>`}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Error Reference */}
      <section className="mb-16">
        <h2
          id="error-reference"
          className="scroll-mt-20 font-serif text-2xl tracking-tight text-foreground mb-2"
        >
          Error Reference
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          All errors follow a consistent JSON shape. Every error includes a unique{' '}
          <code className="font-mono text-xs text-cobalt">requestId</code> for tracing.
        </p>

        <SchemaExplorer title="Error Response Schema" schema={errorResponseSchema} />

        <div className="mt-6 border border-white/[0.06] overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 bg-white/[0.02] border-b border-white/[0.06]">
            <div className="col-span-3 font-mono text-[10px] text-muted-foreground/50 uppercase">
              Code
            </div>
            <div className="col-span-1 font-mono text-[10px] text-muted-foreground/50 uppercase">
              HTTP
            </div>
            <div className="col-span-5 font-mono text-[10px] text-muted-foreground/50 uppercase">
              Trigger
            </div>
            <div className="col-span-3 font-mono text-[10px] text-muted-foreground/50 uppercase">
              Endpoint
            </div>
          </div>
          {errorCodes.map((err, i) => (
            <div
              key={err.code}
              id={`err-${err.code.toLowerCase()}`}
              className={`scroll-mt-20 px-4 py-2.5 hover:bg-white/[0.02] transition-colors ${
                i < errorCodes.length - 1 ? 'border-b border-white/[0.04]' : ''
              }`}
            >
              <div className="hidden md:grid grid-cols-12 gap-2 items-start">
                <code className="col-span-3 font-mono text-[11px] text-red-400/80">{err.code}</code>
                <span className="col-span-1 font-mono text-[11px] text-amber-400/70">
                  {err.status}
                </span>
                <span className="col-span-5 text-[12px] text-muted-foreground">{err.trigger}</span>
                <code className="col-span-3 font-mono text-[10px] text-muted-foreground/50">
                  {err.endpoint}
                </code>
              </div>
              <div className="md:hidden space-y-1">
                <div className="flex items-center gap-2">
                  <code className="font-mono text-[11px] text-red-400/80">{err.code}</code>
                  <span className="font-mono text-[10px] text-amber-400/70">{err.status}</span>
                </div>
                <p className="text-[12px] text-muted-foreground">{err.trigger}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-16">
        <h2
          id="response-headers"
          className="scroll-mt-20 font-serif text-2xl tracking-tight text-foreground mb-4"
        >
          Response Headers
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Custom headers included in image responses for debugging and monitoring.
        </p>
        <div className="border border-white/[0.06] overflow-hidden">
          {[
            {
              header: 'X-Cache',
              values: 'HIT | MISS',
              desc: 'Whether the image was served from cache or fetched from upstream',
            },
            {
              header: 'X-Cache-Tier',
              values: 'L2_EDGE | L3_PERSISTENT | ORIGIN',
              desc: 'Which cache tier served the response (or ORIGIN for upstream fetch)',
            },
            {
              header: 'X-Original-Size',
              values: 'number (bytes)',
              desc: 'Original image size before optimization (only on ORIGIN/cache miss)',
            },
            {
              header: 'X-Optimized-Size',
              values: 'number (bytes)',
              desc: 'Size of the optimized image being served',
            },
            {
              header: 'X-Request-Id',
              values: 'UUID v4',
              desc: 'Unique request identifier for tracing through logs',
            },
            {
              header: 'Cache-Control',
              values: 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600',
              desc: 'Browser caches for 1 hour, CDN caches for 24 hours, allows stale-while-revalidate',
            },
          ].map((h, i, arr) => (
            <div
              key={h.header}
              className={`px-4 py-3 ${i < arr.length - 1 ? 'border-b border-white/[0.04]' : ''}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
                <code className="font-mono text-[12px] text-cobalt shrink-0 sm:w-36">
                  {h.header}
                </code>
                <div>
                  <code className="font-mono text-[10px] text-muted-foreground/50 block mb-1">
                    {h.values}
                  </code>
                  <p className="text-[12px] text-muted-foreground">{h.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </DocLayout>
  );
}
