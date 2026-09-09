/**
 * IntegriSense AI — Synthetic Telemetry Generator Service
 *
 * Simulates real-time integration events by continuously generating metrics
 * based on baseline configurations and current active scenario multipliers.
 * Runs in the background (using setInterval).
 *
 * Coordinates:
 *   1. Generating telemetry metrics (latency, errors, queue levels).
 *   2. Publishing to Pub/Sub (ingestion broker).
 *   3. Evaluating risks deterministically (AnomalyService).
 *   4. Creating/resolving Firestore Incidents when thresholds are crossed.
 *   5. Appending prediction logs to BigQuery.
 *
 * Azure equivalent:
 *   An Azure Function Timer Trigger or a background WebJob/Worker service
 *   generating mock device/endpoint telemetry.
 */

import { env } from '../config/env.js';
import { createLogger } from '../utils/logger.js';
import pubsubService from './pubsub.service.js';
import firestoreService from './firestore.service.js';
import bigqueryService from './bigquery.service.js';
import AnomalyService from './anomaly.service.js';
import geminiService from './gemini.service.js';
import { MONITORED_INTEGRATIONS, TELEMETRY_SCENARIOS, type ScenarioConfig } from '../config/telemetry.config.js';
import { NotFoundError } from '../utils/errors.js';
import type { IntegrationEvent } from '../models/integration.model.js';
import type { Incident, AgentActivity } from '../models/incident.model.js';

const log = createLogger('generator-service');

class GeneratorService {
  private intervalId: NodeJS.Timeout | null = null;
  private intervalMs = 10000; // Generate events every 10 seconds

  // Tracks active scenario per integration ID. Defaults to 'normal'
  private activeScenarios: Map<string, string> = new Map();

  constructor() {
    // Initialize all monitored integrations to normal operation
    for (const integration of MONITORED_INTEGRATIONS) {
      this.activeScenarios.set(integration.id, 'normal');
    }
  }

  /**
   * Starts the background generator timer loop.
   */
  public start(): void {
    if (this.intervalId) {
      log.warn('Generator service is already running.');
      return;
    }

    log.info({ intervalMs: this.intervalMs }, '🚀 Starting Synthetic Data Generator loop...');
    
    // Run once immediately on start
    void this.tick();

    this.intervalId = setInterval(() => {
      void this.tick();
    }, this.intervalMs);
  }

