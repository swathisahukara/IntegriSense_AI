/**
 * IntegriSense AI — BigQuery Service
 *
 * Manages analytical data operations against Google Cloud BigQuery:
 *   - Querying historical telemetry metrics (latency baselines, error rates)
 *   - Inserting and querying risk prediction forecasts (FailureProbability)
 *
 * Supports an offline mock fallback (ENABLE_BIGQUERY=false) to return realistic
 * simulated baselines and predictions for local testing.
 *
 * Azure equivalent:
 *   Azure Synapse / Azure Data Explorer analytical access layer.
 */

import { BigQuery } from '@google-cloud/bigquery';
import { env } from '../config/env.js';
import { createLogger } from '../utils/logger.js';
import type { FailureProbability } from '../models/risk.model.js';
import { AppError } from '../utils/errors.js';
import { MONITORED_INTEGRATIONS } from '../config/telemetry.config.js';

const log = createLogger('bigquery-service');

class BigQueryService {
  private bq: BigQuery | null = null;
  private datasetId: string;

  constructor() {
    this.datasetId = env.BIGQUERY_DATASET;

    if (env.ENABLE_BIGQUERY) {
      log.info(
        { project: env.GCP_PROJECT_ID, dataset: this.datasetId },
        'Initializing Google Cloud BigQuery client...',
      );
      try {
        this.bq = new BigQuery({
          projectId: env.GCP_PROJECT_ID,
        });
      } catch (err: unknown) {
        log.error({ err }, 'Failed to initialize BigQuery client. Falling back to mock data.');
        this.bq = null;
      }
    } else {
      log.warn('BigQuery is disabled in configuration. Running with mock telemetry baselines.');
    }
  }

  /**
   * Helper to execute a parameterized SQL query in BigQuery.
   */
  public async query<T>(sql: string, params?: Record<string, unknown> | unknown[]): Promise<T[]> {
    if (!this.bq) {
      log.warn({ sql }, 'Query called in mock mode. Returning empty array.');
      return [] as T[];
    }

    try {
      log.debug({ sql, params }, 'Executing BigQuery SQL query');
      
      const options: Record<string, unknown> = { query: sql };
      if (params !== undefined) {
        options['params'] = params;
      }

      const [rows] = (await this.bq.query(options)) as unknown as [T[], unknown];
      return rows as T[];
    } catch (err: unknown) {
      log.error({ err, sql }, 'BigQuery query execution error');
      throw new AppError('Failed to execute analytical query in BigQuery', 500);
    }
  }

  // ── Telemetry Baseline Queries ──────────────────────────────────────────────

  /**
   * Fetches historical latency baseline (rolling mean and standard deviation)
   * for an integration based on the past X hours.
   */
  public async getLatencyBaseline(
    integrationId: string,
    hours = 24,
  ): Promise<{ mean: number; stddev: number }> {
    log.debug({ integrationId, hours }, 'Fetching latency baseline');

    if (this.bq) {
      const sql = `
        SELECT 
          AVG(latency_ms) as mean,
          STDDEV(latency_ms) as stddev
        FROM \`${env.GCP_PROJECT_ID}.${this.datasetId}.integration_events\`
        WHERE integration_id = @integrationId
          AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @hours HOUR)
          AND status != 'timeout'
      `;

      try {
        const rows = await this.query<{ mean: number | null; stddev: number | null }>(sql, {
          integrationId,
          hours,
        });

        const result = rows[0];
        return {
          mean: result?.mean ?? 250, // default fallback ms
          stddev: result?.stddev ?? 50,
        };
      } catch (err: unknown) {
        log.error({ err, integrationId }, 'Failed to fetch latency baseline');
        // Return sensible default on database error to keep system running
        return { mean: 250, stddev: 50 };
      }
    } else {
      const config = MONITORED_INTEGRATIONS.find((i) => i.id === integrationId);
      if (config) {
        return {
          mean: config.normalMetrics.latencyMeanMs,
          stddev: config.normalMetrics.latencyStdDevMs,
        };
      }
      // Mock Baseline: Returns a deterministic mock based on the integrationId string
      const seed = integrationId.length;
      return {
        mean: 150 + seed * 10,
        stddev: 20 + (seed % 5) * 5,
      };
    }
  }

  /**
   * Fetches historical error rate baseline for an integration.
   */
  public async getErrorRateBaseline(integrationId: string, hours = 24): Promise<number> {
    log.debug({ integrationId, hours }, 'Fetching error rate baseline');

    if (this.bq) {
      const sql = `
        SELECT 
          COUNTIF(status = 'failure') / COUNT(*) as error_rate
        FROM \`${env.GCP_PROJECT_ID}.${this.datasetId}.integration_events\`
        WHERE integration_id = @integrationId
          AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @hours HOUR)
      `;

      try {
        const rows = await this.query<{ error_rate: number | null }>(sql, {
          integrationId,
          hours,
        });
        return rows[0]?.error_rate ?? 0.02; // default fallback 2%
      } catch (err: unknown) {
        log.error({ err, integrationId }, 'Failed to fetch error rate baseline');
        return 0.02;
      }
    } else {
      const config = MONITORED_INTEGRATIONS.find((i) => i.id === integrationId);
      if (config) {
        return config.normalMetrics.errorRate;
      }
      // Mock Baseline: returns 1% to 3% baseline
      return 0.01 + (integrationId.length % 3) * 0.01;
    }
  }

