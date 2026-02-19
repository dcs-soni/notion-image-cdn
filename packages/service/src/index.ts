import { createServer } from './server.js';

async function main() {
  const server = await createServer();

  const shutdown = async (signal: string) => {
    server.log.info({ signal }, 'Received shutdown signal, closing gracefully...');
    try {
      await server.close();
      server.log.info('Server closed successfully');
      process.exit(0);
    } catch (err) {
      server.log.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    server.log.fatal({ reason }, 'Unhandled promise rejection');
    process.exit(1);
  });

  process.on('uncaughtException', (err) => {
    server.log.fatal({ err }, 'Uncaught exception');
    process.exit(1);
  });

  try {
    const config = server.config;
    await server.listen({ port: config.PORT, host: config.HOST });
    server.log.info(`Notion Image CDN service running at http://${config.HOST}:${config.PORT}`);
    server.log.info(`   Storage: ${server.storage.name()}`);
    server.log.info(`   Cache: ${server.edgeCache?.name() ?? 'disabled'}`);
    server.log.info(`   Rate limit: ${config.RATE_LIMIT_PER_MINUTE} req/min`);
  } catch (err) {
    server.log.fatal({ err }, 'Failed to start server');
    process.exit(1);
  }
}

main();
