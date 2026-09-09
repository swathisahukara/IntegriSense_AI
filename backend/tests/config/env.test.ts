/**
 * IntegriSense AI — Environment Configuration Tests
 *
 * Tests the Zod environment validation schema.
 * We test the schema logic directly, not the singleton `env` export.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// ── Re-define the schema here for isolated testing ────────────────────────────
// We cannot re-run parseEnv() since it calls process.exit on failure.
// Instead, we test the Zod schema directly.

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1024).max(65535).default(8080),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  GCP_PROJECT_ID: z.string().min(1).default('integrisense-ai-2026'),
  GCP_REGION: z.string().min(1).default('us-central1'),
  BIGQUERY_DATASET: z.string().min(1).default('integrisense_ds'),
  PUBSUB_TOPIC_INTEGRATION_EVENTS: z.string().min(1).default('integration-events'),
  PUBSUB_SUBSCRIPTION_BQ: z.string().min(1).default('integration-events-bq-sub'),
  FIRESTORE_DATABASE: z.string().min(1).default('(default)'),
  GEMINI_API_KEY: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string().min(1).default('integrisense-ai-2026'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
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

describe('Environment Configuration Schema', () => {
  it('should parse successfully with all defaults (empty input)', () => {
    const result = EnvSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should use default PORT of 8080', () => {
    const result = EnvSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.PORT).toBe(8080);
    }
  });

  it('should use default NODE_ENV of development', () => {
    const result = EnvSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NODE_ENV).toBe('development');
    }
  });

  it('should coerce PORT from string to number', () => {
    const result = EnvSchema.safeParse({ PORT: '3001' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.PORT).toBe(3001);
    }
  });

  it('should reject an invalid NODE_ENV value', () => {
    const result = EnvSchema.safeParse({ NODE_ENV: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('should reject PORT below minimum (1024)', () => {
    const result = EnvSchema.safeParse({ PORT: '80' });
    expect(result.success).toBe(false);
  });

  it('should reject PORT above maximum (65535)', () => {
    const result = EnvSchema.safeParse({ PORT: '99999' });
    expect(result.success).toBe(false);
  });

  it('should parse ENABLE_AGENTS "true" as boolean true', () => {
    const result = EnvSchema.safeParse({ ENABLE_AGENTS: 'true' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ENABLE_AGENTS).toBe(true);
    }
  });

  it('should parse ENABLE_AGENTS "false" as boolean false', () => {
    const result = EnvSchema.safeParse({ ENABLE_AGENTS: 'false' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ENABLE_AGENTS).toBe(false);
    }
  });

  it('should make GEMINI_API_KEY optional', () => {
    const result = EnvSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.GEMINI_API_KEY).toBeUndefined();
    }
  });

  it('should accept all valid LOG_LEVEL values', () => {
    const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
    for (const level of levels) {
      const result = EnvSchema.safeParse({ LOG_LEVEL: level });
      expect(result.success).toBe(true);
    }
  });

  it('should reject an invalid LOG_LEVEL', () => {
    const result = EnvSchema.safeParse({ LOG_LEVEL: 'verbose' });
    expect(result.success).toBe(false);
  });
});
