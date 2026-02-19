import { validateImageUrl } from './validator.js';

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

const UPSTREAM_HEADERS: Record<string, string> = {
  'User-Agent': 'NotionImageCDN/1.0',
  Accept: 'image/*',
};

// Fetch an image from upstream URL with full security validation.
// Returns the image data as a Buffer, or an error object.
// Redirects are followed manually (max 5 hops). Each redirect target
// is validated against the domain allowlist to prevent SSRF via open-redirect chains.

export async function fetchUpstreamImage(
  url: string,
  options: {
    timeoutMs: number;
    maxSizeBytes: number;
    allowedDomains?: Set<string>;
  },
): Promise<FetchOutcome> {
  const MAX_REDIRECTS = 5;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    let currentUrl = url;

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const response = await fetch(currentUrl, {
        method: 'GET',
        headers: UPSTREAM_HEADERS,
        signal: controller.signal,
        redirect: 'manual',
      });

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

        if (options.allowedDomains) {
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

      if (!response.ok) {
        return {
          error: true,
          status: response.status === 403 ? 502 : response.status,
          code: 'UPSTREAM_ERROR',
          message: `Upstream returned HTTP ${response.status}`,
        };
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.startsWith('image/')) {
        return {
          error: true,
          status: 400,
          code: 'INVALID_CONTENT_TYPE',
          message: `Upstream returned non-image Content-Type: ${contentType}`,
        };
      }

      // Don't trust Content-Length — count actual bytes during streaming
      const declaredSize = parseInt(response.headers.get('content-length') ?? '0', 10);

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

      const chunks: Uint8Array[] = [];
      let totalBytes = 0;
      const reader = response.body.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        totalBytes += value.byteLength;

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

      const data = Buffer.concat(chunks);

      return {
        data,
        contentType: normalizeContentType(contentType),
        originalSize: data.length,
      };
    }

    return {
      error: true,
      status: 502,
      code: 'TOO_MANY_REDIRECTS',
      message: `Upstream exceeded maximum of ${MAX_REDIRECTS} redirects`,
    };
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return {
        error: true,
        status: 504,
        code: 'UPSTREAM_TIMEOUT',
        message: `Upstream fetch timed out after ${options.timeoutMs}ms`,
      };
    }

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

function isRedirect(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

function normalizeContentType(raw: string): string {
  const semicolonIndex = raw.indexOf(';');
  const mimeType = semicolonIndex >= 0 ? raw.slice(0, semicolonIndex) : raw;
  return mimeType.trim().toLowerCase();
}

export function isFetchError(result: FetchOutcome): result is FetchError {
  return 'error' in result && result.error === true;
}
