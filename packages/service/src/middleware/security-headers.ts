import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import fastifyHelmet from '@fastify/helmet';

const securityHeadersPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(fastifyHelmet, {
    // Strict CSP, this service only serves images and JSON, never HTML pages
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        imgSrc: ["'self'"],
        styleSrc: ["'none'"],
        scriptSrc: ["'none'"],
      },
    },

    crossOriginResourcePolicy: { policy: 'cross-origin' },

    crossOriginEmbedderPolicy: false,

    xFrameOptions: { action: 'deny' },

    referrerPolicy: { policy: 'no-referrer' },

    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  });

  // Permissions-Policy is not covered by helmet adding manually
  fastify.addHook('onSend', async (_request, reply) => {
    reply.header(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    );
  });
};

export default fp(securityHeadersPlugin, {
  name: 'security-headers',
  fastify: '5.x',
});
