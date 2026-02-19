import type { FastifyPluginCallback } from 'fastify';
import fp from 'fastify-plugin';

const securityHeadersPlugin: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.addHook('onSend', async (_request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-XSS-Protection', '1; mode=block');
    reply.header(
      'Content-Security-Policy',
      "default-src 'none'; img-src 'self'; style-src 'none'; script-src 'none'",
    );
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    );
    reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  });

  done();
};

export default fp(securityHeadersPlugin, {
  name: 'security-headers',
  fastify: '5.x',
});
