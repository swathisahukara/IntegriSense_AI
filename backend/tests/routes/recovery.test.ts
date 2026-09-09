import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server.js';
import firestoreService from '../../src/services/firestore.service.js';
import type { RecoveryAction } from '../../src/models/incident.model.js';

describe('Recovery Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApp();
    firestoreService.clearMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  const sampleAction: RecoveryAction = {
    id: 'rec-123',
    incidentId: 'inc-99',
    playbookName: 'Flush Kafka Queue',
    recommendedAction: 'Execute queue flush CLI tool with topic consumer group offset reset',
    expectedImpact: 'Reduce queue backlog to 0 within 5 minutes',
    riskLevel: 'medium',
    riskDescription: 'Temporary data delay for consumer applications',
    rollbackPlan: 'Restore consumer offset checkpoints',
    approvalRequired: true,
    status: 'pending',
  };

  describe('GET /recovery/:id', () => {
    it('should return recovery action details when it exists', async () => {
      await firestoreService.createRecoveryAction(sampleAction);

      const response = await app.inject({
        method: 'GET',
        url: '/recovery/rec-123',
      });

      expect(response.statusCode).toBe(200);
      const action = JSON.parse(response.body) as RecoveryAction;
      expect(action.id).toBe('rec-123');
      expect(action.playbookName).toBe('Flush Kafka Queue');
      expect(action.status).toBe('pending');
    });

    it('should return 404 for non-existent recovery action', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/recovery/non-existent',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /recovery/:id/approve', () => {
    it('should approve a pending recovery action recommendation', async () => {
      await firestoreService.createRecoveryAction(sampleAction);

      const response = await app.inject({
        method: 'POST',
        url: '/recovery/rec-123/approve',
        payload: { operatorId: 'operator-alice' },
      });

      expect(response.statusCode).toBe(200);
      const action = JSON.parse(response.body) as RecoveryAction;
      expect(action.status).toBe('approved');
      expect(action.decidedBy).toBe('operator-alice');
      expect(action.decidedAt).toBeDefined();

      // Double check in database
      const dbAction = await firestoreService.getRecoveryAction('rec-123');
      expect(dbAction.status).toBe('approved');
    });

    it('should return 404 if recovery action does not exist for approval', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/recovery/non-existent/approve',
        payload: { operatorId: 'operator-alice' },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /recovery/:id/reject', () => {
    it('should reject a pending recovery action recommendation', async () => {
      await firestoreService.createRecoveryAction(sampleAction);

      const response = await app.inject({
        method: 'POST',
        url: '/recovery/rec-123/reject',
        payload: { operatorId: 'operator-bob' },
      });

      expect(response.statusCode).toBe(200);
      const action = JSON.parse(response.body) as RecoveryAction;
      expect(action.status).toBe('rejected');
      expect(action.decidedBy).toBe('operator-bob');
      expect(action.decidedAt).toBeDefined();

      // Double check in database
      const dbAction = await firestoreService.getRecoveryAction('rec-123');
      expect(dbAction.status).toBe('rejected');
    });

    it('should return 404 if recovery action does not exist for rejection', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/recovery/non-existent/reject',
        payload: { operatorId: 'operator-bob' },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
