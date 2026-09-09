import { describe, it, expect } from 'vitest';
import AnomalyService from '../../src/services/anomaly.service.js';

describe('Anomaly Service', () => {
  describe('calculateRollingMean', () => {
    it('should return 0 for empty array', () => {
      expect(AnomalyService.calculateRollingMean([])).toBe(0);
    });

    it('should calculate arithmetic mean correctly', () => {
      expect(AnomalyService.calculateRollingMean([10, 20, 30])).toBe(20);
      expect(AnomalyService.calculateRollingMean([1, 2, 3, 4])).toBe(2.5);
    });
  });

  describe('calculateStandardDeviation', () => {
    it('should return 0 for array with 0 or 1 elements', () => {
      expect(AnomalyService.calculateStandardDeviation([], 0)).toBe(0);
      expect(AnomalyService.calculateStandardDeviation([5], 5)).toBe(0);
    });

    it('should calculate sample standard deviation correctly', () => {
      const values = [10, 12, 23, 23, 16, 23, 21, 16];
      const mean = AnomalyService.calculateRollingMean(values);
      const stddev = AnomalyService.calculateStandardDeviation(values, mean);
      // Sample stddev of these values is approx 5.2372
      expect(stddev).toBeCloseTo(5.24, 2);
    });
  });

  describe('calculateZScore', () => {
    it('should return 0 if stddev is 0', () => {
      expect(AnomalyService.calculateZScore(10, 10, 0)).toBe(0);
    });

    it('should calculate correct positive/negative z-scores', () => {
      expect(AnomalyService.calculateZScore(15, 10, 2.5)).toBe(2);
      expect(AnomalyService.calculateZScore(5, 10, 2.5)).toBe(-2);
    });
  });

  describe('detectAnomaly', () => {
    it('should flag anomalies correctly based on standard threshold', () => {
      // 15 is 2.5 stddev away (less than 3)
      const res1 = AnomalyService.detectAnomaly(15, 10, 2);
      expect(res1.isAnomaly).toBe(false);
      expect(res1.zScore).toBe(2.5);

      // 17 is 3.5 stddev away (greater than 3)
      const res2 = AnomalyService.detectAnomaly(17, 10, 2);
      expect(res2.isAnomaly).toBe(true);
      expect(res2.zScore).toBe(3.5);
    });
  });

  describe('analyzeRisk', () => {
    it('should evaluate low risk for healthy/normal metrics matching baseline', () => {
      const metrics = {
        latencyMs: 200,
        errorRate: 0.01,
        queueDepth: 0,
        dlqCount: 0,
      };

      const baselines = {
        latencyMean: 200,
        latencyStdDev: 30,
        errorRateBaseline: 0.01,
      };

      const analysis = AnomalyService.analyzeRisk('test-id', 'Test Integration', metrics, baselines);

      expect(analysis.riskScore).toBe(0);
      expect(analysis.riskLevel).toBe('low');
      expect(analysis.predictedFailureWindowHours).toBe(0);
      expect(analysis.contributingFactors).toHaveLength(0);
    });

    it('should evaluate critical risk and return contributing factors for severe outage indicators', () => {
      const metrics = {
        latencyMs: 1200, // spikes from 200 mean (z-score: 1000/50 = 20)
        errorRate: 0.25, // spikes from 0.02
        queueDepth: 600, // high backlog
        dlqCount: 12,    // files in DLQ
      };

      const baselines = {
        latencyMean: 200,
        latencyStdDev: 50,
        errorRateBaseline: 0.02,
      };

      const analysis = AnomalyService.analyzeRisk('test-id', 'Test Integration', metrics, baselines);

      expect(analysis.riskScore).toBeGreaterThan(0.75);
      expect(analysis.riskLevel).toBe('critical');
      expect(analysis.predictedFailureWindowHours).toBeGreaterThan(0);
      expect(analysis.predictedFailureWindowHours).toBeLessThan(5);

      // Verify contributing factors are present
      const factors = analysis.contributingFactors.map(f => f.factor);
      expect(factors).toContain('Latency spike (+500%)');
      expect(factors).toContain('High error rate (25.0%)');
      expect(factors).toContain('Queue depth growth (600 backlog)');
      expect(factors).toContain('Dead Letter Queue backlog (12 events)');
    });
  });
});
