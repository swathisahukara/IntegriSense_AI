/**
 * IntegriSense AI — Integrations Routes
 *
 * REST API endpoints for integration pipelines status and metrics.
 *
 * Endpoints:
 *   - GET /
 *   - GET /:id
 *   - GET /:id/health
 */

import type { FastifyInstance } from 'fastify';
import { MONITORED_INTEGRATIONS, addMonitoredIntegration } from '../config/telemetry.config.js';
import firestoreService from '../services/firestore.service.js';
import bigqueryService from '../services/bigquery.service.js';
import generatorService from '../services/generator.service.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import type { Integration, PredictiveRisk, CloudProvider } from '../models/integration.model.js';

export async function integrationRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /
   * Returns list of all monitored integrations with their dynamic health statuses, predictive risk, and metrics.
   */
  app.get('/', async (request, reply) => {
    try {
      const [activeIncidents, activeScenarios] = await Promise.all([
        firestoreService.listActiveIncidents(),
        firestoreService.loadActiveScenarios(),
        bigqueryService.getLatestFailureProbabilities(),
      ]);

      const integrations: Integration[] = await Promise.all(
        MONITORED_INTEGRATIONS.map(async (config) => {
          const [latencyBaseline, errorRateBaseline] = await Promise.all([
            bigqueryService.getLatencyBaseline(config.id),
            bigqueryService.getErrorRateBaseline(config.id),
          ]);

          const activeIncident = activeIncidents.find((inc) => inc.integrationId === config.id);
          const currentScenario = activeScenarios[config.id] ?? 'normal';

          let status: 'healthy' | 'degraded' | 'failed' = 'healthy';
          let latencyCurrentMs = config.normalMetrics.latencyMeanMs;
          let errorRateCurrent = config.normalMetrics.errorRate;
          let queueDepthCurrent = 0;
          let dlqCountCurrent = 0;

          if (activeIncident) {
            status = (activeIncident.severity === 'critical' || activeIncident.severity === 'high') ? 'failed' : 'degraded';
            if (activeIncident.metricsSnapshot?.latencyMs) latencyCurrentMs = activeIncident.metricsSnapshot.latencyMs;
            if (activeIncident.metricsSnapshot?.errorRate !== undefined) errorRateCurrent = activeIncident.metricsSnapshot.errorRate;
            if (activeIncident.metricsSnapshot?.queueDepth !== undefined) queueDepthCurrent = activeIncident.metricsSnapshot.queueDepth;
            if (activeIncident.metricsSnapshot?.dlqCount !== undefined) dlqCountCurrent = activeIncident.metricsSnapshot.dlqCount;
          } else if (currentScenario === 'degradation') {
            status = 'degraded';
            latencyCurrentMs = Math.round(config.normalMetrics.latencyMeanMs * 3.5);
            errorRateCurrent = 0.05;
            queueDepthCurrent = 120;
            dlqCountCurrent = 0;
          } else if (currentScenario === 'incident') {
            status = 'failed';
            latencyCurrentMs = Math.round(config.normalMetrics.latencyMeanMs * 8.0);
            errorRateCurrent = 0.42;
            queueDepthCurrent = 2800;
            dlqCountCurrent = 154;
          } else if (currentScenario === 'cascading') {
            status = 'failed';
            latencyCurrentMs = Math.round(config.normalMetrics.latencyMeanMs * 12.0);
            errorRateCurrent = 0.85;
            queueDepthCurrent = 5200;
            dlqCountCurrent = 412;
          }

          let predictiveRisk: PredictiveRisk = {
            failureProbability: 0.04,
            riskBadge: '🟢 Normal Risk (4%)',
            timeToFailureMin: 240,
            trend: 'stable',
            modelConfidence: 0.98,
          };

          if (currentScenario === 'degradation') {
            predictiveRisk = {
              failureProbability: 0.84,
              riskBadge: '⚠️ 84% Failure Risk in Next 30 Mins',
              timeToFailureMin: 30,
              trend: 'increasing',
              modelConfidence: 0.95,
            };
          } else if (currentScenario === 'incident' || currentScenario === 'cascading') {
            predictiveRisk = {
              failureProbability: 0.98,
              riskBadge: '🚨 Critical Outage Active (98% Impact)',
              timeToFailureMin: 0,
              trend: 'increasing',
              modelConfidence: 0.99,
            };
          }

          return {
            id: config.id,
            name: config.name,
            sourceSystem: config.sourceSystem,
            targetSystem: config.targetSystem,
            cloudProvider: config.cloudProvider || 'gcp',
            protocol: config.protocol || 'Pub/Sub Stream',
            endpointUrl: config.endpointUrl,
            status,
            latencyBaselineMs: Math.round(latencyBaseline.mean),
            latencyCurrentMs,
            errorRateBaseline: Math.round(errorRateBaseline * 1000) / 1000,
            errorRateCurrent,
            queueDepthCurrent,
            dlqCountCurrent,
            predictiveRisk,
            lastUpdated: activeIncident ? activeIncident.detectedAt : new Date().toISOString(),
          };
        }),
      );

      return reply.status(200).send(integrations);
    } catch (err: unknown) {
      request.log.error({ err }, 'Error listing monitored integrations');
      throw err;
    }
  });

  /**
   * POST /
   * Registers a new custom enterprise connector dynamically.
   */
  app.post<{
    Body: {
      name: string;
      sourceSystem: string;
      targetSystem: string;
      cloudProvider?: CloudProvider;
      protocol?: string;
      latencyBaselineMs?: number;
      errorRateBaseline?: number;
    };
  }>('/', async (request, reply) => {
    const { name, sourceSystem, targetSystem, cloudProvider = 'gcp', protocol = 'Custom Webhook', latencyBaselineMs = 250, errorRateBaseline = 0.01 } = request.body || {};

    if (!name || !sourceSystem || !targetSystem) {
      throw new BadRequestError('Fields "name", "sourceSystem", and "targetSystem" are required.');
    }

    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const endpointUrl = `https://integrisense-api-973128660063.us-central1.run.app/api/telemetry/ingest?integrationId=${id}`;

    const newConfig = {
      id,
      name,
      sourceSystem,
      targetSystem,
      cloudProvider,
      protocol,
      endpointUrl,
      normalMetrics: {
        latencyMeanMs: latencyBaselineMs,
        latencyStdDevMs: Math.round(latencyBaselineMs * 0.1),
        errorRate: errorRateBaseline,
        queueDepthMax: 5,
        dlqCount: 0,
      },
    };

    addMonitoredIntegration(newConfig);

    return reply.status(201).send({
      message: 'Custom connector registered successfully.',
      integrationId: id,
      endpointUrl,
      config: newConfig,
    });
  });

  /**
   * GET /:id
   * Returns details for a specific integration.
   */
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const config = MONITORED_INTEGRATIONS.find((integration) => integration.id === id);
    if (!config) {
      throw new NotFoundError(`Integration ${id}`);
    }

    try {
      const [activeIncidents, latencyBaseline, errorRateBaseline] = await Promise.all([
        firestoreService.listActiveIncidents(),
        bigqueryService.getLatencyBaseline(id),
        bigqueryService.getErrorRateBaseline(id),
      ]);

      const activeIncident = activeIncidents.find((inc) => inc.integrationId === id);

      let status: 'healthy' | 'degraded' | 'failed' = 'healthy';
      let latencyCurrentMs = config.normalMetrics.latencyMeanMs;
      let errorRateCurrent = config.normalMetrics.errorRate;
      let queueDepthCurrent = 0;
      let dlqCountCurrent = 0;

      if (activeIncident) {
        if (activeIncident.severity === 'critical' || activeIncident.severity === 'high') {
          status = 'failed';
        } else {
          status = 'degraded';
        }
        latencyCurrentMs = activeIncident.metricsSnapshot.latencyMs;
        errorRateCurrent = activeIncident.metricsSnapshot.errorRate;
        queueDepthCurrent = activeIncident.metricsSnapshot.queueDepth;
        dlqCountCurrent = activeIncident.metricsSnapshot.dlqCount;
      }

      const integration: Integration = {
        id: config.id,
        name: config.name,
        sourceSystem: config.sourceSystem,
        targetSystem: config.targetSystem,
        cloudProvider: config.cloudProvider || 'gcp',
        protocol: config.protocol || 'Pub/Sub Stream',
        endpointUrl: config.endpointUrl,
        status,
        latencyBaselineMs: Math.round(latencyBaseline.mean),
        latencyCurrentMs,
        errorRateBaseline: Math.round(errorRateBaseline * 1000) / 1000,
        errorRateCurrent,
        queueDepthCurrent,
        dlqCountCurrent,
        predictiveRisk: {
          failureProbability: status === 'healthy' ? 0.04 : status === 'degraded' ? 0.84 : 0.98,
          riskBadge: status === 'healthy' ? '🟢 Normal Risk (4%)' : status === 'degraded' ? '⚠️ 84% Failure Risk in Next 30 Mins' : '🚨 Critical Outage Active (98% Impact)',
          timeToFailureMin: status === 'healthy' ? 240 : status === 'degraded' ? 30 : 0,
          trend: status === 'healthy' ? 'stable' : 'increasing',
          modelConfidence: 0.96,
        },
        lastUpdated: activeIncident ? activeIncident.detectedAt : new Date().toISOString(),
      };

      return reply.status(200).send(integration);
    } catch (err: unknown) {
      request.log.error({ err, id }, 'Error retrieving integration details');
      throw err;
    }
  });

  /**
   * GET /:id/health
   * Returns health status and risk score details for a specific integration.
   */
  app.get<{ Params: { id: string } }>('/:id/health', async (request, reply) => {
    const { id } = request.params;
    const config = MONITORED_INTEGRATIONS.find((integration) => integration.id === id);
    if (!config) {
      throw new NotFoundError(`Integration ${id}`);
    }

    try {
      const [activeIncidents, failureProbabilities] = await Promise.all([
        firestoreService.listActiveIncidents(),
        bigqueryService.getLatestFailureProbabilities(),
      ]);

      const activeIncident = activeIncidents.find((inc) => inc.integrationId === id);
      const riskInfo = failureProbabilities.find((fp) => fp.integrationId === id);

      let status: 'healthy' | 'degraded' | 'failed' = 'healthy';
      if (activeIncident) {
        status = (activeIncident.severity === 'critical' || activeIncident.severity === 'high') ? 'failed' : 'degraded';
      }

      return reply.status(200).send({
        integrationId: id,
        status,
        riskScore: riskInfo?.riskScore ?? 0.05,
        riskLevel: riskInfo?.riskLevel ?? 'low',
        lastUpdated: riskInfo?.lastUpdated ?? new Date().toISOString(),
      });
    } catch (err: unknown) {
      request.log.error({ err, id }, 'Error retrieving integration health');
      throw err;
    }
  });
}

export default integrationRoutes;
