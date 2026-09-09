-- =============================================================================
-- IntegriSense AI — BigQuery Schema: integration_events
-- =============================================================================
-- Partition: timestamp (DAY)
-- Cluster: integration_id, status
-- =============================================================================

CREATE TABLE IF NOT EXISTS `integrisense-ai-2026.integrisense_ds.integration_events`
(
  event_id                STRING    NOT NULL OPTIONS(description = 'Unique event identifier'),
  integration_id          STRING    NOT NULL OPTIONS(description = 'Integration pipeline identifier'),
  integration_name        STRING    NOT NULL OPTIONS(description = 'Human-readable integration name'),
  source_system           STRING    NOT NULL OPTIONS(description = 'Source system (e.g., Salesforce)'),
  target_system           STRING    NOT NULL OPTIONS(description = 'Target system (e.g., Dynamics CRM)'),
  event_type              STRING    NOT NULL OPTIONS(description = 'sync | transfer | api_call | message | etl'),
  status                  STRING    NOT NULL OPTIONS(description = 'success | failure | timeout | retry | partial'),
  http_status_code        INT64              OPTIONS(description = 'HTTP response status code if applicable'),
  latency_ms              INT64     NOT NULL OPTIONS(description = 'End-to-end latency in milliseconds'),
  retry_count             INT64     NOT NULL OPTIONS(description = 'Number of retries attempted for this event'),
  payload_size_kb         FLOAT64            OPTIONS(description = 'Payload size in kilobytes'),
  error_code              STRING             OPTIONS(description = 'Application-level error code if applicable'),
  error_message           STRING             OPTIONS(description = 'Human-readable error description'),
  queue_depth             INT64              OPTIONS(description = 'Current queue depth at time of event'),
  dlq_count               INT64              OPTIONS(description = 'Dead letter queue count at time of event'),
  region                  STRING    NOT NULL OPTIONS(description = 'GCP region where event was processed'),
  environment             STRING    NOT NULL OPTIONS(description = 'dev | staging | prod'),
  scenario                STRING             OPTIONS(description = 'Synthetic scenario tag for demo purposes'),
  timestamp               TIMESTAMP NOT NULL OPTIONS(description = 'Event timestamp — partition key'),
  ingestion_time          TIMESTAMP          OPTIONS(description = 'BigQuery ingestion timestamp')
)
PARTITION BY DATE(timestamp)
CLUSTER BY integration_id, status
OPTIONS(
  description = 'IntegriSense AI — Enterprise integration event telemetry',
  partition_expiration_days = 365
);
