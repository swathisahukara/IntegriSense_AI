/**
 * IntegriSense AI — Slack Webhook Alert Routes
 *
 * Provides endpoints for configuring and triggering test Slack notifications.
 */

import type { FastifyInstance } from 'fastify';
import slackService from '../services/slack.service.js';

export async function slackRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /api/slack/test
   * Sends a sample test incident alert card to Slack.
   */
  app.post<{ Body: { webhookUrl?: string } }>('/test', async (request, reply) => {
    const { webhookUrl } = request.body || {};

    const mockIncident = {
      id: `inc-test-${Date.now().toString().slice(-4)}`,
      integrationId: 'sap-to-data-platform',
      integrationName: 'SAP -> Data Platform',
      severity: 'high' as const,
      status: 'active' as const,
      detectedAt: new Date().toISOString(),
      triggerReason: 'Spike in error rate & latency z-score > 3.5',
      rootCause: 'Upstream RFC Connection Pool Saturation detected during high-throughput sync cycle.',
      metricsSnapshot: {
        latencyMs: 3420,
        errorRate: 0.14,
        queueDepth: 450,
        dlqCount: 18,
        zScore: 3.8,
        riskScore: 0.88,
      },
    };

    const success = await slackService.notifyIncident(mockIncident, 'SAP -> Data Platform', webhookUrl);

    if (!success) {
      return reply.status(400).send({
        success: false,
        message: 'Failed to deliver test notification. Please verify the Webhook URL.',
      });
    }

    return reply.status(200).send({
      success: true,
      message: 'Test incident notification delivered to Slack successfully!',
    });
  });

  /**
   * POST /api/slack/config
   * Updates the global Slack webhook URL in runtime.
   */
  app.post<{ Body: { webhookUrl: string } }>('/config', async (request, reply) => {
    const { webhookUrl } = request.body || {};
    if (!webhookUrl) {
      return reply.status(400).send({ error: 'webhookUrl is required' });
    }

    slackService.setWebhookUrl(webhookUrl);
    return reply.status(200).send({
      message: 'Slack Webhook URL configured successfully.',
    });
  });
}

export default slackRoutes;
