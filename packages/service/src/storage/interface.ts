// Storage Interface — Strategy Pattern

// All persistent storage backends implement this interface.
// This enables swapping between filesystem, S3, R2, MinIO, Backblaze B2
// without changing any business logic.

import type { ImageMetadata } from '../types/index.js';

export interface StorageGetResult {
  data: Buffer;
  metadata: ImageMetadata;
}

export interface StorageBackend {
  get(key: string): Promise<StorageGetResult | null>;
  put(key: string, data: Buffer, metadata: ImageMetadata): Promise<void>;
  delete(key: string): Promise<void>;
  deleteByPrefix(prefix: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  name(): string;
  healthCheck(): Promise<boolean>;
}
