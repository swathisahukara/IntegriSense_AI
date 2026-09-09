/**
 * IntegriSense AI — Simulation Routes
 *
 * REST API endpoints for triggering synthetic failure scenarios (for demos and testing).
 *
 * Endpoints:
 *   - POST /simulate
 */

import type { FastifyInstance } from 'fastify';
import generatorService from '../services/generator.service.js';
import { TELEMETRY_SCENARIOS } from '../config/telemetry.config.js';
import { ValidationError } from '../utils/errors.js';

export async function simulationRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /simulate
   * Triggers a synthetic telemetry degradation or incident scenario.
   */
  app.post<{
    Body: {
      scenario: 'normal' | 'degradation' | 'incident' | 'cascading';
      integrationId?: string;
    };
  }>(
    '/simulate',
    async (request, reply) => {
      const { scenario, integrationId } = request.body || {};

      if (!scenario) {
        throw new ValidationError("Missing required body parameter: 'scenario'");
      }

      if (!TELEMETRY_SCENARIOS[scenario]) {
        throw new ValidationError(
          `Invalid scenario: '${scenario}'. Must be one of: normal, degradation, incident, cascading.`
        );
      }

      const appliedTo = await generatorService.applyScenario(scenario, integrationId);

      return reply.status(200).send({
        status: 'success',
        message: integrationId
          ? `Scenario '${scenario}' applied to integration '${integrationId}'`
          : `Scenario '${scenario}' applied to all integrations`,
        scenario,
        appliedTo,
      });
    },
  );
}

export default simulationRoutes;
