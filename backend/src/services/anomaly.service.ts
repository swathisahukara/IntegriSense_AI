/**
 * IntegriSense AI — Anomaly & Risk Detection Service
 *
 * Provides pure, deterministic TypeScript statistical calculations:
 *   - Rolling mean
 *   - Standard deviation
 *   - Z-score
 *   - Anomaly threshold detection
 *   - Risk scoring based on baseline distributions (error rate, latency, queue metrics)
 *
 * Following the system design, vertex AI / Gemini is NEVER used to calculate
 * numerical metrics. We perform statistical math here, and later feed results
 * to Gemini for narrative explanation and natural language summaries.
 *
 * Azure equivalent:
 *   Azure Stream Analytics or custom scoring functions in Azure Synapse / Databricks.
 */

import type { FailureProbability } from '../models/risk.model.js';

export class AnomalyService {
  /**
   * Calculates the arithmetic mean of a numeric array.
   */
  public static calculateRollingMean(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  }

  /**
   * Calculates the sample standard deviation of a numeric array.
   * Uses Bessel's correction (n - 1) for sample data.
   */
  public static calculateStandardDeviation(values: number[], mean: number): number {
    if (values.length <= 1) return 0;
    const sumOfSquares = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
    return Math.sqrt(sumOfSquares / (values.length - 1));
  }

  /**
   * Calculates the Z-score of a single value against a mean and standard deviation.
   */
  public static calculateZScore(value: number, mean: number, stddev: number): number {
    if (stddev === 0) return 0;
    return (value - mean) / stddev;
  }

  /**
   * Checks if a value is an anomaly by comparing its Z-score against a threshold.
   */
  public static detectAnomaly(
    value: number,
    mean: number,
    stddev: number,
    thresholdZ = 3.0,
  ): { isAnomaly: boolean; zScore: number } {
    const zScore = this.calculateZScore(value, mean, stddev);
    return {
      isAnomaly: Math.abs(zScore) >= thresholdZ,
      zScore,
    };
  }

  /**
   * Deterministically calculates the risk score (0.0 to 1.0) and failure probability metrics.
   * Weighs:
   *   - Latency z-score (35%)
   *   - Error rate differential (35%)
   *   - Queue backlog depth (15%)
   *   - Dead Letter Queue count (15%)
   */
  public static analyzeRisk(
    integrationId: string,
    integrationName: string,
    metrics: {
      latencyMs: number;
      errorRate: number;
      queueDepth: number;
      dlqCount: number;
    },
    baselines: {
      latencyMean: number;
      latencyStdDev: number;
      errorRateBaseline: number;
    },
  ): Omit<FailureProbability, 'explanation' | 'lastUpdated'> {
    // ── 1. Latency Component (Weight: 35%) ────────────────────────────────────
    // Calculate Z-score for latency, enforcing a minimum standard deviation to avoid division by zero.
    const latencyStdDev = Math.max(baselines.latencyStdDev, baselines.latencyMean * 0.05);
    const latencyZ = this.calculateZScore(metrics.latencyMs, baselines.latencyMean, latencyStdDev);
    
    let latencyRisk = 0;
    if (latencyZ > 1) {
      // Risk scales linearly as Z goes from 1.0 (some risk) to 5.0 (critical risk)
      latencyRisk = Math.min(1.0, (latencyZ - 1) / 4);
    }
    const latencyWeight = 0.35 * latencyRisk;

    // ── 2. Error Rate Component (Weight: 35%) ─────────────────────────────────
    // Risk is driven by the deviation of current error rate from baseline.
    const errorRateDiff = metrics.errorRate - baselines.errorRateBaseline;
    let errorRisk = 0;
    if (errorRateDiff > 0) {
      // If error rate is 20% higher than baseline, it represents maximum risk
      errorRisk = Math.min(1.0, errorRateDiff / 0.20);
    } else if (metrics.errorRate > 0.05) {
      // Absolute check: even if baseline is high, an absolute error rate > 5% represents risk
      errorRisk = Math.min(1.0, metrics.errorRate / 0.15);
    }
    const errorWeight = 0.35 * errorRisk;

    // ── 3. Queue Depth Component (Weight: 15%) ─────────────────────────────────
    // Backlog depth scales risk linearly. A backlog of 1000 messages represents max queue risk.
    const queueRisk = Math.min(1.0, metrics.queueDepth / 1000);
    const queueWeight = 0.15 * queueRisk;

    // ── 4. Dead Letter Queue Component (Weight: 15%) ───────────────────────────
    // Any item in DLQ represents permanent failure, warranting immediate medium risk (0.5).
    // Scales to 1.0 if DLQ holds 50 or more messages.
    let dlqRisk = 0;
    if (metrics.dlqCount > 0) {
      dlqRisk = Math.min(1.0, 0.5 + (metrics.dlqCount / 100));
    }
    const dlqWeight = 0.15 * dlqRisk;

    // ── Calculate Final Aggregated Risk Score ─────────────────────────────────
    const rawRiskScore = latencyWeight + errorWeight + queueWeight + dlqWeight;
    const riskScore = Math.round(rawRiskScore * 100) / 100;

    // ── Map Risk Level ────────────────────────────────────────────────────────
    let riskLevel: FailureProbability['riskLevel'] = 'low';
    if (riskScore >= 0.75) {
      riskLevel = 'critical';
    } else if (riskScore >= 0.50) {
      riskLevel = 'high';
    } else if (riskScore >= 0.15) {
      riskLevel = 'medium';
    }

    // ── Determine Predicted Failure Window (Hours) ────────────────────────────
    let predictedFailureWindowHours = 0;
    if (riskLevel !== 'low') {
      // Scales from 12 hours (risk 0.15) down to 1 hour (risk 1.0)
      predictedFailureWindowHours = Math.max(1, Math.round((1 - riskScore) * 12));
    }

    // ── Populate Contributing Factors List ────────────────────────────────────
    const contributingFactors: FailureProbability['contributingFactors'] = [];

    if (latencyRisk > 0.1) {
      const pct = Math.round((metrics.latencyMs / baselines.latencyMean - 1) * 100);
      contributingFactors.push({
        factor: `Latency spike (+${pct}%)`,
        weight: Math.round(latencyRisk * 100) / 100,
      });
    }

    if (errorRisk > 0.1) {
      contributingFactors.push({
        factor: `High error rate (${(metrics.errorRate * 100).toFixed(1)}%)`,
        weight: Math.round(errorRisk * 100) / 100,
      });
    }

    if (queueRisk > 0.1) {
      contributingFactors.push({
        factor: `Queue depth growth (${metrics.queueDepth} backlog)`,
        weight: Math.round(queueRisk * 100) / 100,
      });
    }

    if (dlqRisk > 0.1) {
      contributingFactors.push({
        factor: `Dead Letter Queue backlog (${metrics.dlqCount} events)`,
        weight: Math.round(dlqRisk * 100) / 100,
      });
    }

    return {
      integrationId,
      integrationName,
      riskScore,
      riskLevel,
      predictedFailureWindowHours,
      confidence: 0.90, // Static 90% confidence baseline
      contributingFactors,
    };
  }
}

export default AnomalyService;
