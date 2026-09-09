/**
 * IntegriSense AI — Health Route
 *
 * GET /health
 *
 * Returns the API liveness status.
 * Used by:
 *   - Cloud Run health checks (startup, liveness, readiness probes)
 *   - Load balancer health probes
 *   - Monitoring dashboards
 *   - CI/CD smoke tests
 *
 * Azure equivalent:
 *   Similar to the health probe endpoint in Azure Container Apps or
 *   the /health route in Azure API Management backend checks.
 */

import type { FastifyInstance } from 'fastify';
import { createLogger } from '../utils/logger.js';
import { env } from '../config/env.js';

const log = createLogger('health-route');

/**
 * Health response shape.
 * Kept intentionally minimal — do NOT expose internal system state
 * (e.g., database connection details) in a public health endpoint.
 */
export interface HealthResponse {
  status: 'healthy';
  service: string;
  environment: string;
}

/**
 * JSON schema for the health response.
 * Fastify uses this for serialization optimization and validation.
 */
const healthResponseSchema = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['healthy'] },
    service: { type: 'string' },
    environment: { type: 'string', enum: ['development', 'staging', 'production', 'test'] },
  },
  required: ['status', 'service', 'environment'],
} as const;

/**
 * Register the /health route on the Fastify instance.
 *
 * @param app - The Fastify application instance
 */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Reply: HealthResponse }>(
    '/health',
    {
      schema: {
        response: {
          200: healthResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      log.debug('Health check requested');

      const response: HealthResponse = {
        status: 'healthy',
        service: 'integrisense-api',
        environment: env.NODE_ENV,
      };

      return reply.status(200).send(response);
    },
  );
}
