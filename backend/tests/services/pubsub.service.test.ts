import { describe, it, expect, beforeEach } from 'vitest';
import pubsubService from '../../src/services/pubsub.service.js';
import type { IntegrationEvent } from '../../src/models/integration.model.js';

describe('Pub/Sub Service (In-Memory Fallback)', () => {
  beforeEach(() => {
    pubsubService.clearMocks();
  });

  it('should successfully publish a telemetry event to mock memory with snake_case mapping', async () => {
    const testEvent: IntegrationEvent = {
      eventId: 'evt-123',
      integrationId: 'sap-to-data-platform',
      integrationName: 'SAP -> Data Platform',
      sourceSystem: 'SAP',
      targetSystem: 'BigQuery Data Lake',
      eventType: 'transaction',
      status: 'success',
      httpStatusCode: 200,
      latencyMs: 345,
      retryCount: 0,
      payloadSizeKb: 12.5,
      queueDepth: 2,
      dlqCount: 0,
      region: 'us-central1',
      environment: 'development',
      scenario: 'normal',
      timestamp: new Date().toISOString(),
    };

    const messageId = await pubsubService.publishEvent(testEvent);

    expect(messageId).toMatch(/^mock-msg-/);
    
    const mockEvents = pubsubService.getMockEvents();
    expect(mockEvents).toHaveLength(1);
    expect(mockEvents[0]).toEqual({
      event_id: 'evt-123',
      integration_id: 'sap-to-data-platform',
      integration_name: 'SAP -> Data Platform',
      source_system: 'SAP',
      target_system: 'BigQuery Data Lake',
      event_type: 'transaction',
      status: 'success',
      http_status_code: 200,
      latency_ms: 345,
      retry_count: 0,
      payload_size_kb: 12.5,
      error_code: null,
      error_message: null,
      queue_depth: 2,
      dlq_count: 0,
      region: 'us-central1',
      environment: 'development',
      scenario: 'normal',
      timestamp: testEvent.timestamp,
    });
  });

  it('should handle optional HTTP status codes and error info correctly', async () => {
    const testEvent: IntegrationEvent = {
      eventId: 'evt-567',
      integrationId: 'sap-to-data-platform',
      integrationName: 'SAP -> Data Platform',
      sourceSystem: 'SAP',
      targetSystem: 'BigQuery Data Lake',
      eventType: 'transaction',
      status: 'failure',
      latencyMs: 1500,
      retryCount: 3,
      payloadSizeKb: 4.2,
      errorCode: 'ERR_TIMEOUT',
      errorMessage: 'Read timeout reached',
      queueDepth: 45,
      dlqCount: 1,
      region: 'us-central1',
      environment: 'development',
      scenario: 'incident',
      timestamp: new Date().toISOString(),
    };

    await pubsubService.publishEvent(testEvent);

    const mockEvents = pubsubService.getMockEvents();
    expect(mockEvents).toHaveLength(1);
    expect(mockEvents[0].http_status_code).toBeNull();
    expect(mockEvents[0].error_code).toBe('ERR_TIMEOUT');
    expect(mockEvents[0].error_message).toBe('Read timeout reached');
  });

  it('should clear stored mock events on calling clearMocks', async () => {
    const testEvent: IntegrationEvent = {
      eventId: 'evt-999',
      integrationId: 'salesforce-to-crm',
      integrationName: 'Salesforce -> CRM',
      sourceSystem: 'Salesforce',
      targetSystem: 'CRM',
      eventType: 'sync',
      status: 'success',
      latencyMs: 120,
      retryCount: 0,
      payloadSizeKb: 1.5,
      queueDepth: 0,
      dlqCount: 0,
      region: 'us-central1',
      environment: 'development',
      scenario: 'normal',
      timestamp: new Date().toISOString(),
    };

    await pubsubService.publishEvent(testEvent);
    expect(pubsubService.getMockEvents()).toHaveLength(1);

    pubsubService.clearMocks();
    expect(pubsubService.getMockEvents()).toHaveLength(0);
  });
});
