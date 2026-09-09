import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server.js';
import type { FailureProbability } from '../../src/models/risk.model.js';

describe('Risk Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /risk', () => {
    it('should return failure probability predictions from bigquery service', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/risk',
      });

      expect(response.statusCode).toBe(200);
      const list = JSON.parse(response.body) as FailureProbability[];
      expect(list).toBeInstanceOf(Array);
      expect(list.length).toBeGreaterThan(0);
      
      const sap = list.find((r) => r.integrationId === 'sap-to-data-platform');
      expect(sap).toBeDefined();
      expect(sap?.riskLevel).toBe('high');
      expect(sap?.riskScore).toBe(0.84);
      expect(sap?.contributingFactors.length).toBeGreaterThan(0);
    });
  });
});
