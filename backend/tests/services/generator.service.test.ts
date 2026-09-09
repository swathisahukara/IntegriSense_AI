import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import generatorService from '../../src/services/generator.service.js';
import firestoreService from '../../src/services/firestore.service.js';
import pubsubService from '../../src/services/pubsub.service.js';
import { MONITORED_INTEGRATIONS, TELEMETRY_SCENARIOS } from '../../src/config/telemetry.config.js';

describe('Generator Service', () => {
  beforeEach(() => {
    // Disable random error rate for normal scenario during tests to ensure 100% determinism
    TELEMETRY_SCENARIOS.normal.errorRate = 0;

    generatorService.stop();
    firestoreService.clearMocks();
    pubsubService.clearMocks();

    // Reset integrations to normal
    for (const integration of MONITORED_INTEGRATIONS) {
      generatorService.setScenario(integration.id, 'normal');
    }
  });

  afterEach(() => {
    generatorService.stop();
  });

  it('should initialize all integrations to normal scenario', () => {
    for (const integration of MONITORED_INTEGRATIONS) {
      expect(generatorService.getScenario(integration.id)).toBe('normal');
    }
  });

  it('should set and get scenario correctly', () => {
    generatorService.setScenario('sap-to-data-platform', 'degradation');
    expect(generatorService.getScenario('sap-to-data-platform')).toBe('degradation');
    expect(generatorService.getScenario('salesforce-to-crm')).toBe('normal');
  });

  it('should generate events and update BigQuery and Pub/Sub on tick', async () => {
    // Cast to access private tick() method for testing
    await (generatorService as unknown as { tick: () => Promise<void> }).tick();

    // Check that events were published to Pub/Sub
    const published = pubsubService.getMockEvents();
    expect(published).toHaveLength(4); // 4 integrations
    expect(published[0].integration_id).toBeDefined();
    expect(published[0].latency_ms).toBeGreaterThan(0);

    // Check that incidents were not created (since scenario is normal)
    const incidents = await firestoreService.listActiveIncidents();
    expect(incidents).toHaveLength(0);
  });

  it('should automatically create Firestore incidents and Agent Activity logs when incident scenario is ticked', async () => {
    // Set to incident scenario
    generatorService.setScenario('sap-to-data-platform', 'incident');

    // Trigger tick
    await (generatorService as unknown as { tick: () => Promise<void> }).tick();

    // Verify incident was created in Firestore
    const incidents = await firestoreService.listActiveIncidents();
    expect(incidents).toHaveLength(1);
    expect(incidents[0].integrationId).toBe('sap-to-data-platform');
    expect(['high', 'critical']).toContain(incidents[0].severity);
    expect(incidents[0].status).toBe('active');

    // Verify Agent Activity log was appended
    const activities = await firestoreService.listAgentActivities(incidents[0].id);
    expect(activities).toHaveLength(1);
    expect(activities[0].agentName).toBe('MonitorAgent');
    expect(activities[0].activityType).toBe('analysis');
    expect(activities[0].message).toContain('MonitorAgent triggered active incident');
  });

  it('should automatically resolve Firestore incident when integration returns to normal scenario', async () => {
    // 1. Trigger incident
    generatorService.setScenario('shopify-to-erp', 'cascading');
    await (generatorService as unknown as { tick: () => Promise<void> }).tick();

    const activeIncidents = await firestoreService.listActiveIncidents();
    expect(activeIncidents).toHaveLength(1);
    const incidentId = activeIncidents[0].id;

    // 2. Set back to normal and tick again
    generatorService.setScenario('shopify-to-erp', 'normal');
    await (generatorService as unknown as { tick: () => Promise<void> }).tick();

    // Verify active incidents is now empty
    const activeIncidentsAfter = await firestoreService.listActiveIncidents();
    expect(activeIncidentsAfter).toHaveLength(0);

    // Verify it is still listed in all incidents as resolved
    const allIncidents = await firestoreService.listIncidents();
    expect(allIncidents).toHaveLength(1);
    expect(allIncidents[0].status).toBe('resolved');
    expect(allIncidents[0].resolvedAt).toBeDefined();

    // Verify resolution activity log was created
    const activities = await firestoreService.listAgentActivities(incidentId);
    expect(activities).toHaveLength(2); // 1 trigger, 1 resolve
    expect(activities[1].activityType).toBe('decision');
    expect(activities[1].message).toContain('Automatically resolved incident');
  });
});
