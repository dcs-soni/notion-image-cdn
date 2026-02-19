// S3-Compatible Storage Backend

// Works with AWS S3, Cloudflare R2, MinIO, Backblaze B2 — any S3-compatible
// storage. Metadata is stored as S3 object metadata (custom headers).

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import type { ImageMetadata } from '../types/index.js';
import type { StorageBackend, StorageGetResult } from './interface.js';

export interface S3StorageOptions {
  bucket: string;
  region?: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Prefix for all keys in the bucket (e.g., "cache/") */
  keyPrefix?: string;
}

export class S3Storage implements StorageBackend {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly keyPrefix: string;

  constructor(options: S3StorageOptions) {
    this.bucket = options.bucket;
    this.keyPrefix = options.keyPrefix ?? 'images/';

    this.client = new S3Client({
      region: options.region ?? 'auto',
      endpoint: options.endpoint,
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
      },
      // Required for path-style access with MinIO and some S3-compatible services
      forcePathStyle: !!options.endpoint,
    });
  }

  name(): string {
    return `s3:${this.bucket}`;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: `${this.keyPrefix}.health-check`,
        }),
      );
      return true;
    } catch (err: unknown) {
      // 404 is fine — the health check file doesn't exist, but the bucket is accessible
      if (isS3NotFoundError(err)) return true;
      return false;
    }
  }

  async get(key: string): Promise<StorageGetResult | null> {
    const s3Key = this.resolveKey(key);

    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: s3Key,
        }),
      );

      if (!response.Body) return null;

      // Read the stream into a Buffer
      const chunks: Uint8Array[] = [];
      const stream = response.Body as AsyncIterable<Uint8Array>;
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const data = Buffer.concat(chunks);

      const metadata = deserializeMetadata(response.Metadata ?? {});

      return { data, metadata };
    } catch (err: unknown) {
      if (isS3NotFoundError(err)) return null;
      throw err;
    }
  }

  async put(key: string, data: Buffer, metadata: ImageMetadata): Promise<void> {
    const s3Key = this.resolveKey(key);

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
        Body: data,
        ContentType: metadata.contentType,
        Metadata: serializeMetadata(metadata),
        // Cache-Control on the S3 object itself (not the CDN layer)
        CacheControl: 'public, max-age=2592000', // 30 days
      }),
    );
  }

  async delete(key: string): Promise<void> {
    const s3Key = this.resolveKey(key);

    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
      }),
    );
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    const s3Prefix = this.resolveKey(prefix);

    let continuationToken: string | undefined;

    do {
      const listResponse = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: s3Prefix,
          ContinuationToken: continuationToken,
          MaxKeys: 1000,
        }),
      );

      const deletePromises = (listResponse.Contents ?? []).map((object) => {
        if (!object.Key) return Promise.resolve();
        return this.client.send(
          new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: object.Key,
          }),
        );
      });

      await Promise.allSettled(deletePromises);

      continuationToken = listResponse.NextContinuationToken;
    } while (continuationToken);
  }

  async exists(key: string): Promise<boolean> {
    const s3Key = this.resolveKey(key);

    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: s3Key,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  private resolveKey(key: string): string {
    const sanitized = key.replace(/\.\./g, '').replace(/\/+/g, '/');
    return `${this.keyPrefix}${sanitized}`;
  }
}

/** Serialize ImageMetadata into S3 custom metadata (all values must be strings) */
function serializeMetadata(meta: ImageMetadata): Record<string, string> {
  return {
    'x-original-url': meta.originalUrl,
    'x-content-type': meta.contentType,
    'x-original-size': String(meta.originalSize),
    'x-cached-size': String(meta.cachedSize),
    'x-width': String(meta.width ?? ''),
    'x-height': String(meta.height ?? ''),
    'x-workspace-id': meta.workspaceId ?? '',
    'x-block-id': meta.blockId ?? '',
    'x-cached-at': meta.cachedAt,
    'x-access-count': String(meta.accessCount),
  };
}

function deserializeMetadata(raw: Record<string, string>): ImageMetadata {
  return {
    originalUrl: raw['x-original-url'] ?? '',
    contentType: raw['x-content-type'] ?? 'application/octet-stream',
    originalSize: parseInt(raw['x-original-size'] ?? '0', 10),
    cachedSize: parseInt(raw['x-cached-size'] ?? '0', 10),
    width: raw['x-width'] ? parseInt(raw['x-width'], 10) : undefined,
    height: raw['x-height'] ? parseInt(raw['x-height'], 10) : undefined,
    workspaceId: raw['x-workspace-id'] || undefined,
    blockId: raw['x-block-id'] || undefined,
    cachedAt: raw['x-cached-at'] ?? new Date().toISOString(),
    lastAccessedAt: new Date().toISOString(),
    accessCount: parseInt(raw['x-access-count'] ?? '0', 10),
  };
}

/** Check if an error is an S3 "not found" error */
function isS3NotFoundError(err: unknown): boolean {
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>;
    return (
      e['$metadata'] !== undefined &&
      ((e as { $metadata: { httpStatusCode?: number } })['$metadata'].httpStatusCode === 404 ||
        (e as { name?: string }).name === 'NoSuchKey' ||
        (e as { name?: string }).name === 'NotFound')
    );
  }
  return false;
}
