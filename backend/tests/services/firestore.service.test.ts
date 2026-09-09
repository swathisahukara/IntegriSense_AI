/**
 * IntegriSense AI — Firestore Service Tests
 *
 * Tests the database operations (CRUD) using the in-memory fallback.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { firestoreService } from '../../src/services/firestore.service.js';
import type { Incident, RecoveryAction, AgentActivity } from '../../src/models/incident.model.js';
import { NotFoundError } from '../../src/utils/errors.js';

describe('Firestore Service (In-Memory Fallback)', () => {
  beforeEach(() => {
    // Clear mock databases before each test to ensure isolation
    firestoreService.clearMocks();
  });

  // ── Incidents Tests ────────────────────────────────────────────────────────

  const testIncident: Incident = {
    id: 'inc-123',
    integrationId: 'sap-to-db',
    integrationName: 'SAP -> Data Platform',
    severity: 'high',
    status: 'active',
    detectedAt: '2026-08-16T12:00:00.000Z',
    triggerReason: 'Latency exceeded baseline by 500%',
    metricsSnapshot: {
      latencyMs: 12000,
      errorRate: 0.12,
      queueDepth: 450,
      dlqCount: 0,
    },
  };

  it('should successfully create and retrieve an incident', async () => {
    await firestoreService.createIncident(testIncident);

    const result = await firestoreService.getIncident('inc-123');
    expect(result).toEqual(testIncident);
  });

  it('should throw a NotFoundError if the incident does not exist', async () => {
    await expect(firestoreService.getIncident('non-existent')).rejects.toThrow(NotFoundError);
  });

  it('should successfully update an incident', async () => {
    await firestoreService.createIncident(testIncident);

    await firestoreService.updateIncident('inc-123', { status: 'resolved', resolvedAt: '2026-08-16T12:30:00.000Z' });

    const result = await firestoreService.getIncident('inc-123');
    expect(result.status).toBe('resolved');
    expect(result.resolvedAt).toBe('2026-08-16T12:30:00.000Z');
  });

  it('should throw NotFoundError when updating non-existent incident', async () => {
    await expect(firestoreService.updateIncident('non-existent', { status: 'resolved' })).rejects.toThrow(NotFoundError);
  });

  it('should list only active incidents in descending order', async () => {
    const olderActive: Incident = {
      ...testIncident,
      id: 'inc-1',
      detectedAt: '2026-08-16T10:00:00.000Z',
    };
    const newerActive: Incident = {
      ...testIncident,
      id: 'inc-2',
      detectedAt: '2026-08-16T11:00:00.000Z',
    };
    const resolvedIncident: Incident = {
      ...testIncident,
      id: 'inc-3',
      status: 'resolved',
      detectedAt: '2026-08-16T12:00:00.000Z',
    };

    await firestoreService.createIncident(olderActive);
    await firestoreService.createIncident(newerActive);
    await firestoreService.createIncident(resolvedIncident);

    const activeList = await firestoreService.listActiveIncidents();

    expect(activeList.length).toBe(2);
    // Ordered descending by detectedAt
    expect(activeList[0]?.id).toBe('inc-2');
    expect(activeList[1]?.id).toBe('inc-1');
  });

  // ── Recovery Action Tests ──────────────────────────────────────────────────

  const testAction: RecoveryAction = {
    id: 'act-999',
    incidentId: 'inc-123',
    playbookName: 'Flush Queue',
    recommendedAction: 'Purge messages in the SAP backlog queue.',
    expectedImpact: 'Reduce latency instantly.',
    riskLevel: 'medium',
    riskDescription: 'Data from the backlog period may require reprocessing.',
    rollbackPlan: 'Queue backup is retained in cold storage.',
    approvalRequired: true,
    status: 'pending',
  };

  it('should successfully create and retrieve a recovery action', async () => {
    await firestoreService.createRecoveryAction(testAction);

    const result = await firestoreService.getRecoveryAction('act-999');
    expect(result).toEqual(testAction);
  });

  it('should successfully update an operator approval decision', async () => {
    await firestoreService.createRecoveryAction(testAction);

    await firestoreService.updateRecoveryDecision('act-999', 'approved', 'operator-xyz');

    const result = await firestoreService.getRecoveryAction('act-999');
    expect(result.status).toBe('approved');
    expect(result.decidedBy).toBe('operator-xyz');
    expect(result.decidedAt).toBeDefined();
  });

  // ── Agent Activity Tests ────────────────────────────────────────────────────

  const testActivity: AgentActivity = {
    id: 'act-log-1',
    incidentId: 'inc-123',
    agentName: 'MonitorAgent',
    activityType: 'analysis',
    message: 'Detected error spike exceeding 10%',
    timestamp: '2026-08-16T12:05:00.000Z',
  };

  it('should successfully log and retrieve agent activities in timestamp order', async () => {
    const firstActivity = { ...testActivity, id: 'log-1', timestamp: '2026-08-16T12:01:00.000Z' };
    const secondActivity = { ...testActivity, id: 'log-2', timestamp: '2026-08-16T12:02:00.000Z' };
    const otherIncidentActivity = { ...testActivity, id: 'log-3', incidentId: 'inc-different', timestamp: '2026-08-16T12:03:00.000Z' };

    await firestoreService.logAgentActivity(secondActivity);
    await firestoreService.logAgentActivity(firstActivity);
    await firestoreService.logAgentActivity(otherIncidentActivity);

    const list = await firestoreService.listAgentActivities('inc-123');

    expect(list.length).toBe(2);
    // Sorted ascending by timestamp
    expect(list[0]?.id).toBe('log-1');
    expect(list[1]?.id).toBe('log-2');
  });
});
