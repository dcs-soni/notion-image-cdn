# notion-image-cdn

Notion expires its image URLs. Every S3-signed link breaks after an hour, which means broken blog images, failed embeds, and midnight alerts.

**notion-image-cdn** fixes this: a lightweight proxy service that fetches, optimizes, caches, and serves Notion images behind permanent, stable URLs — paired with a zero-dependency SDK that rewrites URLs client-side.

```
Notion S3 URL (expires in ~1 hour)
  ↓
notion-image-cdn service (fetch → optimize → cache)
  ↓
Permanent CDN URL (never expires)
```

## How It Works

The project has two packages:

| Package            | What it does                                                                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/service` | Fastify-based proxy that fetches images from Notion's S3, runs them through Sharp for format conversion/resizing, and stores them in a multi-tier cache (in-memory → Redis → filesystem/S3) |
| `packages/sdk`     | Client-side URL rewriter that transforms Notion S3 URLs into your CDN URLs. Ships with a React component and a plugin factory for markdown renderers                                        |

When the SDK rewrites a URL, the resulting CDN URL points to the service. The service checks its cache tiers, and on a miss fetches from upstream, optimizes, caches, and responds. Subsequent requests are served directly from cache.

## SDK

### Install

```bash
npm install notion-image-cdn
```

### Basic Usage

```ts
import { getOptimizedUrl, isNotionImageUrl } from 'notion-image-cdn';

const notionUrl =
  'https://prod-files-secure.s3.us-west-2.amazonaws.com/abc/def/photo.jpg?X-Amz-...';

if (isNotionImageUrl(notionUrl)) {
  const cdnUrl = getOptimizedUrl(notionUrl, {
    cdnBaseUrl: 'https://notion-cdn.example.com',
    width: 800,
    format: 'webp',
    quality: 85,
  });
  // → https://notion-cdn.example.com/img/abc/def/photo.jpg?w=800&fmt=webp&q=85
}
```

Non-Notion URLs pass through unchanged — no conditional wrapping needed.

### React Component

A drop-in `<img>` replacement that handles URL rewriting automatically:

```tsx
import { NotionImage } from 'notion-image-cdn/react';

<NotionImage
  src={notionUrl}
  cdnBaseUrl="https://notion-cdn.example.com"
  alt="Blog header"
  width={1200}
  format="webp"
  quality={85}
  loading="lazy"
  className="rounded-lg"
/>;
```

### Markdown / Plugin Usage

For markdown renderers or template systems, create a pre-configured rewriter:

```ts
import { createNotionImagePlugin } from 'notion-image-cdn';

const rewrite = createNotionImagePlugin({
  cdnBaseUrl: 'https://notion-cdn.example.com',
  defaultFormat: 'webp',
  defaultQuality: 85,
  defaultWidth: 1200,
});

// Use with react-markdown, MDX, or any renderer:
const components = {
  img: ({ src, alt }) => <img src={rewrite(src)} alt={alt} loading="lazy" />,
};
```

### SDK API Reference

#### `getOptimizedUrl(url, options)`

Rewrites a Notion S3 URL to a permanent CDN URL. Returns the original URL unchanged if it's not a recognized Notion image.

| Option       | Type                                                      | Required | Description                       |
| ------------ | --------------------------------------------------------- | -------- | --------------------------------- |
| `cdnBaseUrl` | `string`                                                  | ✓        | Base URL of your deployed service |
| `width`      | `number`                                                  |          | Target width in px                |
| `height`     | `number`                                                  |          | Target height in px               |
| `format`     | `'webp' \| 'avif' \| 'png' \| 'jpeg'`                     |          | Output format                     |
| `quality`    | `number`                                                  |          | Output quality (1–100)            |
| `fit`        | `'cover' \| 'contain' \| 'fill' \| 'inside' \| 'outside'` |          | Resize fit mode                   |

#### `isNotionImageUrl(url)`

Returns `true` if the URL is a recognized Notion S3 image URL.

#### `createNotionImagePlugin(config)`

Returns a `(src: string) => string` function with baked-in defaults. Accepts `cdnBaseUrl`, `defaultFormat`, `defaultQuality`, and `defaultWidth`.

---

## Self-Hosting the Service

### Prerequisites

- [Bun](https://bun.sh/) v1+
- Redis _(optional, for L2 edge cache)_
- S3-compatible storage _(optional, defaults to filesystem)_

### Quick Start

```bash
git clone https://github.com/dcs-soni/notion-image-cdn.git
cd notion-image-cdn