  /**
   * Stops the background generator.
   */
  public stop(): void {
    if (this.intervalId) {
      log.info('Stopping Synthetic Data Generator loop.');
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Updates the active scenario for a specific integration or all integrations.
   */
  public setScenario(integrationId: string, scenarioName: string): void {
    if (!TELEMETRY_SCENARIOS[scenarioName]) {
      throw new Error(`Invalid scenario: ${scenarioName}`);
    }
    log.info({ integrationId, scenario: scenarioName }, 'Switching simulation scenario');
    this.activeScenarios.set(integrationId, scenarioName);
  }

  /**
   * Synchronously applies a simulation scenario across target integrations and manages incident states.
   */
  public async applyScenario(scenarioName: string, integrationId?: string): Promise<string[]> {
    log.info({ scenario: scenarioName, integrationId }, 'Applying simulation scenario across integrations');

    if (integrationId && !MONITORED_INTEGRATIONS.some((i) => i.id === integrationId)) {
      throw new NotFoundError(`Integration ${integrationId}`);
    }

    // Load existing scenarios from Firestore or in-memory
    const activeScenarios = env.ENABLE_FIRESTORE
      ? await firestoreService.loadActiveScenarios()
      : Object.fromEntries(this.activeScenarios.entries());

    const targets = integrationId 
      ? MONITORED_INTEGRATIONS.filter((i) => i.id === integrationId)
      : MONITORED_INTEGRATIONS;

    const appliedTo: string[] = [];

    for (const config of targets) {
      const targetScenario = scenarioName;

      this.activeScenarios.set(config.id, targetScenario);
      activeScenarios[config.id] = targetScenario;
      appliedTo.push(config.id);

      // If switching to normal, resolve active incidents for this integration
      if (targetScenario === 'normal') {
        const activeIncidents = await firestoreService.listActiveIncidents();
        const match = activeIncidents.filter((inc) => inc.integrationId === config.id);
        for (const inc of match) {
          await firestoreService.updateIncident(inc.id, {
            status: 'resolved',
            resolvedAt: new Date().toISOString(),
          });
        }
      }
    }

    if (env.ENABLE_FIRESTORE) {
      await firestoreService.saveActiveScenarios(activeScenarios);
    }

    // Immediately run a tick to produce events matching the new scenario
    await this.tick();

    return appliedTo;
  }

  /**
   * Retrieves the current scenario for an integration.
   */
  public getScenario(integrationId: string): string {
    return this.activeScenarios.get(integrationId) ?? 'normal';
  }

  /**
   * Triggers a single tick of telemetry generation immediately.
   */
  public async triggerNow(): Promise<void> {
    await this.tick();
  }

  /**
   * Triggers a single tick of telemetry generation across all integrations.
   */
  public async tick(): Promise<void> {
    log.debug('Generator tick — generating telemetry events');
    
    try {
      const activeScenarios = env.ENABLE_FIRESTORE
        ? await firestoreService.loadActiveScenarios()
        : null;

      await Promise.all(
        MONITORED_INTEGRATIONS.map((integration) => this.generateEvent(integration.id, activeScenarios))
      );
    } catch (err: unknown) {
      log.error({ err }, 'Error during generator tick execution');
    }
  }

  /**
   * Generates a single event for an integration, calculates anomaly, updates database states, and publishes.
   */
  private async generateEvent(integrationId: string, activeScenarios?: Record<string, string> | null): Promise<void> {
    const config = MONITORED_INTEGRATIONS.find((i) => i.id === integrationId);
    if (!config) return;

    const scenarioName = activeScenarios
      ? activeScenarios[integrationId] ?? 'normal'
      : this.getScenario(integrationId);
    const scenario = (TELEMETRY_SCENARIOS[scenarioName] || TELEMETRY_SCENARIOS['normal']) as ScenarioConfig;

    // Generate random variance around the mean baseline metrics
    const varianceRatio = (Math.random() - 0.5) * 2; // -1.0 to 1.0
    const rawLatency = config.normalMetrics.latencyMeanMs + varianceRatio * config.normalMetrics.latencyStdDevMs;
    
    // Apply latency multiplier from current scenario
    const latencyMs = Math.max(20, Math.round(rawLatency * scenario.latencyMultiplier));
    const errorRate = scenario.errorRate;

    // Pick success/failure status based on error rate probability
    const isError = Math.random() < errorRate;
    let status: IntegrationEvent['status'] = 'success';
    let errorCode: string | undefined;
    let errorMessage: string | undefined;
    let httpStatusCode = 200;

    if (isError) {
      // 80% failure, 20% timeout
      const isTimeout = Math.random() < 0.20;
      status = isTimeout ? 'timeout' : 'failure';
      errorCode = scenario.errorCode ?? 'ERR_INTEGRATION_FAULT';
      errorMessage = scenario.errorMessage ?? 'An error occurred during target request processing.';
      httpStatusCode = isTimeout ? 504 : 500;
    }

    // Set queue metrics
    const queueDepth = Math.max(0, Math.round(scenario.queueDepth + (Math.random() - 0.5) * 10));
    const dlqCount = scenario.dlqCount;

    // Build the IntegrationEvent
    const event: IntegrationEvent = {
      eventId: `evt-${crypto.randomUUID()}`,
      integrationId: config.id,
      integrationName: config.name,
      sourceSystem: config.sourceSystem,
      targetSystem: config.targetSystem,
      eventType: 'api_call',
      status,
      latencyMs,
      retryCount: isError ? Math.floor(Math.random() * 3) + 1 : 0,
      payloadSizeKb: Math.round((10 + Math.random() * 90) * 10) / 10,
      queueDepth,
      dlqCount,
      region: env.GCP_REGION,
      environment: env.NODE_ENV,
      scenario: scenarioName,
      timestamp: new Date().toISOString(),
      ...(isError ? {
        httpStatusCode,
        ...(errorCode ? { errorCode } : {}),
        ...(errorMessage ? { errorMessage } : {}),
      } : {
        httpStatusCode: 200,
      }),
    };

    // ── 1. Publish Event to Pub/Sub ──────────────────────────────────────────
    await pubsubService.publishEvent(event);

    // ── 2. Run Anomaly Service Calculations ──────────────────────────────────
    // Get historical baselines (returns deterministic mock values in offline mode)
    const [latencyBaseline, errorRateBaseline] = await Promise.all([
      bigqueryService.getLatencyBaseline(config.id),
      bigqueryService.getErrorRateBaseline(config.id),
    ]);

    const riskAnalysis = AnomalyService.analyzeRisk(
      config.id,
      config.name,
      {
        latencyMs: event.latencyMs,
        errorRate: isError ? 1.0 : 0.0, // Instaneous rate for the tick
        queueDepth: event.queueDepth,
        dlqCount: event.dlqCount,
      },
      {
        latencyMean: latencyBaseline.mean,
        latencyStdDev: latencyBaseline.stddev,
        errorRateBaseline,
      }
    );

    // ── 3. Operational State Coordination (Firestore) ───────────────────────
    const activeIncidents = await firestoreService.listActiveIncidents();
    const existingIncident = activeIncidents.find((inc) => inc.integrationId === config.id);

    // Threshold: non-normal scenario or risk level "medium" or higher triggers an Incident
    const hasActiveAnomaly = scenarioName !== 'normal' || riskAnalysis.riskLevel !== 'low';

    if (hasActiveAnomaly && !existingIncident) {
      // Dynamic Gemini 2.5 Root Cause Analysis & Playbook Generation
      const geminiRca = await geminiService.analyzeIncident({
        integrationId: config.id,
        integrationName: config.name,
        sourceSystem: config.sourceSystem,
        targetSystem: config.targetSystem,
        scenario: scenarioName,
        latencyMs: event.latencyMs,
        latencyBaselineMs: Math.round(latencyBaseline.mean),
        errorRate: isError ? 1.0 : 0.0,
        queueDepth: event.queueDepth,
        dlqCount: event.dlqCount,
      });

      const incidentId = `inc-${crypto.randomUUID()}`;

      const newIncident: Incident = {
        id: incidentId,
        integrationId: config.id,
        integrationName: config.name,
        severity: riskAnalysis.riskLevel === 'critical' ? 'critical' : riskAnalysis.riskLevel === 'high' ? 'high' : 'medium',
        status: 'active',
        detectedAt: event.timestamp,
        triggerReason: `Statistical anomaly detected: ${riskAnalysis.contributingFactors.map((cf) => cf.factor).join(', ')}`,
        rootCause: geminiRca.rootCause,
        metricsSnapshot: {
          latencyMs: event.latencyMs,
          errorRate: isError ? 1.0 : 0.0,
          queueDepth: event.queueDepth,
          dlqCount: event.dlqCount,
          zScore: AnomalyService.calculateZScore(event.latencyMs, latencyBaseline.mean, Math.max(latencyBaseline.stddev, latencyBaseline.mean * 0.05)),
          riskScore: riskAnalysis.riskScore,
        },
      };

      await firestoreService.createIncident(newIncident);

      // Create matching recovery action entry
      await firestoreService.createRecoveryAction({
        id: incidentId,
        incidentId,
        integrationId: config.id,
        recommendation: geminiRca.recommendation,
        playbookName: geminiRca.playbookName,
        steps: geminiRca.steps,
        riskLevel: geminiRca.riskLevel,
        estimatedRecoveryMinutes: 3,
        status: 'pending_approval',
        createdAt: event.timestamp,
      } as any);

      // Log Agent Activity trace
      const activity: AgentActivity = {
        id: `act-${crypto.randomUUID()}`,
        incidentId,
        agentName: 'MonitorAgent',
        activityType: 'analysis',
        message: `MonitorAgent triggered active incident ${incidentId}. Root cause: ${geminiRca.rootCause}`,
        timestamp: event.timestamp,
      };
      await firestoreService.logAgentActivity(activity);
      log.warn({ incidentId, integrationId: config.id }, '⚠️ Anomaly detected! Incident opened.');

    } else if (!hasActiveAnomaly && existingIncident) {
      // Resolve existing incident since telemetry returned to normal
      await firestoreService.updateIncident(existingIncident.id, {
        status: 'resolved',
        resolvedAt: event.timestamp,
      });

      // Log Agent Activity trace
      const activity: AgentActivity = {
        id: `act-${crypto.randomUUID()}`,
        incidentId: existingIncident.id,
        agentName: 'MonitorAgent',
        activityType: 'decision',
        message: `MonitorAgent detected metrics returned to baseline. Automatically resolved incident ${existingIncident.id}.`,
        timestamp: event.timestamp,
      };
      await firestoreService.logAgentActivity(activity);
      log.info({ incidentId: existingIncident.id }, '✅ Telemetry healthy. Incident automatically resolved.');
    }

    // ── 4. Analytics Prediction Insertion (BigQuery) ────────────────────────
    await bigqueryService.insertFailureProbability({
      ...riskAnalysis,
      explanation: isError 
        ? `Anomaly service flags high failure risk. Primary factor: ${riskAnalysis.contributingFactors[0]?.factor ?? 'errors'}.`
        : 'Telemetry parameters matching normal rolling baseline values.',
      lastUpdated: event.timestamp,
    });
  }
}

export const generatorService = new GeneratorService();
export default generatorService;
