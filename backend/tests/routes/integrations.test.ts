import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server.js';
import firestoreService from '../../src/services/firestore.service.js';
import type { Incident } from '../../src/models/incident.model.js';
import type { Integration } from '../../src/models/integration.model.js';

describe('Integrations Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApp();
    firestoreService.clearMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /integrations', () => {
    it('should return list of integrations with healthy statuses when no active incidents exist', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/integrations',
      });

      expect(response.statusCode).toBe(200);
      const list = JSON.parse(response.body) as Integration[];
      expect(list).toHaveLength(4);
      
      const sap = list.find((i) => i.id === 'sap-to-data-platform');
      expect(sap).toBeDefined();
      expect(sap?.status).toBe('healthy');
      expect(sap?.queueDepthCurrent).toBe(0);
      expect(sap?.dlqCountCurrent).toBe(0);
    });

    it('should return degraded/failed status when active incidents exist', async () => {
      const activeIncident: Incident = {
        id: 'inc-sap-fail',
        integrationId: 'sap-to-data-platform',
        integrationName: 'SAP -> Data Platform',
        severity: 'critical',
        status: 'active',
        detectedAt: new Date().toISOString(),
        triggerReason: 'Spike in error rate',
        metricsSnapshot: {
          latencyMs: 1800,
          errorRate: 0.45,
          queueDepth: 550,
          dlqCount: 22,
        },
      };

      await firestoreService.createIncident(activeIncident);

      const response = await app.inject({
        method: 'GET',
        url: '/integrations',
      });

      expect(response.statusCode).toBe(200);
      const list = JSON.parse(response.body) as Integration[];
      const sap = list.find((i) => i.id === 'sap-to-data-platform');
      
      expect(sap?.status).toBe('failed');
      expect(sap?.latencyCurrentMs).toBe(1800);
      expect(sap?.errorRateCurrent).toBe(0.45);
      expect(sap?.queueDepthCurrent).toBe(550);
      expect(sap?.dlqCountCurrent).toBe(22);

      const salesforce = list.find((i) => i.id === 'salesforce-to-crm');
      expect(salesforce?.status).toBe('healthy');
    });
  });

  describe('GET /integrations/:id', () => {
    it('should return specific integration details', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/integrations/shopify-to-erp',
      });

      expect(response.statusCode).toBe(200);
      const integration = JSON.parse(response.body) as Integration;
      expect(integration.id).toBe('shopify-to-erp');
      expect(integration.name).toBe('Shopify -> NetSuite ERP');
    });

    it('should return 404 if integration does not exist', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/integrations/non-existent-integration',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /integrations/:id/health', () => {
    it('should return health and risk prediction metrics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/integrations/sap-to-data-platform/health',
      });

      expect(response.statusCode).toBe(200);
      const health = JSON.parse(response.body) as {
        integrationId: string;
        status: string;
        riskScore: number;
        riskLevel: string;
      };

      expect(health.integrationId).toBe('sap-to-data-platform');
      expect(health.status).toBe('healthy');
      // Mock returns riskScore of 0.84 for sap-to-data-platform
      expect(health.riskScore).toBe(0.84);
      expect(health.riskLevel).toBe('high');
    });
  });
});
