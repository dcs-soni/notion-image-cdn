// Image Optimizer-  Sharp Pipeline

// On-the-fly image transformation using Sharp:
//   - Resize (width, height, fit mode)
//   - Format conversion (WebP, AVIF, PNG, JPEG)
//   - Quality control
//   - Content negotiation (Accept header → best format)
//
// Sharp runs natively on Node.js — no Wasm limitations.
// The pipeline is designed to be stateless: input Buffer → output Buffer.

import sharp from 'sharp';
import type { TransformOptions } from '../types/index.js';

export interface OptimizeResult {
  data: Buffer;
  contentType: string;
  width?: number;
  height?: number;
}

export async function optimizeImage(
  input: Buffer,
  options?: TransformOptions,
): Promise<OptimizeResult> {
  if (!options || isEmptyTransform(options)) {
    // Still probe dimensions for metadata
    const metadata = await sharp(input).metadata();
    return {
      data: input,
      contentType: formatToContentType(metadata.format ?? 'unknown'),
      width: metadata.width,
      height: metadata.height,
    };
  }

  let pipeline = sharp(input, {
    failOn: 'error',
    // Limit input pixels to prevent decompression bombs (~16384x16384)
    limitInputPixels: 268402689,
  });

  if (options.width || options.height) {
    pipeline = pipeline.resize({
      width: options.width,
      height: options.height,
      fit: options.fit ?? 'inside',
      withoutEnlargement: true,
    });
  }

  const quality = options.quality ?? 80;
  const format = options.format ?? 'original';

  switch (format) {
    case 'webp':
      pipeline = pipeline.webp({ quality, effort: 4 });
      break;
    case 'avif':
      pipeline = pipeline.avif({ quality, effort: 4 });
      break;
    case 'png':
      pipeline = pipeline.png({ compressionLevel: 6 });
      break;
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      break;
    case 'original':
    default:
      break;
  }

  // Auto-orient from EXIF before stripping metadata to prevent data leakage
  pipeline = pipeline.rotate();
  pipeline = pipeline.withMetadata({ orientation: undefined });

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

  return {
    data,
    contentType: formatToContentType(format === 'original' ? info.format : format),
    width: info.width,
    height: info.height,
  };
}

/**
 * Negotiate the best output format based on the Accept header.
 * Prefers AVIF > WebP > original (compression efficiency order).
 */
export function negotiateFormat(
  acceptHeader: string | undefined,
  requestedFormat?: TransformOptions['format'],
): TransformOptions['format'] {
  if (requestedFormat && requestedFormat !== 'original') {
    return requestedFormat;
  }

  if (!acceptHeader) return 'original';

  if (acceptHeader.includes('image/avif')) return 'avif';
  if (acceptHeader.includes('image/webp')) return 'webp';

  return 'original';
}

export function parseTransformOptions(query: Record<string, unknown>): TransformOptions {
  const options: TransformOptions = {};

  if (query['w'] !== undefined) {
    const w = parseInt(String(query['w']), 10);
    if (!isNaN(w) && w >= 1 && w <= 10000) {
      options.width = w;
    }
  }

  if (query['h'] !== undefined) {
    const h = parseInt(String(query['h']), 10);
    if (!isNaN(h) && h >= 1 && h <= 10000) {
      options.height = h;
    }
  }

  if (query['fmt'] !== undefined) {
    const fmt = String(query['fmt']).toLowerCase();
    if (['webp', 'avif', 'png', 'jpeg'].includes(fmt)) {
      options.format = fmt as TransformOptions['format'];
    }
  }

  if (query['q'] !== undefined) {
    const q = parseInt(String(query['q']), 10);
    if (!isNaN(q) && q >= 1 && q <= 100) {
      options.quality = q;
    }
  }

  if (query['fit'] !== undefined) {
    const fit = String(query['fit']).toLowerCase();
    if (['cover', 'contain', 'fill', 'inside', 'outside'].includes(fit)) {
      options.fit = fit as TransformOptions['fit'];
    }
  }

  return options;
}

function isEmptyTransform(options: TransformOptions): boolean {
  return (
    options.width === undefined &&
    options.height === undefined &&
    (options.format === undefined || options.format === 'original') &&
    options.quality === undefined &&
    options.fit === undefined
  );
}

function formatToContentType(format: string): string {
  const map: Record<string, string> = {
    webp: 'image/webp',
    avif: 'image/avif',
    png: 'image/png',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    tiff: 'image/tiff',
  };
  return map[format] ?? 'application/octet-stream';
}
