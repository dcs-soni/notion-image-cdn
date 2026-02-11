// =============================================================================
// Image Optimizer — Sharp Pipeline
// =============================================================================
// On-the-fly image transformation using Sharp:
//   - Resize (width, height, fit mode)
//   - Format conversion (WebP, AVIF, PNG, JPEG)
//   - Quality control
//   - Content negotiation (Accept header → best format)
//
// Sharp runs natively on Node.js — no Wasm limitations.
// The pipeline is designed to be stateless: input Buffer → output Buffer.
// =============================================================================

import sharp from "sharp";
import type { TransformOptions } from "../types/index.js";

export interface OptimizeResult {
  data: Buffer;
  contentType: string;
  width?: number;
  height?: number;
}

/**
 * Optimize an image according to the provided transform options.
 * If no options are provided, returns the original image untouched.
 */
export async function optimizeImage(
  input: Buffer,
  options?: TransformOptions,
): Promise<OptimizeResult> {
  // If no transforms requested, return original
  if (!options || isEmptyTransform(options)) {
    // Still probe dimensions for metadata
    const metadata = await sharp(input).metadata();
    return {
      data: input,
      contentType: formatToContentType(metadata.format ?? "unknown"),
      width: metadata.width,
      height: metadata.height,
    };
  }

  let pipeline = sharp(input, {
    // Fail on invalid input rather than silently producing garbage
    failOn: "error",
    // Limit input size to prevent decompression bombs
    limitInputPixels: 268402689, // ~16384x16384 pixels
  });

  // Apply resize if width or height specified
  if (options.width || options.height) {
    pipeline = pipeline.resize({
      width: options.width,
      height: options.height,
      fit: options.fit ?? "inside",
      withoutEnlargement: true, // Never upscale — only downscale
    });
  }

  // Apply format conversion
  const quality = options.quality ?? 80;
  const format = options.format ?? "original";

  switch (format) {
    case "webp":
      pipeline = pipeline.webp({ quality, effort: 4 });
      break;
    case "avif":
      pipeline = pipeline.avif({ quality, effort: 4 });
      break;
    case "png":
      pipeline = pipeline.png({ compressionLevel: 6 });
      break;
    case "jpeg":
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      break;
    case "original":
    default:
      // Keep original format, just apply quality if format is lossy
      break;
  }

  // Strip metadata (EXIF, IPTC, XMP) — reduces size and prevents data leakage
  pipeline = pipeline.rotate(); // Auto-orient based on EXIF before stripping
  pipeline = pipeline.withMetadata({ orientation: undefined }); // Keep color profile, strip EXIF

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

  return {
    data,
    contentType: formatToContentType(
      format === "original" ? info.format : format,
    ),
    width: info.width,
    height: info.height,
  };
}

/**
 * Negotiate the best output format based on the Accept header.
 * Returns the most efficient format the client supports.
 */
export function negotiateFormat(
  acceptHeader: string | undefined,
  requestedFormat?: TransformOptions["format"],
): TransformOptions["format"] {
  // Explicit format request takes priority
  if (requestedFormat && requestedFormat !== "original") {
    return requestedFormat;
  }

  if (!acceptHeader) return "original";

  // Prefer AVIF > WebP > original (in order of compression efficiency)
  if (acceptHeader.includes("image/avif")) return "avif";
  if (acceptHeader.includes("image/webp")) return "webp";

  return "original";
}

/** Parse and validate transform options from query parameters */
export function parseTransformOptions(
  query: Record<string, unknown>,
): TransformOptions {
  const options: TransformOptions = {};

  // Width: 1–10000 pixels
  if (query["w"] !== undefined) {
    const w = parseInt(String(query["w"]), 10);
    if (!isNaN(w) && w >= 1 && w <= 10000) {
      options.width = w;
    }
  }

  // Height: 1–10000 pixels
  if (query["h"] !== undefined) {
    const h = parseInt(String(query["h"]), 10);
    if (!isNaN(h) && h >= 1 && h <= 10000) {
      options.height = h;
    }
  }

  // Format
  if (query["fmt"] !== undefined) {
    const fmt = String(query["fmt"]).toLowerCase();
    if (["webp", "avif", "png", "jpeg"].includes(fmt)) {
      options.format = fmt as TransformOptions["format"];
    }
  }

  // Quality: 1–100
  if (query["q"] !== undefined) {
    const q = parseInt(String(query["q"]), 10);
    if (!isNaN(q) && q >= 1 && q <= 100) {
      options.quality = q;
    }
  }

  // Fit mode
  if (query["fit"] !== undefined) {
    const fit = String(query["fit"]).toLowerCase();
    if (["cover", "contain", "fill", "inside", "outside"].includes(fit)) {
      options.fit = fit as TransformOptions["fit"];
    }
  }

  return options;
}

/** Check if transform options are effectively empty (no transforms to apply) */
function isEmptyTransform(options: TransformOptions): boolean {
  return (
    options.width === undefined &&
    options.height === undefined &&
    (options.format === undefined || options.format === "original") &&
    options.quality === undefined &&
    options.fit === undefined
  );
}

/** Map Sharp format strings to MIME content types */
function formatToContentType(format: string): string {
  const map: Record<string, string> = {
    webp: "image/webp",
    avif: "image/avif",
    png: "image/png",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    tiff: "image/tiff",
  };
  return map[format] ?? "application/octet-stream";
}
