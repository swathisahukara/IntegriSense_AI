/**
 * IntegriSense AI — Risk Prediction Routes
 *
 * REST API endpoints for failure probability predictions and risk forecasting.
 *
 * Endpoints:
 *   - GET /
 */

import type { FastifyInstance } from 'fastify';
import bigqueryService from '../services/bigquery.service.js';

export async function riskRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /
   * Returns failure probability scores for all integrations from the BigQuery analytics service.
   */
  app.get('/', async (request, reply) => {
    try {
      const risks = await bigqueryService.getLatestFailureProbabilities();
      return reply.status(200).send(risks);
    } catch (err: unknown) {
      request.log.error({ err }, 'Error retrieving integration risk metrics');
      throw err;
    }
  });
}

export default riskRoutes;
