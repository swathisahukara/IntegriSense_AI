/**
 * IntegriSense AI — Incidents Routes
 *
 * REST API endpoints for operational incident management.
 *
 * Endpoints:
 *   - GET /
 *   - GET /:id
 */

import type { FastifyInstance } from 'fastify';
import firestoreService from '../services/firestore.service.js';

export async function incidentRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /
   * Returns a list of detected incidents. Supports optional filtering by status (active/resolved).
   */
  app.get<{ Querystring: { status?: 'active' | 'resolved' } }>(
    '/',
    async (request, reply) => {
      try {
        const { status } = request.query;
        let incidents;

        if (status === 'active') {
          incidents = await firestoreService.listActiveIncidents();
        } else {
          incidents = await firestoreService.listIncidents();
          if (status === 'resolved') {
            incidents = incidents.filter((inc) => inc.status === 'resolved');
          }
        }

        return reply.status(200).send(incidents);
      } catch (err: unknown) {
        request.log.error({ err }, 'Error listing incidents');
        throw err;
      }
    },
  );

  /**
   * GET /:id
   * Returns full incident details, including metrics snapshot and generated RCA/recovery plans if available.
   */
  app.get<{ Params: { id: string } }>(
    '/:id',
    async (request, reply) => {
      const { id } = request.params;
      try {
        const incident = await firestoreService.getIncident(id);
        return reply.status(200).send(incident);
      } catch (err: unknown) {
        request.log.error({ err, id }, 'Error retrieving incident details');
        throw err;
      }
    },
  );
}

export default incidentRoutes;
