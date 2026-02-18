# notion-image-cdn

Notion expires its image URLs — every S3-signed link breaks after ~1 hour. **notion-image-cdn** is a zero-dependency SDK that rewrites those expiring URLs into permanent, optimized CDN URLs.

```
Expiring Notion URL  →  SDK rewrites  →  Permanent CDN URL
```

## Who Is This For?

If you use **Notion as a CMS** (for a blog, portfolio, docs site, etc.) and render Notion content on your own frontend, you've probably hit this: images break after ~1 hour because Notion's S3 signed URLs expire.

This SDK is for you if:

- 🖼️ You display Notion images on a **Next.js, Remix, Astro, or any React/JS site**
- ⏳ You use **ISR / static generation** with revalidation windows longer than 1 hour
- 🔗 You want **permanent, stable image URLs** that never expire
- ⚡ You want **automatic format conversion** (WebP/AVIF) and resizing at the edge

> **Requires a backend:** This SDK generates URLs that point to the [notion-image-cdn service](https://github.com/dcs-soni/notion-image-cdn). You need to self-host the service (see [Self-Hosting](#self-hosting-the-service) below) — the SDK itself is just a URL rewriter with no network calls.

## Install

```bash
npm install notion-image-cdn
```

```bash
yarn add notion-image-cdn
```

```bash
pnpm add notion-image-cdn
```

## Quick Start

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

## React Component

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

> React ≥ 18 is a peer dependency, but it's **optional** — the core SDK works without React.

## Markdown / Plugin Usage

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

## API Reference

### `getOptimizedUrl(url, options)`

Rewrites a Notion S3 URL to a permanent CDN URL. Returns the original URL unchanged if it's not a recognized Notion image.

| Option       | Type                                                      | Required | Description                       |
| ------------ | --------------------------------------------------------- | -------- | --------------------------------- |
| `cdnBaseUrl` | `string`                                                  | ✓        | Base URL of your deployed service |
| `width`      | `number`                                                  |          | Target width in px                |
| `height`     | `number`                                                  |          | Target height in px               |
| `format`     | `'webp' \| 'avif' \| 'png' \| 'jpeg'`                     |          | Output format                     |
| `quality`    | `number`                                                  |          | Output quality (1–100)            |
| `fit`        | `'cover' \| 'contain' \| 'fill' \| 'inside' \| 'outside'` |          | Resize fit mode                   |

### `isNotionImageUrl(url)`

Returns `true` if the URL is a recognized Notion image URL. Supports:

- `prod-files-secure.s3.us-west-2.amazonaws.com`
- `s3.us-west-2.amazonaws.com`
- `file.notion.so`
- `img.notionusercontent.com`

### `createNotionImagePlugin(config)`

Returns a `(src: string) => string` function with baked-in defaults.

| Option           | Type     | Required | Description           |
| ---------------- | -------- | -------- | --------------------- |
| `cdnBaseUrl`     | `string` | ✓        | Your service URL      |
| `defaultFormat`  | `string` |          | Default output format |
| `defaultQuality` | `number` |          | Default quality       |
| `defaultWidth`   | `number` |          | Default width         |

### `<NotionImage />` (React)

Import from `notion-image-cdn/react`. Accepts all props from the core options plus standard `<img>` attributes:

| Prop         | Type                  | Required | Description                        |
| ------------ | --------------------- | -------- | ---------------------------------- |
| `src`        | `string`              | ✓        | Notion image URL                   |
| `cdnBaseUrl` | `string`              | ✓        | Your service URL                   |
| `alt`        | `string`              | ✓        | Alt text                           |
| `width`      | `number`              |          | Target width                       |
| `height`     | `number`              |          | Target height                      |
| `format`     | `string`              |          | Output format                      |
| `quality`    | `number`              |          | Quality (1–100)                    |
| `className`  | `string`              |          | CSS class                          |
| `loading`    | `'lazy' \| 'eager'`   |          | Loading strategy (default: `lazy`) |
| `style`      | `React.CSSProperties` |          | Inline styles                      |

## Self-Hosting the Service

The SDK rewrites URLs to point to a **notion-image-cdn service** that you host yourself. The service fetches images from Notion's S3, optimizes them with Sharp, and caches them in a multi-tier cache (in-memory → Redis → filesystem/S3).

### Running Locally

```bash
git clone https://github.com/dcs-soni/notion-image-cdn.git
cd notion-image-cdn

# Install dependencies (requires Bun v1+)
bun install

# Configure
cp .env.example .env
# Edit .env — at minimum, set ALLOWED_DOMAINS and CORS_ORIGINS

# Start the service
bun run dev
# → http://localhost:3002
```

Then point the SDK to your local instance:

```ts
getOptimizedUrl(notionUrl, {
  cdnBaseUrl: 'http://localhost:3002',
  format: 'webp',
});
```

### Docker

```bash
docker compose up
```

### Production Deployment

Deploy the service to any container host (Render, Railway, Fly.io, etc.) or run the Docker image on your own infrastructure. See the [deployment guide](https://github.com/dcs-soni/notion-image-cdn/blob/main/DEPLOYMENT.md) for details.

## Is It Free?

**Yes.** The SDK and service are both MIT-licensed and completely free to use. You only pay for the infrastructure you choose to host the service on (a small VPS, Render free tier, etc.). There is no SaaS, no paid tier, and no usage limits imposed by the project itself.

## License

[MIT](https://github.com/dcs-soni/notion-image-cdn/blob/main/LICENSE) — free for personal and commercial use.
