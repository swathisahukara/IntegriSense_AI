/**
 * IntegriSense AI — Fastify Server
 *
 * Application entry point. Bootstraps Fastify with:
 *   - Structured logging (Pino)
 *   - Security headers (@fastify/helmet)
 *   - CORS (@fastify/cors)
 *   - Environment-validated configuration
 *   - Route registration
 *   - Graceful shutdown handling
 *
 * Cloud Run compatibility:
 *   - Listens on 0.0.0.0 (required by Cloud Run — not just localhost)
 *   - PORT from environment (Cloud Run injects PORT=8080)
 *   - Graceful shutdown on SIGTERM (Cloud Run sends SIGTERM before killing)
 */

import 'dotenv/config';

// Automatically bypass SSL validation locally behind corporate proxy in dev/test environments
if (process.env['NODE_ENV'] === 'development' || process.env['NODE_ENV'] === 'test') {
  process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
}

import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';

import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { healthRoutes } from './routes/health.js';
import { integrationRoutes } from './routes/integrations.js';
import { incidentRoutes } from './routes/incidents.js';
import { riskRoutes } from './routes/risk.js';
import { recoveryRoutes } from './routes/recovery.js';
import { simulationRoutes } from './routes/simulation.js';
import { copilotRoutes } from './routes/copilot.js';
import { slackRoutes } from './routes/slack.js';
import generatorService from './services/generator.service.js';

// ── Application Route Registrar ───────────────────────────────────────────────
async function registerAppRoutes(router: FastifyInstance) {
  await router.register(healthRoutes);
  await router.register(integrationRoutes, { prefix: '/integrations' });
  await router.register(incidentRoutes,    { prefix: '/incidents' });
  await router.register(riskRoutes,        { prefix: '/risk' });
  await router.register(recoveryRoutes,    { prefix: '/recovery' });
  await router.register(simulationRoutes);
  await router.register(copilotRoutes);
  await router.register(slackRoutes,      { prefix: '/slack' });
}

// ── Build Application ─────────────────────────────────────────────────────────

/**
 * Creates and configures the Fastify application.
 * Exported separately so tests can create isolated instances.
 */
export async function buildApp() {
  const isDevelopment = env.NODE_ENV === 'development';

  const app = Fastify({
    // Pass Pino logger instance directly to Fastify using loggerInstance.
    // This is the correct API for providing a pre-configured Pino instance.
    loggerInstance: logger,

    // Generate a unique request ID for every request.
    genReqId: (req) => {
      const existingId = req.headers['x-request-id'];
      return typeof existingId === 'string' ? existingId : crypto.randomUUID();
    },
  });

  // ── Security Headers ────────────────────────────────────────────────────────
  await app.register(helmet, {
    contentSecurityPolicy: !isDevelopment,
  });

  // ── CORS ────────────────────────────────────────────────────────────────────
  await app.register(cors, {
    origin: isDevelopment ? true : env.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
  });

  // ── Routes (Mounted at both root and /api for seamless Cloud Run & Firebase Hosting) ──
  await app.register(registerAppRoutes);
  await app.register(registerAppRoutes, { prefix: '/api' });

  // ── Error Handler ───────────────────────────────────────────────────────────
  app.setErrorHandler((error: FastifyError, request, reply) => {
    const statusCode: number = error.statusCode ?? 500;

    if (statusCode >= 500) {
      request.log.error({ err: error }, 'Internal server error');
    } else {
      request.log.warn({ err: error }, 'Client error');
    }

    return reply.status(statusCode).send({
      statusCode,
      error: error.name,
      message: error.message,
    });
  });

  // ── Not Found Handler ────────────────────────────────────────────────────────
  app.setNotFoundHandler((request, reply) => {
    request.log.warn({ url: request.url, method: request.method }, 'Route not found');
    return reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: `Route ${request.method} ${request.url} not found`,
    });
  });

  return app;
}

// ── Start Server ──────────────────────────────────────────────────────────────

async function start(): Promise<void> {
  const app = await buildApp();

  // Cloud Run REQUIRES listening on 0.0.0.0 (not 127.0.0.1/localhost).
  const address = await app.listen({
    port: env.PORT,
    host: '0.0.0.0',
  });

  logger.info(
    {
      address,
      environment: env.NODE_ENV,
      gcpProject: env.GCP_PROJECT_ID,
    },
    '🚀 IntegriSense API started',
  );

  // Start the synthetic telemetry generator in development / test / staging
  if (env.NODE_ENV !== 'production') {
    generatorService.start();
  }

  // ── Graceful Shutdown ───────────────────────────────────────────────────────
  // Cloud Run sends SIGTERM when it wants to stop the container.
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutdown signal received — closing server gracefully');
    try {
      generatorService.stop();
      await app.close();
      logger.info('Server closed successfully');
      process.exit(0);
    } catch (err: unknown) {
      logger.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

if (env.NODE_ENV !== 'test') {
  await start();
}
