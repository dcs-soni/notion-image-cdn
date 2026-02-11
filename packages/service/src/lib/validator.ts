// =============================================================================
// URL Validator — Security Layers 1 & 2
// =============================================================================
// Layer 1: Domain allowlist — only Notion S3 / approved domains can be proxied
// Layer 2: HTTPS-only — reject any non-HTTPS upstream URL
//
// Uses URL constructor (not regex) for safe parsing. Rejects URLs that:
// - Use non-HTTPS protocol
// - Target a domain not in the allowlist
// - Exceed maximum length (prevent memory abuse)
// - Contain authentication credentials in the URL
// =============================================================================

const MAX_URL_LENGTH = 4096;

export interface ValidationResult {
  valid: boolean;
  error?: string;
  errorCode?: string;
}

/**
 * Validate that an image URL is safe to proxy.
 * Returns { valid: true } if OK, or { valid: false, error, errorCode } if not.
 */
export function validateImageUrl(
  rawUrl: string,
  allowedDomains: Set<string>,
): ValidationResult {
  // Check URL length before parsing (prevent ReDoS / memory attacks)
  if (!rawUrl || rawUrl.length === 0) {
    return { valid: false, error: "URL is required", errorCode: "MISSING_URL" };
  }

  if (rawUrl.length > MAX_URL_LENGTH) {
    return {
      valid: false,
      error: `URL exceeds maximum length of ${MAX_URL_LENGTH} characters`,
      errorCode: "URL_TOO_LONG",
    };
  }

  // Parse URL safely — URL constructor throws on malformed input
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return {
      valid: false,
      error: "Invalid URL format",
      errorCode: "INVALID_URL",
    };
  }

  // Layer 2: HTTPS-only (prevent downgrade attacks, MitM)
  if (parsed.protocol !== "https:") {
    return {
      valid: false,
      error: "Only HTTPS URLs are allowed",
      errorCode: "HTTPS_REQUIRED",
    };
  }

  // Security: Reject URLs with embedded credentials (user:pass@host)
  if (parsed.username || parsed.password) {
    return {
      valid: false,
      error: "URLs with embedded credentials are not allowed",
      errorCode: "CREDENTIALS_IN_URL",
    };
  }

  // Security: Reject URLs targeting private/internal IPs
  const hostname = parsed.hostname.toLowerCase();
  if (isPrivateHost(hostname)) {
    return {
      valid: false,
      error: "URLs targeting private/internal hosts are not allowed",
      errorCode: "PRIVATE_HOST",
    };
  }

  // Layer 1: Domain allowlist
  if (!allowedDomains.has(hostname)) {
    return {
      valid: false,
      error: `Domain "${hostname}" is not in the allowlist`,
      errorCode: "DOMAIN_NOT_ALLOWED",
    };
  }

  return { valid: true };
}

/**
 * Detect private/internal hostnames and IP addresses.
 * Prevents SSRF attacks targeting internal services.
 */
function isPrivateHost(hostname: string): boolean {
  // Localhost variants
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "0.0.0.0"
  ) {
    return true;
  }

  // Private IPv4 ranges
  if (hostname.match(/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) return true;
  if (hostname.match(/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/))
    return true;
  if (hostname.match(/^192\.168\.\d{1,3}\.\d{1,3}$/)) return true;

  // Link-local
  if (hostname.match(/^169\.254\.\d{1,3}\.\d{1,3}$/)) return true;

  // Metadata endpoints (cloud provider SSRF targets)
  if (hostname === "169.254.169.254") return true;

  // Internal TLDs
  if (hostname.endsWith(".local") || hostname.endsWith(".internal"))
    return true;

  return false;
}
