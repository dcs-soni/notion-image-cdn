// =============================================================================
// Upstream Fetcher — Security Layers 3, 4, 5, 6, 7
// =============================================================================
// Fetches images from Notion's S3 with multiple security layers:
//   Layer 3: Content-Type validation (only image/* MIME types)
//   Layer 4: Response size limit (configurable, default 25MB)
//   Layer 5: Upstream timeout via AbortController (default 15s)
//   Layer 6: Chunked read with size enforcement (prevent Content-Length lies)
//   Layer 7: No header forwarding (only minimal headers sent upstream)
// =============================================================================

export interface FetchResult {
  data: Buffer;
  contentType: string;
  originalSize: number;
}

export interface FetchError {
  error: true;
  status: number;
  code: string;
  message: string;
}

export type FetchOutcome = FetchResult | FetchError;

/** Minimal set of headers sent to upstream — Layer 7: no header forwarding */
const UPSTREAM_HEADERS: Record<string, string> = {
  'User-Agent': 'NotionImageCDN/1.0',
  Accept: 'image/*',
};

/**
 * Fetch an image from upstream URL with full security validation.
 * Returns the image data as a Buffer, or an error object.
 *
 * Redirects are handled manually (max 5 hops). Each redirect target
 * is validated against the domain allowlist to prevent SSRF via
 * open-redirect chains.
 */
export async function fetchUpstreamImage(
  url: string,
  options: {
    timeoutMs: number;
    maxSizeBytes: number;
    allowedDomains?: Set<string>;
  },
): Promise<FetchOutcome> {
  const MAX_REDIRECTS = 5;

  // Layer 5: AbortController for upstream timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    let currentUrl = url;

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const response = await fetch(currentUrl, {
        method: 'GET',
        headers: UPSTREAM_HEADERS, // Layer 7: minimal headers, no forwarding
        signal: controller.signal,
        redirect: 'manual', // Handle redirects ourselves for SSRF safety
      });

      // ---- Handle redirects manually ----
      if (isRedirect(response.status)) {
        const location = response.headers.get('location');
        if (!location) {
          return {
            error: true,
            status: 502,
            code: 'INVALID_REDIRECT',
            message: `Upstream returned ${response.status} without a Location header`,
          };
        }

        // Resolve relative redirects against current URL
        let redirectUrl: URL;
        try {
          redirectUrl = new URL(location, currentUrl);
        } catch {
          return {
            error: true,
            status: 502,
            code: 'INVALID_REDIRECT',
            message: 'Upstream returned an invalid redirect Location',
          };
        }

        // Security: validate the redirect target against the allowlist
        if (options.allowedDomains) {
          const { validateImageUrl } = await import('./validator.js');
          const validation = validateImageUrl(redirectUrl.href, options.allowedDomains);
          if (!validation.valid) {
            return {
              error: true,
              status: 403,
              code: 'REDIRECT_BLOCKED',
              message: `Redirect to ${redirectUrl.hostname} blocked: ${validation.error}`,
            };
          }
        }

        currentUrl = redirectUrl.href;
        continue;
      }

      // ---- Too many redirects ----
      // (This is a guard — we'll only reach here if the loop exhausts)
      // Actually, if we're here the response is NOT a redirect, so process it.

      if (!response.ok) {
        return {
          error: true,
          status: response.status === 403 ? 502 : response.status,
          code: 'UPSTREAM_ERROR',
          message: `Upstream returned HTTP ${response.status}`,
        };
      }

      // Layer 3: Content-Type validation — only allow image/* MIME types
      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.startsWith('image/')) {
        return {
          error: true,
          status: 400,
          code: 'INVALID_CONTENT_TYPE',
          message: `Upstream returned non-image Content-Type: ${contentType}`,
        };
      }

      // Layer 4 + 6: Read body in chunks with size enforcement
      // Don't trust Content-Length header (could lie), count actual bytes
      const declaredSize = parseInt(response.headers.get('content-length') ?? '0', 10);

      // Quick reject if declared size exceeds limit (but still verify during streaming)
      if (declaredSize > options.maxSizeBytes) {
        return {
          error: true,
          status: 413,
          code: 'IMAGE_TOO_LARGE',
          message: `Image size (${declaredSize} bytes) exceeds maximum of ${options.maxSizeBytes} bytes`,
        };
      }

      if (!response.body) {
        return {
          error: true,
          status: 502,
          code: 'EMPTY_RESPONSE',
          message: 'Upstream returned empty response body',
        };
      }

      // Layer 6: Chunked read with running byte count
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;
      const reader = response.body.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        totalBytes += value.byteLength;

        // Layer 4: Enforce size limit during streaming (catch Content-Length lies)
        if (totalBytes > options.maxSizeBytes) {
          reader.cancel();
          return {
            error: true,
            status: 413,
            code: 'IMAGE_TOO_LARGE',
            message: `Image exceeded maximum size of ${options.maxSizeBytes} bytes during transfer`,
          };
        }

        chunks.push(value);
      }

      if (totalBytes === 0) {
        return {
          error: true,
          status: 502,
          code: 'EMPTY_BODY',
          message: 'Upstream returned zero bytes',
        };
      }

      // Assemble chunks into a single Buffer
      const data = Buffer.concat(chunks);

      return {
        data,
        contentType: normalizeContentType(contentType),
        originalSize: data.length,
      };
    }

    // If we exhausted all redirect hops
    return {
      error: true,
      status: 502,
      code: 'TOO_MANY_REDIRECTS',
      message: `Upstream exceeded maximum of ${MAX_REDIRECTS} redirects`,
    };
  } catch (err: unknown) {
    // Layer 5: Handle timeout
    if (err instanceof DOMException && err.name === 'AbortError') {
      return {
        error: true,
        status: 504,
        code: 'UPSTREAM_TIMEOUT',
        message: `Upstream fetch timed out after ${options.timeoutMs}ms`,
      };
    }

    // Network errors
    const message = err instanceof Error ? err.message : 'Unknown fetch error';
    return {
      error: true,
      status: 502,
      code: 'FETCH_FAILED',
      message: `Failed to fetch from upstream: ${message}`,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Check if an HTTP status code is a redirect */
function isRedirect(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

/**
 * Normalize Content-Type to a clean MIME type without parameters.
 * e.g., "image/jpeg; charset=utf-8" → "image/jpeg"
 */
function normalizeContentType(raw: string): string {
  const semicolonIndex = raw.indexOf(';');
  const mimeType = semicolonIndex >= 0 ? raw.slice(0, semicolonIndex) : raw;
  return mimeType.trim().toLowerCase();
}

/** Type guard to check if a FetchOutcome is an error */
export function isFetchError(result: FetchOutcome): result is FetchError {
  return 'error' in result && result.error === true;
}
