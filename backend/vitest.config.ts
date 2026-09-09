/**
 * IntegriSense AI — Vitest Configuration
 */

import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Use Node environment (not jsdom — this is a backend project)
    environment: 'node',

    // Force offline mock mode for all tests
    env: {
      ENABLE_BIGQUERY: 'false',
      ENABLE_PUBSUB: 'false',
      ENABLE_FIRESTORE: 'false',
      NODE_ENV: 'test',
    },

    // Glob for test files
    include: ['tests/**/*.test.ts'],

    // TypeScript config for tests (includes tests/ directory)
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },

    // Global timeout per test (ms)
    testTimeout: 10_000,

    // Show verbose output
    reporter: ['verbose'],

    // Coverage configuration (used with npm run test:coverage)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts'], // Entry point — tested via integration tests
    },
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
