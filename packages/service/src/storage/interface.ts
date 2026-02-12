// =============================================================================
// Storage Interface — Strategy Pattern
// =============================================================================
// All persistent storage backends implement this interface.
// This enables swapping between filesystem, S3, R2, MinIO, Backblaze B2
// without changing any business logic.
// =============================================================================

import type { ImageMetadata } from '../types/index.js';

export interface StorageGetResult {
  /** Raw image data */
  data: Buffer;
  /** Stored metadata */
  metadata: ImageMetadata;
}

export interface StorageBackend {
  /** Retrieve a cached image by key. Returns null if not found. */
  get(key: string): Promise<StorageGetResult | null>;

  /** Store an image with its metadata. Overwrites if key exists. */
  put(key: string, data: Buffer, metadata: ImageMetadata): Promise<void>;

  /** Delete a single cached image by key. */
  delete(key: string): Promise<void>;

  /** Delete all cached images whose key starts with the given prefix. */
  deleteByPrefix(prefix: string): Promise<void>;

  /** Check if a key exists without reading the full data. */
  exists(key: string): Promise<boolean>;

  /** Get the display name of this storage backend (for health checks / logs). */
  name(): string;

  /** Check if the storage backend is healthy and accessible. */
  healthCheck(): Promise<boolean>;
}
