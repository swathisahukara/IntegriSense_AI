/**
 * IntegriSense AI — BigQuery Service Tests
 *
 * Tests the analytical operations (CRUD/Query) using the in-memory/mock fallback.
 */

import { describe, it, expect } from 'vitest';
import { bigqueryService } from '../../src/services/bigquery.service.js';
import type { FailureProbability } from '../../src/models/risk.model.js';

describe('BigQuery Service (Mock Fallback)', () => {
  it('should return mock latency baseline values based on integrationId length', async () => {
    const integrationId = 'sap-to-db'; // length 9
    const baseline = await bigqueryService.getLatencyBaseline(integrationId);

    // Seed calculation: mean = 150 + 9*10 = 240. stddev = 20 + (9%5)*5 = 40.
    expect(baseline).toEqual({
      mean: 240,
      stddev: 40,
    });
  });

  it('should return mock error rate baseline values', async () => {
    const integrationId = 'salesforce'; // length 10
    const baseline = await bigqueryService.getErrorRateBaseline(integrationId);

    // Seed calculation: 0.01 + (10 % 3)*0.01 = 0.02
    expect(baseline).toBeCloseTo(0.02);
  });

  it('should execute mock insert without throwing errors', async () => {
    const testPrediction: FailureProbability = {
      integrationId: 'oracle-finance',
      integrationName: 'Oracle -> Finance API',
      riskScore: 0.05,
      riskLevel: 'low',
      predictedFailureWindowHours: 0,
      confidence: 0.99,
      contributingFactors: [],
      lastUpdated: new Date().toISOString(),
    };

    // Should resolve cleanly in mock mode
    await expect(bigqueryService.insertFailureProbability(testPrediction)).resolves.not.toThrow();
  });

  it('should retrieve mock list of latest failure probabilities', async () => {
    const list = await bigqueryService.getLatestFailureProbabilities();

    expect(list.length).toBe(2);
    expect(list[0]?.integrationId).toBe('salesforce-to-crm');
    expect(list[1]?.integrationId).toBe('sap-to-data-platform');
    expect(list[1]?.riskScore).toBe(0.84);
    expect(list[1]?.riskLevel).toBe('high');
  });

  it('should return empty array when running standard SQL query in mock mode', async () => {
    const result = await bigqueryService.query('SELECT * FROM test');
    expect(result).toEqual([]);
  });
});
