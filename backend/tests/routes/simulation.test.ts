import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server.js';
import generatorService from '../../src/services/generator.service.js';
import { MONITORED_INTEGRATIONS } from '../../src/config/telemetry.config.js';

describe('Simulation Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApp();
    // Stop the background interval during tests to prevent async side-effects
    generatorService.stop();
    // Reset scenarios to normal before each test
    for (const integration of MONITORED_INTEGRATIONS) {
      generatorService.setScenario(integration.id, 'normal');
    }
  });

  afterEach(async () => {
    generatorService.stop();
    await app.close();
  });

  describe('POST /simulate', () => {
    it('should return 400 if scenario parameter is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/simulate',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as { message: string };
      expect(body.message).toContain('Missing required body parameter');
    });

    it('should return 400 if scenario is invalid', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/simulate',
        payload: { scenario: 'invalid-scenario-name' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as { message: string };
      expect(body.message).toContain('Invalid scenario');
    });

    it('should apply valid scenario to all integrations if no integrationId is provided', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/simulate',
        payload: { scenario: 'degradation' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as { status: string; scenario: string; appliedTo: string[] };
      expect(body.status).toBe('success');
      expect(body.scenario).toBe('degradation');
      expect(body.appliedTo).toHaveLength(4);

      // Verify state was set on generator service
      for (const integration of MONITORED_INTEGRATIONS) {
        expect(generatorService.getScenario(integration.id)).toBe('degradation');
      }
    });

    it('should apply valid scenario to a single integration if integrationId is provided', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/simulate',
        payload: { scenario: 'incident', integrationId: 'sap-to-data-platform' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as { status: string; scenario: string; appliedTo: string[] };
      expect(body.status).toBe('success');
      expect(body.appliedTo).toEqual(['sap-to-data-platform']);

      // Verify specific integration has 'incident' scenario, others remain 'normal'
      expect(generatorService.getScenario('sap-to-data-platform')).toBe('incident');
      expect(generatorService.getScenario('salesforce-to-crm')).toBe('normal');
    });

    it('should return 404 if integrationId is not found', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/simulate',
        payload: { scenario: 'incident', integrationId: 'non-existent-id' },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
