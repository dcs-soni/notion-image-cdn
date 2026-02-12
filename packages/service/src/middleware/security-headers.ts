// =============================================================================
// Security Headers Middleware
// =============================================================================
// Applies hardened response headers to every response. Defense-in-depth
// against XSS, clickjacking, MIME sniffing, and other common web attacks.
// =============================================================================

import type { FastifyPluginCallback } from 'fastify';
import fp from 'fastify-plugin';

const securityHeadersPlugin: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.addHook('onSend', async (_request, reply) => {
    // Prevent MIME type sniffing — browser must trust Content-Type header
    reply.header('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking — block embedding in iframes
    reply.header('X-Frame-Options', 'DENY');

    // XSS protection (legacy browsers)
    reply.header('X-XSS-Protection', '1; mode=block');

    // Strict Content Security Policy — only allow images, nothing else
    reply.header(
      'Content-Security-Policy',
      "default-src 'none'; img-src 'self'; style-src 'none'; script-src 'none'",
    );

    // Referrer policy — don't leak URLs to upstream
    reply.header('Referrer-Policy', 'no-referrer');

    // Permissions policy — disable all browser features
    reply.header(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    );

    // Strict Transport Security (1 year, preload-ready)
    reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  });

  done();
};

export default fp(securityHeadersPlugin, {
  name: 'security-headers',
  fastify: '5.x',
});
