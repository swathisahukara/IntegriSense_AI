-- =============================================================================
-- IntegriSense AI — BigQuery Schema: failure_probability
-- =============================================================================
-- Stores AI-generated risk scores and failure predictions per integration.
-- Updated by the Prediction Agent.
-- =============================================================================

CREATE TABLE IF NOT EXISTS `integrisense-ai-2026.integrisense_ds.failure_probability`
(
  integration_id                    STRING    NOT NULL OPTIONS(description = 'Integration pipeline identifier'),
  integration_name                  STRING    NOT NULL OPTIONS(description = 'Human-readable integration name'),
  risk_score                        FLOAT64   NOT NULL OPTIONS(description = 'Deterministic risk score 0.0–1.0'),
  risk_level                        STRING    NOT NULL OPTIONS(description = 'LOW | MEDIUM | HIGH | CRITICAL'),
  predicted_failure_window_hours    INT64              OPTIONS(description = 'Hours until predicted failure'),
  confidence                        FLOAT64   NOT NULL OPTIONS(description = 'Prediction confidence 0.0–1.0'),
  contributing_factors              JSON               OPTIONS(description = 'Structured factors driving the risk score'),
  last_updated                      TIMESTAMP NOT NULL OPTIONS(description = 'When this record was last updated')
)
OPTIONS(
  description = 'IntegriSense AI — Integration failure probability scores'
);
