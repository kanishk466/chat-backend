// src/index.ts
// Entry point - starts the Express server.

import app from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';

const server = app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`🚀 Chat API running on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

function shutdown(signal: string): void {
  // eslint-disable-next-line no-console
  console.log(`\n${signal} received - shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    // eslint-disable-next-line no-console
    console.log('✅ Server closed, Prisma disconnected');
    process.exit(0);
  });

  // Force exit if shutdown hangs
  setTimeout(() => {
    // eslint-disable-next-line no-console
    console.error('⚠️ Forced shutdown after timeout');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled rejection:', reason);
});

process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('Uncaught exception:', err);
  shutdown('uncaughtException');
});
