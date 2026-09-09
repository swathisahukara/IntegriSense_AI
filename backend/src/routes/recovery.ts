/**
 * IntegriSense AI — Recovery Routes
 *
 * REST API endpoints for viewing and making decisions on recovery playbook recommendations (Human-in-the-loop).
 *
 * Endpoints:
 *   - GET /:id
 *   - POST /:id/approve
 *   - POST /:id/reject
 */

import type { FastifyInstance } from 'fastify';
import firestoreService from '../services/firestore.service.js';
import generatorService from '../services/generator.service.js';
import slackService from '../services/slack.service.js';

export async function recoveryRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /:id
   * Retrieves detail for a specific recovery action entry by its ID.
   */
  app.get<{ Params: { id: string } }>(
    '/:id',
    async (request, reply) => {
      const { id } = request.params;
      try {
        const action = await firestoreService.getRecoveryAction(id);
        return reply.status(200).send(action);
      } catch (err: unknown) {
        request.log.error({ err, id }, 'Error retrieving recovery action');
        throw err;
      }
    },
  );

  /**
   * POST /:id/approve
   * Operator decision to approve execution of a recovery playbook.
   */
  app.post<{ Params: { id: string }; Body: { operatorId?: string } }>(
    '/:id/approve',
    async (request, reply) => {
      const { id } = request.params;
      const operatorId = request.body?.operatorId ?? 'operator-1';

      await firestoreService.updateRecoveryDecision(id, 'approved', operatorId);
      const updatedAction = await firestoreService.getRecoveryAction(id);

      try {
        const activeIncidents = await firestoreService.listActiveIncidents();
        const targetIncidents = activeIncidents.filter(
          (inc) => inc.id === id || inc.integrationId === id || id.includes(inc.integrationId) || id.includes(inc.id)
        );

        const incidentsToResolve = targetIncidents.length > 0 ? targetIncidents : activeIncidents;
        const currentScenarios = await firestoreService.loadActiveScenarios();

        for (const inc of incidentsToResolve) {
          await firestoreService.updateIncident(inc.id, {
            status: 'resolved',
            resolvedAt: new Date().toISOString(),
          });
          currentScenarios[inc.integrationId] = 'normal';
          generatorService.setScenario(inc.integrationId, 'normal');

          await firestoreService.logAgentActivity({
            id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            incidentId: inc.id,
            agentName: 'RecoveryAgent',
            activityType: 'decision',
            message: `RecoveryAgent executed self-healing playbook for ${inc.integrationName}. Restored pipeline to healthy baseline.`,
            timestamp: new Date().toISOString(),
          });

          // Send Slack notification for self-healing execution
          slackService.notifyRecoveryExecuted(
            {
              id: `rec-${inc.id}`,
              incidentId: inc.id,
              playbookName: 'Auto-scale & Clear Backlog',
              recommendedAction: `Auto-scaled throughput capacity & cleared backlog for ${inc.integrationName}.`,
              expectedImpact: 'Restored pipeline baseline in 1.2 seconds',
              riskLevel: 'low',
              riskDescription: 'Automated recovery action',
              rollbackPlan: 'Revert worker scale',
              approvalRequired: false,
              status: 'executed',
            },
            inc.integrationName,
          ).catch((err) => request.log.error({ err }, 'Failed to send Slack recovery alert'));
        }

        await firestoreService.saveActiveScenarios(currentScenarios);
        await generatorService.triggerNow();
      } catch (err: unknown) {
        request.log.error({ err, id }, 'Non-fatal error resolving incidents during recovery approval');
      }

      return reply.status(200).send(updatedAction);
    },
  );

  /**
   * POST /:id/reject
   * Operator decision to reject execution of a recovery playbook.
   */
  app.post<{ Params: { id: string }; Body: { operatorId?: string } }>(
    '/:id/reject',
    async (request, reply) => {
      const { id } = request.params;
      const operatorId = request.body?.operatorId ?? 'operator-1';

      await firestoreService.updateRecoveryDecision(id, 'rejected', operatorId);
      const updatedAction = await firestoreService.getRecoveryAction(id);
      return reply.status(200).send(updatedAction);
    },
  );
}

export default recoveryRoutes;
