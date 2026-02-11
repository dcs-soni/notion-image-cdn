// =============================================================================
// Filesystem Storage Backend
// =============================================================================
// Local filesystem storage for self-hosted deployments and development.
// Images are stored as files, metadata as sidecar JSON files.
//
// Directory structure:
//   <CACHE_DIR>/<first 2 chars of key>/<key>.bin    — image data
//   <CACHE_DIR>/<first 2 chars of key>/<key>.json   — metadata
//
// The first 2 chars of the hash are used as a directory prefix to avoid
// having millions of files in a single directory (filesystem performance).
// =============================================================================

import { mkdir, readFile, writeFile, unlink, readdir, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { ImageMetadata } from '../types/index.js';
import type { StorageBackend, StorageGetResult } from './interface.js';

export class FilesystemStorage implements StorageBackend {
  private readonly baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  name(): string {
    return `filesystem:${this.baseDir}`;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await mkdir(this.baseDir, { recursive: true });
      return true;
    } catch {
      return false;
    }
  }

  async get(key: string): Promise<StorageGetResult | null> {
    const sanitizedKey = this.sanitizeKey(key);
    const dataPath = this.dataPath(sanitizedKey);
    const metaPath = this.metaPath(sanitizedKey);

    try {
      const [data, metaRaw] = await Promise.all([readFile(dataPath), readFile(metaPath, 'utf-8')]);

      const metadata: ImageMetadata = JSON.parse(metaRaw);

      // Update access metadata
      metadata.lastAccessedAt = new Date().toISOString();
      metadata.accessCount = (metadata.accessCount ?? 0) + 1;

      // Fire-and-forget metadata update (don't block the response)
      writeFile(metaPath, JSON.stringify(metadata, null, 2)).catch(() => {
        // Silently ignore metadata update failures
      });

      return { data, metadata };
    } catch (err: unknown) {
      // File not found is expected (cache miss)
      if (isNodeError(err) && err.code === 'ENOENT') {
        return null;
      }
      throw err;
    }
  }

  async put(key: string, data: Buffer, metadata: ImageMetadata): Promise<void> {
    const sanitizedKey = this.sanitizeKey(key);
    const dataPath = this.dataPath(sanitizedKey);
    const metaPath = this.metaPath(sanitizedKey);

    // Ensure parent directory exists
    await mkdir(dirname(dataPath), { recursive: true });

    // Write data and metadata atomically (as much as filesystem allows)
    await Promise.all([
      writeFile(dataPath, data),
      writeFile(metaPath, JSON.stringify(metadata, null, 2)),
    ]);
  }

  async delete(key: string): Promise<void> {
    const sanitizedKey = this.sanitizeKey(key);

    await Promise.allSettled([
      unlink(this.dataPath(sanitizedKey)),
      unlink(this.metaPath(sanitizedKey)),
    ]);
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    const sanitizedPrefix = this.sanitizeKey(prefix);
    // For filesystem, we need to walk the directory and find matching files
    // This is inherently slower than S3's prefix-based deletion
    try {
      const bucketDir = join(this.baseDir, sanitizedPrefix.substring(0, 2));
      const entries = await readdir(bucketDir);

      const deletePromises = entries
        .filter((entry) => entry.startsWith(sanitizedPrefix.substring(2)))
        .map((entry) => unlink(join(bucketDir, entry)).catch(() => {}));

      await Promise.allSettled(deletePromises);
    } catch {
      // Directory doesn't exist = nothing to delete
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await access(this.dataPath(this.sanitizeKey(key)));
      return true;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Sanitize cache key to prevent path traversal attacks.
   * Only allow alphanumeric, hyphens, underscores, and forward slashes.
   * Replace everything else with underscores.
   */
  private sanitizeKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9\-_/]/g, '_');
  }

  /** Build the path for image data file */
  private dataPath(sanitizedKey: string): string {
    const bucket = sanitizedKey.substring(0, 2);
    const rest = sanitizedKey.substring(2).replace(/\//g, '_');
    return join(this.baseDir, bucket, `${rest}.bin`);
  }

  /** Build the path for metadata sidecar file */
  private metaPath(sanitizedKey: string): string {
    const bucket = sanitizedKey.substring(0, 2);
    const rest = sanitizedKey.substring(2).replace(/\//g, '_');
    return join(this.baseDir, bucket, `${rest}.json`);
  }
}

/** Type guard for Node.js errors with error codes */
function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err;
}
