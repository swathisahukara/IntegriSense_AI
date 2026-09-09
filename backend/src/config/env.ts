/**
 * IntegriSense AI — Environment Configuration
 *
 * Validates and parses environment variables at startup using Zod.
 * The application will FAIL FAST with a clear error if any required
 * variable is missing or malformed — preventing mysterious runtime failures.
 *
 * Azure equivalent:
 *   This is similar to reading from Azure App Configuration or using
 *   environment variable validation in Azure Functions.
 *
 * Usage:
 *   import { env } from './config/env.js';
 *   console.log(env.PORT);
 */

import { z } from 'zod';
import { createLogger } from '../utils/logger.js';

const log = createLogger('env');

// ── Schema Definition ─────────────────────────────────────────────────────────
/**
 * Defines the shape and constraints of all required and optional
 * environment variables.
 */
const EnvSchema = z.object({
  // ── Server ─────────────────────────────────────────────────────────────────
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1024).max(65535).default(8080),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // ── GCP Project ────────────────────────────────────────────────────────────
  GCP_PROJECT_ID: z.string().min(1).default('integrisense-ai-2026'),
  GCP_REGION: z.string().min(1).default('us-central1'),

  // ── BigQuery ───────────────────────────────────────────────────────────────
  BIGQUERY_DATASET: z.string().min(1).default('integrisense_ds'),

  // ── Pub/Sub ────────────────────────────────────────────────────────────────
  PUBSUB_TOPIC_INTEGRATION_EVENTS: z.string().min(1).default('integration-events'),
  PUBSUB_SUBSCRIPTION_BQ: z.string().min(1).default('integration-events-bq-sub'),

  // ── Firestore ──────────────────────────────────────────────────────────────
  FIRESTORE_DATABASE: z.string().min(1).default('(default)'),

  // ── Gemini ─────────────────────────────────────────────────────────────────
  // Optional in Phase 0 — required from Phase 7
  GEMINI_API_KEY: z.string().optional(),

  // ── Firebase ───────────────────────────────────────────────────────────────
  FIREBASE_PROJECT_ID: z.string().min(1).default('integrisense-ai-2026'),

  // ── CORS ───────────────────────────────────────────────────────────────────
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // ── Feature Flags ──────────────────────────────────────────────────────────
  // Allows incremental enablement of GCP-dependent features.
  // In Phase 0, all are false — backend runs without any GCP dependency.
  ENABLE_AGENTS: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  ENABLE_BIGQUERY: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  ENABLE_PUBSUB: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  ENABLE_FIRESTORE: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
});

// ── Export Type ───────────────────────────────────────────────────────────────
export type Env = z.infer<typeof EnvSchema>;

// ── Parse & Validate ──────────────────────────────────────────────────────────
/**
 * Parse process.env against the schema.
 * Throws with a detailed error message if validation fails.
 * Called once at application startup.
 */
function parseEnv(): Env {
  const result = EnvSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    log.fatal({ errors: result.error.issues }, 'Environment validation failed');
    // Print to stderr so it's visible even before the logger is fully configured
    process.stderr.write(`\n[IntegriSense] Invalid environment configuration:\n${errors}\n\n`);
    process.exit(1);
  }

  return result.data;
}

/**
 * Validated, typed environment configuration.
 * Import this instead of reading process.env directly.
 */
export const env = parseEnv();

log.debug(
  {
    NODE_ENV: env.NODE_ENV,
    PORT: env.PORT,
    GCP_PROJECT_ID: env.GCP_PROJECT_ID,
    ENABLE_BIGQUERY: env.ENABLE_BIGQUERY,
    ENABLE_AGENTS: env.ENABLE_AGENTS,
  },
  'Environment configuration loaded',
);
