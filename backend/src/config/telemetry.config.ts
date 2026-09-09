/**
 * IntegriSense AI — Telemetry Configuration
 *
 * Defines the static list of monitored integration pipelines, their historical
 * normal baselines, and synthetic degradation/failure scenario configurations.
 * Used by the analytical baseline simulation, API controllers, and the Phase 3
 * Synthetic Data Generator.
 *
 * Azure equivalent:
 *   Static config mappings or telemetry baseline rules stored in Azure App Configuration.
 */

export interface MockIntegrationConfig {
  id: string;
  name: string;
  sourceSystem: string;
  targetSystem: string;
  cloudProvider?: 'gcp' | 'aws' | 'azure' | 'custom';
  protocol?: string;
  endpointUrl?: string;
  normalMetrics: {
    latencyMeanMs: number;
    latencyStdDevMs: number;
    errorRate: number; // 0.0 - 1.0
    queueDepthMax: number;
    dlqCount: number;
  };
}

export interface ScenarioConfig {
  name: string;
  description: string;
  latencyMultiplier: number;
  errorRate: number; // target error rate (0.0 - 1.0)
  queueDepth: number;
  dlqCount: number;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * List of enterprise integration pipelines monitored by the platform.
 */
export const MONITORED_INTEGRATIONS: MockIntegrationConfig[] = [
  {
    id: 'sap-to-data-platform',
    name: 'SAP -> Data Platform',
    sourceSystem: 'SAP ERP S/4HANA',
    targetSystem: 'BigQuery Data Lake',
    normalMetrics: {
      latencyMeanMs: 420,
      latencyStdDevMs: 45,
      errorRate: 0.015,
      queueDepthMax: 5,
      dlqCount: 0,
    },
  },
  {
    id: 'salesforce-to-crm',
    name: 'Salesforce -> Dynamics CRM',
    sourceSystem: 'Salesforce Sales Cloud',
    targetSystem: 'Dynamics 365 CRM',
    normalMetrics: {
      latencyMeanMs: 180,
      latencyStdDevMs: 20,
      errorRate: 0.008,
      queueDepthMax: 2,
      dlqCount: 0,
    },
  },
  {
    id: 'shopify-to-erp',
    name: 'Shopify -> NetSuite ERP',
    sourceSystem: 'Shopify Plus Store',
    targetSystem: 'NetSuite ERP',
    normalMetrics: {
      latencyMeanMs: 310,
      latencyStdDevMs: 35,
      errorRate: 0.022,
      queueDepthMax: 8,
      dlqCount: 0,
    },
  },
  {
    id: 'workday-to-ad',
    name: 'Workday -> Active Directory',
    sourceSystem: 'Workday HR Suite',
    targetSystem: 'Active Directory (LDAP)',
    normalMetrics: {
      latencyMeanMs: 1450,
      latencyStdDevMs: 180,
      errorRate: 0.005,
      queueDepthMax: 1,
      dlqCount: 0,
    },
  },
];

/**
 * Telemetry degradation scenarios used to simulate failures during demos/testing.
 */
export const TELEMETRY_SCENARIOS: Record<string, ScenarioConfig> = {
  normal: {
    name: 'Normal Operation',
    description: 'System is operating within normal parameters.',
    latencyMultiplier: 1.0,
    errorRate: 0.01,
    queueDepth: 2,
    dlqCount: 0,
  },
  degradation: {
    name: 'Latency Degradation',
    description: 'API response times are sluggish, queue backlogs are beginning to form.',
    latencyMultiplier: 3.5,
    errorRate: 0.06,
    queueDepth: 75,
    dlqCount: 0,
  },
  incident: {
    name: 'Severe Outage / Incident',
    description: 'Endpoints are throwing frequent failures, retries are backing up, and DLQ is growing.',
    latencyMultiplier: 8.0,
    errorRate: 0.42,
    queueDepth: 420,
    dlqCount: 14,
    errorCode: 'ERR_HTTP_504_GATEWAY_TIMEOUT',
    errorMessage: 'Gateway timeout from upstream CRM service. Connection attempts exhausted.',
  },
  cascading: {
    name: 'Cascading Database Failure',
    description: 'Downstream DB lock causes a total deadlock, queue saturation, and massive DLQ spills.',
    latencyMultiplier: 18.0,
    errorRate: 0.96,
    queueDepth: 2800,
    dlqCount: 154,
    errorCode: 'ERR_DB_DEADLOCK_ACQUISITION',
    errorMessage: 'Transaction deadlock detected. Lock wait timeout exceeded.',
  },
};

export function addMonitoredIntegration(config: MockIntegrationConfig): void {
  const existingIndex = MONITORED_INTEGRATIONS.findIndex((item) => item.id === config.id);
  if (existingIndex >= 0) {
    MONITORED_INTEGRATIONS[existingIndex] = config;
  } else {
    MONITORED_INTEGRATIONS.push(config);
  }
}

