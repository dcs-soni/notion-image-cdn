// =============================================================================
// Shared Types — Notion Image CDN Service
// =============================================================================

/** Metadata stored alongside a cached image in persistent storage */
export interface ImageMetadata {
  /** Original Notion S3 URL that was fetched */
  originalUrl: string;
  /** MIME type of the stored image (e.g., "image/webp") */
  contentType: string;
  /** Size of the original image in bytes */
  originalSize: number;
  /** Size of the cached/optimized image in bytes */
  cachedSize: number;
  /** Image width in pixels (after optimization, if applied) */
  width?: number;
  /** Image height in pixels (after optimization, if applied) */
  height?: number;
  /** Notion workspace ID extracted from the URL */
  workspaceId?: string;
  /** Notion block ID extracted from the URL */
  blockId?: string;
  /** ISO 8601 timestamp of when the image was cached */
  cachedAt: string;
  /** ISO 8601 timestamp of the last access */
  lastAccessedAt: string;
  /** Total number of times this cached image has been served */
  accessCount: number;
}

/** Transform options parsed from query parameters */
export interface TransformOptions {
  /** Target width in pixels */
  width?: number;
  /** Target height in pixels */
  height?: number;
  /** Output format */
  format?: 'webp' | 'avif' | 'png' | 'jpeg' | 'original';
  /** Output quality (1-100) */
  quality?: number;
  /** Fit mode for resizing */
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

/** Parsed components of a Notion S3 image URL */
export interface ParsedNotionUrl {
  /** The workspace/account ID segment */
  workspaceId: string;
  /** The block/file ID segment */
  blockId: string;
  /** The filename (e.g., "photo.jpg") */
  filename: string;
  /** The full original URL (without query params for caching purposes) */
  baseUrl: string;
  /** The full original URL including query params */
  fullUrl: string;
}

/** Result of a cache lookup */
export interface CacheResult {
  /** The image data as a Buffer */
  data: Buffer;
  /** Metadata about the cached image */
  metadata: ImageMetadata;
}

/** Standard error response shape */
export interface ErrorResponse {
  error: {
    /** HTTP status code */
    status: number;
    /** Machine-readable error code */
    code: string;
    /** Human-readable error message */
    message: string;
    /** Unique request ID for tracing */
    requestId: string;
  };
}

/** Health check response */
export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  uptime: number;
  timestamp: string;
  checks: {
    storage: 'ok' | 'error';
    cache: 'ok' | 'error' | 'disabled';
  };
}

/** Cache statistics response */
export interface StatsResponse {
  totalCachedImages: number;
  totalStorageBytes: number;
  cacheHitRate: number;
  requestsServed: number;
  bandwidthSaved: number;
}

/** Cache tier indicator */
export type CacheTier = 'L1_BROWSER' | 'L2_EDGE' | 'L3_PERSISTENT' | 'ORIGIN';