# Install dependencies
bun install

# Configure
cp .env.example .env
# Edit .env — at minimum, set ALLOWED_DOMAINS and CORS_ORIGINS

# Run the service
bun run dev
```

The service starts at `http://localhost:3001`.

### Docker

```bash
# Filesystem cache + Redis
docker compose up

# With local S3 (MinIO) for testing S3/R2 backend
docker compose --profile s3 up
```

### Environment Variables

| Variable                | Default         | Description                                       |
| ----------------------- | --------------- | ------------------------------------------------- |
| `PORT`                  | `3001`          | Server port                                       |
| `STORAGE_BACKEND`       | `fs`            | `fs`, `s3`, or `r2`                               |
| `CACHE_DIR`             | `./cache`       | Local cache directory (when `STORAGE_BACKEND=fs`) |
| `REDIS_URL`             | —               | Redis connection string for L2 edge cache         |
| `S3_BUCKET`             | —               | S3 bucket name (required for s3/r2 backend)       |
| `S3_REGION`             | —               | S3 region                                         |
| `S3_ENDPOINT`           | —               | Custom endpoint for R2/MinIO                      |
| `S3_ACCESS_KEY`         | —               | S3 access key                                     |
| `S3_SECRET_KEY`         | —               | S3 secret key                                     |
| `ALLOWED_DOMAINS`       | Notion S3 hosts | Comma-separated upstream domain allowlist         |
| `RATE_LIMIT_PER_MINUTE` | `100`           | Max requests per minute per IP                    |
| `MAX_IMAGE_SIZE_BYTES`  | `26214400`      | Max upstream image size (25 MB)                   |
| `CORS_ORIGINS`          | `*`             | Comma-separated allowed origins                   |
| `API_KEYS_ENABLED`      | `false`         | Enable API key authentication                     |

---

## Service API

### `GET /api/v1/proxy?url=<encoded-notion-url>`

Proxies a Notion image through the CDN. This is the primary endpoint — pass the full Notion S3 URL (URL-encoded) and get back the optimized image.

**Query parameters:**

| Param | Description                                   |
| ----- | --------------------------------------------- |
| `url` | Encoded Notion S3 image URL _(required)_      |
| `w`   | Width in px                                   |
| `h`   | Height in px                                  |
| `fmt` | Output format (`webp`, `avif`, `png`, `jpeg`) |
| `q`   | Quality (1–100)                               |
| `fit` | Resize mode                                   |

**Response headers:**

| Header             | Description                             |
| ------------------ | --------------------------------------- |
| `X-Cache`          | `HIT` or `MISS`                         |
| `X-Cache-Tier`     | `L2_EDGE`, `L3_PERSISTENT`, or `ORIGIN` |
| `X-Original-Size`  | Original image size in bytes            |
| `X-Optimized-Size` | Optimized image size in bytes           |

### `GET /img/:workspaceId/:blockId/:filename`

Clean, permanent URL for cached images. This is what the SDK generates. Supports the same transform query params (`w`, `h`, `fmt`, `q`, `fit`).

> If the image hasn't been cached yet via `/api/v1/proxy`, this endpoint returns a `404` with a helpful message.

### `DELETE /api/v1/cache?url=<encoded-url>`

Purge a specific image (all variants) from cache.

### `GET /health`

Health check — returns service status, uptime, and subsystem health (storage, cache).

### `GET /api/v1/stats`

Basic usage statistics.

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│                   Your App                       │
│                                                  │
│  SDK rewrites:                                   │
│  notion-s3-url → cdn.example.com/img/a/b/file    │
└───────────────────────┬──────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────┐
│              notion-image-cdn service             │
│                                                  │
│  L1  Browser Cache (Cache-Control headers)       │
│  L2  Edge Cache (Redis / in-memory)              │
│  L3  Persistent Storage (filesystem / S3 / R2)   │
│                                                  │
│  On miss: fetch upstream → Sharp optimize →      │
│           store in L2 + L3 → respond             │
└──────────────────────────────────────────────────┘
```

## Tech Stack

- **Runtime**: [Bun](https://bun.sh/)
- **Framework**: [Fastify](https://fastify.dev/) v5
- **Image Processing**: [Sharp](https://sharp.pixelplumbing.com/)
- **Storage**: Filesystem, S3, Cloudflare R2
- **Cache**: Redis (via ioredis) + in-memory fallback
- **Validation**: [Zod](https://zod.dev/)
- **Monorepo**: [Turborepo](https://turbo.build/)

## License

MIT