  // ── Risk Forecast Operations ───────────────────────────────────────────────

  /**
   * Inserts or replaces a failure probability risk forecast.
   */
  public async insertFailureProbability(prediction: FailureProbability): Promise<void> {
    log.info({ integrationId: prediction.integrationId, score: prediction.riskScore }, 'Saving risk forecast');

    if (this.bq) {
      try {
        // Since BQ streams data, we append the predictions history log.
        const table = this.bq.dataset(this.datasetId).table('failure_probability');
        
        // Map camelCase TS object to snake_case schema columns matching BigQuery DDL
        const row = {
          integration_id: prediction.integrationId,
          integration_name: prediction.integrationName,
          risk_score: prediction.riskScore,
          risk_level: prediction.riskLevel,
          predicted_failure_window_hours: prediction.predictedFailureWindowHours,
          confidence: prediction.confidence,
          contributing_factors: JSON.stringify(prediction.contributingFactors),
          last_updated: new Date().toISOString()
        };

        await table.insert(row);
      } catch (err: unknown) {
        log.error({ err, integrationId: prediction.integrationId }, 'BigQuery insert error during insertFailureProbability');
        throw new AppError('Failed to record risk prediction in analytical database', 500);
      }
    } else {
      log.debug(prediction, 'Mock BigQuery: Risk forecast logged in memory');
    }
  }

  /**
   * Retrieves the latest failure probability score for all integrations.
   */
  public async getLatestFailureProbabilities(): Promise<FailureProbability[]> {
    log.debug('Fetching latest failure probabilities');

    if (this.bq) {
      // Fetch the latest entry per integration using a subquery
      const sql = `
        SELECT fp.* FROM \`${env.GCP_PROJECT_ID}.${this.datasetId}.failure_probability\` fp
        INNER JOIN (
          SELECT integration_id, MAX(last_updated) as max_date
          FROM \`${env.GCP_PROJECT_ID}.${this.datasetId}.failure_probability\`
          GROUP BY integration_id
        ) latest ON fp.integration_id = latest.integration_id AND fp.last_updated = latest.max_date
      `;

      try {
        const rows = await this.query<{
          integration_id: string;
          integration_name: string;
          risk_score: number;
          risk_level: string;
          predicted_failure_window_hours: number | null;
          confidence: number;
          contributing_factors: string; // JSON string from BQ
          last_updated: { value: string } | string;
        }>(sql);

        return rows.map((row) => ({
          integrationId: row.integration_id,
          integrationName: row.integration_name,
          riskScore: row.risk_score,
          riskLevel: row.risk_level as FailureProbability['riskLevel'],
          predictedFailureWindowHours: row.predicted_failure_window_hours ?? 0,
          confidence: row.confidence,
          contributingFactors: JSON.parse(row.contributing_factors) as FailureProbability['contributingFactors'],
          lastUpdated: typeof row.last_updated === 'object' ? row.last_updated.value : row.last_updated,
        }));
      } catch (err: unknown) {
        log.error({ err }, 'Failed to fetch latest failure probabilities from BigQuery');
        throw new AppError('Failed to retrieve analytical risk forecast', 500);
      }
    } else {
      // Mock: Return default dummy predictions for our integrations
      return [
        {
          integrationId: 'salesforce-to-crm',
          integrationName: 'Salesforce -> Dynamics CRM',
          riskScore: 0.12,
          riskLevel: 'low',
          predictedFailureWindowHours: 0,
          confidence: 0.95,
          contributingFactors: [{ factor: 'Latency baseline matching', weight: 0.1 }],
          lastUpdated: new Date().toISOString(),
        },
        {
          integrationId: 'sap-to-data-platform',
          integrationName: 'SAP -> Data Platform',
          riskScore: 0.84,
          riskLevel: 'high',
          predictedFailureWindowHours: 4,
          confidence: 0.88,
          contributingFactors: [
            { factor: 'Latency spike (+450%)', weight: 0.6 },
            { factor: 'Retry storm (15 retries/min)', weight: 0.4 },
          ],
          explanation: 'Latency has increased by 450% above the 24h rolling baseline. Retry volume has increased 8x.',
          lastUpdated: new Date().toISOString(),
        },
      ];
    }
  }
}

export const bigqueryService = new BigQueryService();
export default bigqueryService;
