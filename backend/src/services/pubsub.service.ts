/**
 * IntegriSense AI — Pub/Sub Service
 *
 * Manages publishing real-time telemetry events to Google Cloud Pub/Sub.
 * Maps event objects from TS camelCase to the snake_case column names required
 * by the native BigQuery subscription schema.
 *
 * Supports an offline mock fallback (ENABLE_PUBSUB=false) to allow
 * local development and unit testing without cloud dependencies.
 *
 * Azure equivalent:
 *   Azure Service Bus or Event Hubs publisher service.
 */

import { PubSub } from '@google-cloud/pubsub';
import { env } from '../config/env.js';
import { createLogger } from '../utils/logger.js';
import type { IntegrationEvent } from '../models/integration.model.js';
import { AppError } from '../utils/errors.js';

const log = createLogger('pubsub-service');

export interface PubSubTelemetryMessage {
  event_id: string;
  integration_id: string;
  integration_name: string;
  source_system: string;
  target_system: string;
  event_type: string;
  status: 'success' | 'failure' | 'timeout' | 'retry';
  http_status_code: number | null;
  latency_ms: number;
  retry_count: number;
  payload_size_kb: number;
  error_code: string | null;
  error_message: string | null;
  queue_depth: number;
  dlq_count: number;
  region: string;
  environment: string;
  scenario: string;
  timestamp: string;
}

class PubSubService {
  private pubsub: PubSub | null = null;
  private topicName: string;

  // In-memory array fallback for offline development/testing
  private mockEvents: PubSubTelemetryMessage[] = [];

  constructor() {
    this.topicName = env.PUBSUB_TOPIC_INTEGRATION_EVENTS;

    if (env.ENABLE_PUBSUB) {
      log.info(
        { project: env.GCP_PROJECT_ID, topic: this.topicName },
        'Initializing Google Cloud Pub/Sub client...',
      );
      try {
        this.pubsub = new PubSub({
          projectId: env.GCP_PROJECT_ID,
          fallback: process.env['NODE_TLS_REJECT_UNAUTHORIZED'] === '0', // Use REST fallback locally if behind SSL-decrypting proxy
        } as unknown as ConstructorParameters<typeof PubSub>[0]);
      } catch (err: unknown) {
        log.error({ err }, 'Failed to initialize Pub/Sub client. Falling back to mock store.');
        this.pubsub = null;
      }
    } else {
      log.warn('Pub/Sub is disabled in configuration. Running in-memory mock fallback.');
    }
  }

  /**
   * Publishes an integration telemetry event.
   * Maps fields to snake_case format required by the BigQuery schema.
   */
  public async publishEvent(event: IntegrationEvent): Promise<string> {
    log.info({ eventId: event.eventId, integrationId: event.integrationId }, 'Publishing integration telemetry event');

    const message: PubSubTelemetryMessage = {
      event_id: event.eventId,
      integration_id: event.integrationId,
      integration_name: event.integrationName,
      source_system: event.sourceSystem,
      target_system: event.targetSystem,
      event_type: event.eventType,
      status: event.status,
      http_status_code: event.httpStatusCode ?? null,
      latency_ms: event.latencyMs,
      retry_count: event.retryCount,
      payload_size_kb: event.payloadSizeKb,
      error_code: event.errorCode ?? null,
      error_message: event.errorMessage ?? null,
      queue_depth: event.queueDepth,
      dlq_count: event.dlqCount,
      region: event.region,
      environment: event.environment,
      scenario: event.scenario,
      timestamp: event.timestamp,
    };

    if (this.pubsub) {
      try {
        const dataBuffer = Buffer.from(JSON.stringify(message));
        // publishMessage JSON payload format is standard in newer PubSub SDKs,
        // publish() with buffer is the most bulletproof cross-version method.
        const messageId = await this.pubsub.topic(this.topicName).publish(dataBuffer);
        log.debug({ eventId: event.eventId, messageId }, 'Event published to Pub/Sub successfully');
        return messageId;
      } catch (err: unknown) {
        log.error({ err, eventId: event.eventId }, 'Pub/Sub error during publishEvent');
        throw new AppError('Failed to publish telemetry event to Pub/Sub', 500);
      }
    } else {
      this.mockEvents.push(message);
      log.debug({ eventId: event.eventId }, 'Mock Pub/Sub: Telemetry event stored in memory');
      return `mock-msg-${crypto.randomUUID()}`;
    }
  }

  /**
   * Helper to retrieve mock published events (only used during unit testing).
   */
  public getMockEvents(): PubSubTelemetryMessage[] {
    return [...this.mockEvents];
  }

  /**
   * Helper to clear mocks (only used during unit testing).
   */
  public clearMocks(): void {
    this.mockEvents = [];
  }
}

export const pubsubService = new PubSubService();
export default pubsubService;
