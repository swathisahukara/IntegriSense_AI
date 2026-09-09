/**
 * IntegriSense AI — Integration Model
 *
 * Defines the schema and status types for monitored enterprise integrations.
 */

export type IntegrationStatus = 'healthy' | 'degraded' | 'failed';
export type CloudProvider = 'gcp' | 'aws' | 'azure' | 'custom';

export interface PredictiveRisk {
  failureProbability: number;
  riskBadge: string;
  timeToFailureMin: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  modelConfidence: number;
}

export interface Integration {
  id: string;             // Unique identifier (e.g., sap-to-data-platform)
  name: string;           // Human-readable name (e.g., SAP -> Data Platform)
  sourceSystem: string;   // Source identifier (e.g., SAP)
  targetSystem: string;   // Target identifier (e.g., BigQuery Data Lake)
  cloudProvider?: CloudProvider;
  protocol?: string;
  endpointUrl?: string;
  status: IntegrationStatus;
  latencyBaselineMs: number; // Normal latency baseline
  latencyCurrentMs: number;  // Current latency
  errorRateBaseline: number; // Normal error rate baseline (0.0 - 1.0)
  errorRateCurrent: number;  // Current error rate
  queueDepthCurrent: number; // Current queue backlog depth
  dlqCountCurrent: number;   // Current Dead Letter Queue count
  predictiveRisk?: PredictiveRisk;
  lastUpdated: string;       // ISO Timestamp
}

export interface IntegrationEvent {
  eventId: string;
  integrationId: string;
  integrationName: string;
  sourceSystem: string;
  targetSystem: string;
  eventType: string;
  status: 'success' | 'failure' | 'timeout' | 'retry';
  httpStatusCode?: number;
  latencyMs: number;
  retryCount: number;
  payloadSizeKb: number;
  errorCode?: string;
  errorMessage?: string;
  queueDepth: number;
  dlqCount: number;
  region: string;
  environment: string;
  scenario: string;
  timestamp: string;
}

