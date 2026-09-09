/**
 * IntegriSense AI — Shared TypeScript Types
 * Mirrors the backend model definitions for type-safe API consumption.
 */

export type IntegrationStatus = 'healthy' | 'degraded' | 'failed';
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'active' | 'open' | 'under_investigation' | 'resolved';
export type RecoveryStatus = 'pending_approval' | 'approved' | 'rejected' | 'executing' | 'completed';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type CloudProvider = 'gcp' | 'aws' | 'azure' | 'custom';

export interface PredictiveRisk {
  failureProbability: number;
  riskBadge: string;
  timeToFailureMin: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  modelConfidence: number;
}

export interface Integration {
  id: string;
  name: string;
  sourceSystem: string;
  targetSystem: string;
  cloudProvider?: CloudProvider;
  protocol?: string;
  endpointUrl?: string;
  status: IntegrationStatus;
  latencyBaselineMs: number;
  latencyCurrentMs: number;
  errorRateBaseline: number;
  errorRateCurrent: number;
  queueDepthCurrent: number;
  dlqCountCurrent: number;
  predictiveRisk?: PredictiveRisk;
  lastUpdated: string;
}

export interface MetricsSnapshot {
  latencyMs: number;
  errorRate: number;
  queueDepth: number;
  dlqCount: number;
  zScore: number;
  riskScore: number;
}

export interface Incident {
  id: string;
  integrationId: string;
  integrationName: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  detectedAt: string;
  resolvedAt?: string;
  rootCause?: string;
  metricsSnapshot: MetricsSnapshot;
}

export interface RecoveryAction {
  id: string;
  incidentId: string;
  integrationId: string;
  recommendation: string;
  steps: string[];
  riskLevel: RiskLevel;
  estimatedRecoveryMinutes: number;
  status: RecoveryStatus;
  createdAt: string;
  decidedAt?: string;
  decidedBy?: string;
}

export interface RiskScore {
  integrationId: string;
  integrationName: string;
  riskScore: number;
  riskLevel: RiskLevel;
  predictedFailureWindowHours?: number;
  confidence?: number;
  lastUpdated: string;
}

export interface SimulateResponse {
  status: string;
  message: string;
  scenario: string;
  appliedTo: string[];
}

export interface TelemetryPoint {
  time: string;
  [integrationId: string]: number | string;
}

export interface AgentActivity {
  id: string;
  incidentId: string;
  agentName: 'MonitorAgent' | 'RCAAgent' | 'PredictionAgent' | 'RecoveryAgent' | 'Orchestrator';
  activityType: 'analysis' | 'decision' | 'action' | 'approval_request';
  message: string;
  timestamp: string;
}

