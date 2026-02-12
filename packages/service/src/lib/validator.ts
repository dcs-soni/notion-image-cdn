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
export function validateImageUrl(rawUrl: string, allowedDomains: Set<string>): ValidationResult {
  // Check URL length before parsing (prevent ReDoS / memory attacks)
  if (!rawUrl || rawUrl.length === 0) {
    return { valid: false, error: 'URL is required', errorCode: 'MISSING_URL' };
  }

  if (rawUrl.length > MAX_URL_LENGTH) {
    return {
      valid: false,
      error: `URL exceeds maximum length of ${MAX_URL_LENGTH} characters`,
      errorCode: 'URL_TOO_LONG',
    };
  }

  // Parse URL safely — URL constructor throws on malformed input
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return {
      valid: false,
      error: 'Invalid URL format',
      errorCode: 'INVALID_URL',
    };
  }

  // Layer 2: HTTPS-only (prevent downgrade attacks, MitM)
  if (parsed.protocol !== 'https:') {
    return {
      valid: false,
      error: 'Only HTTPS URLs are allowed',
      errorCode: 'HTTPS_REQUIRED',
    };
  }

  // Security: Reject URLs with embedded credentials (user:pass@host)
  if (parsed.username || parsed.password) {
    return {
      valid: false,
      error: 'URLs with embedded credentials are not allowed',
      errorCode: 'CREDENTIALS_IN_URL',
    };
  }

  // Security: Reject URLs targeting private/internal IPs
  const hostname = parsed.hostname.toLowerCase();
  if (isPrivateHost(hostname)) {
    return {
      valid: false,
      error: 'URLs targeting private/internal hosts are not allowed',
      errorCode: 'PRIVATE_HOST',
    };
  }

  // Layer 1: Domain allowlist
  if (!allowedDomains.has(hostname)) {
    return {
      valid: false,
      error: `Domain "${hostname}" is not in the allowlist`,
      errorCode: 'DOMAIN_NOT_ALLOWED',
    };
  }

  return { valid: true };
}

/**
 * Detect private/internal hostnames and IP addresses.
 * Prevents SSRF attacks targeting internal services.
 *
 * Uses numeric IPv4 parsing to catch bypass vectors like short-form IPs
 * (e.g., 127.1), and covers all RFC 1918 / RFC 5735 ranges.
 */
function isPrivateHost(hostname: string): boolean {
  // ---- Hostname-based checks (fast path) ----
  if (hostname === 'localhost') return true;

  // Internal TLDs
  if (hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    return true;
  }

  // ---- IPv6 checks ----
  // Strip brackets that URL parser may leave: [::1] → ::1
  const bareHost =
    hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;

  if (bareHost === '::1' || bareHost === '::') return true; // Loopback / unspecified
  if (bareHost.startsWith('fc') || bareHost.startsWith('fd')) return true; // Unique-local (fc00::/7)
  if (bareHost.toLowerCase().startsWith('fe80')) return true; // Link-local (fe80::/10)
  // IPv4-mapped IPv6: ::ffff:127.0.0.1
  if (bareHost.toLowerCase().startsWith('::ffff:')) {
    const mapped = bareHost.slice(7); // extract the IPv4 part
    const ip = parseIPv4(mapped);
    if (ip !== null && isPrivateIPv4(ip)) return true;
  }

  // ---- IPv4 checks (numeric, covers short-form like 127.1) ----
  const ip = parseIPv4(hostname);
  if (ip !== null && isPrivateIPv4(ip)) return true;

  return false;
}

/**
 * Parse a dotted-decimal IPv4 string into a 32-bit unsigned integer.
 * Returns null if the string is not a valid IPv4 address.
 * Only accepts strict decimal octets (0-255) to avoid octal/hex tricks.
 */
function parseIPv4(host: string): number | null {
  // Must only contain digits and dots
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null;

  const parts = host.split('.');
  if (parts.length !== 4) return null;

  let result = 0;
  for (const part of parts) {
    // Reject leading zeros (prevents octal interpretation like 0177)
    if (part.length > 1 && part.startsWith('0')) return null;
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) return null;
    result = (result << 8) | octet;
  }

  // Ensure unsigned 32-bit
  return result >>> 0;
}

/**
 * Check a 32-bit IPv4 address against known private/reserved ranges.
 *
 *   0.0.0.0/8       — Current network (RFC 1122)
 *   10.0.0.0/8      — Private (RFC 1918)
 *   100.64.0.0/10   — Carrier-grade NAT (RFC 6598)
 *   127.0.0.0/8     — Loopback (RFC 1122)
 *   169.254.0.0/16  — Link-local (RFC 3927) + cloud metadata
 *   172.16.0.0/12   — Private (RFC 1918)
 *   192.0.0.0/24    — IETF Protocol Assignments (RFC 6890)
 *   192.0.2.0/24    — TEST-NET-1 (RFC 5737)
 *   192.168.0.0/16  — Private (RFC 1918)
 *   198.18.0.0/15   — Benchmarking (RFC 2544)
 *   198.51.100.0/24 — TEST-NET-2 (RFC 5737)
 *   203.0.113.0/24  — TEST-NET-3 (RFC 5737)
 *   224.0.0.0/4     — Multicast (RFC 5771)
 *   240.0.0.0/4     — Reserved / Broadcast
 */
function isPrivateIPv4(ip: number): boolean {
  return (
    ip >>> 24 === 0 || // 0.0.0.0/8
    ip >>> 24 === 10 || // 10.0.0.0/8
    ip >>> 22 === ((100 << 2) | 1) || // 100.64.0.0/10  (first 10 bits = 0b0110010001)
    ip >>> 24 === 127 || // 127.0.0.0/8
    ip >>> 16 === 0xa9fe || // 169.254.0.0/16
    ip >>> 20 === 0xac1 || // 172.16.0.0/12
    ip >>> 8 === 0xc00000 || // 192.0.0.0/24
    ip >>> 8 === 0xc00002 || // 192.0.2.0/24
    ip >>> 16 === 0xc0a8 || // 192.168.0.0/16
    ip >>> 17 === ((198 << 7) | 9) || // 198.18.0.0/15
    ip >>> 8 === 0xc63364 || // 198.51.100.0/24
    ip >>> 8 === 0xcb0071 || // 203.0.113.0/24
    ip >>> 28 === 0xe || // 224.0.0.0/4  (multicast)
    ip >>> 28 === 0xf // 240.0.0.0/4  (reserved/broadcast)
  );
}
