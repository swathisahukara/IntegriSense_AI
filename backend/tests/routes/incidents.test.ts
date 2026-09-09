import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server.js';
import firestoreService from '../../src/services/firestore.service.js';
import type { Incident } from '../../src/models/incident.model.js';

describe('Incidents Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApp();
    firestoreService.clearMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  const incidentActive: Incident = {
    id: 'inc-1',
    integrationId: 'sap-to-data-platform',
    integrationName: 'SAP -> Data Platform',
    severity: 'critical',
    status: 'active',
    detectedAt: '2026-08-16T12:00:00Z',
    triggerReason: 'Latency spikes',
    metricsSnapshot: { latencyMs: 2500, errorRate: 0.1, queueDepth: 200, dlqCount: 5 },
  };

  const incidentResolved: Incident = {
    id: 'inc-2',
    integrationId: 'salesforce-to-crm',
    integrationName: 'Salesforce -> Dynamics CRM',
    severity: 'medium',
    status: 'resolved',
    detectedAt: '2026-08-16T10:00:00Z',
    resolvedAt: '2026-08-16T11:00:00Z',
    triggerReason: 'API failure threshold exceeded',
    metricsSnapshot: { latencyMs: 120, errorRate: 0.08, queueDepth: 0, dlqCount: 0 },
  };

  describe('GET /incidents', () => {
    it('should return empty list when no incidents are in database', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/incidents',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual([]);
    });

    it('should return all incidents ordered by detectedAt descending', async () => {
      await firestoreService.createIncident(incidentResolved);
      await firestoreService.createIncident(incidentActive);

      const response = await app.inject({
        method: 'GET',
        url: '/incidents',
      });

      expect(response.statusCode).toBe(200);
      const list = JSON.parse(response.body) as Incident[];
      expect(list).toHaveLength(2);
      expect(list[0].id).toBe('inc-1'); // incidentActive is newer
      expect(list[1].id).toBe('inc-2'); // incidentResolved is older
    });

    it('should filter active incidents correctly', async () => {
      await firestoreService.createIncident(incidentResolved);
      await firestoreService.createIncident(incidentActive);

      const response = await app.inject({
        method: 'GET',
        url: '/incidents',
        query: { status: 'active' },
      });

      expect(response.statusCode).toBe(200);
      const list = JSON.parse(response.body) as Incident[];
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe('inc-1');
    });

    it('should filter resolved incidents correctly', async () => {
      await firestoreService.createIncident(incidentResolved);
      await firestoreService.createIncident(incidentActive);

      const response = await app.inject({
        method: 'GET',
        url: '/incidents',
        query: { status: 'resolved' },
      });

      expect(response.statusCode).toBe(200);
      const list = JSON.parse(response.body) as Incident[];
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe('inc-2');
    });
  });

  describe('GET /incidents/:id', () => {
    it('should return incident details when it exists', async () => {
      await firestoreService.createIncident(incidentActive);

      const response = await app.inject({
        method: 'GET',
        url: '/incidents/inc-1',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as Incident;
      expect(body.id).toBe('inc-1');
      expect(body.integrationId).toBe('sap-to-data-platform');
    });

    it('should return 404 for non-existent incident', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/incidents/non-existent',
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
