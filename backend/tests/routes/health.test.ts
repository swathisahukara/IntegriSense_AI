/**
 * IntegriSense AI — Health Route Tests
 *
 * Tests for GET /health endpoint.
 *
 * Strategy:
 *   - Use Fastify's inject() method to make test requests without a real HTTP server.
 *   - This is faster and more reliable than spinning up a real server per test.
 *   - Each test gets a fresh app instance to avoid state contamination.
 *
 * What we test:
 *   1. Status code is 200
 *   2. Response body has the exact required shape
 *   3. Content-Type is application/json
 *   4. Individual fields are correctly typed
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server.js';

describe('GET /health', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    // Create a fresh app instance for each test.
    // This prevents shared state between tests.
    app = await buildApp();
  });

  afterEach(async () => {
    // Close the app cleanly after each test to release resources.
    await app.close();
  });

  it('should return HTTP 200', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
  });

  it('should return JSON content type', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.headers['content-type']).toMatch(/application\/json/);
  });

  it('should return the expected response shape', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    const body = JSON.parse(response.body) as unknown;

    expect(body).toEqual({
      status: 'healthy',
      service: 'integrisense-api',
      environment: expect.any(String),
    });
  });

  it('should return status: "healthy"', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    const body = JSON.parse(response.body) as { status: string };
    expect(body.status).toBe('healthy');
  });

  it('should return service: "integrisense-api"', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    const body = JSON.parse(response.body) as { service: string };
    expect(body.service).toBe('integrisense-api');
  });

  it('should return a valid environment value', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    const body = JSON.parse(response.body) as { environment: string };
    expect(['development', 'staging', 'production', 'test']).toContain(body.environment);
  });

  it('should return 404 for unknown routes', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/unknown-route',
    });

    expect(response.statusCode).toBe(404);
  });

  it('should return 404 for POST /health', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/health',
    });

    // POST is not registered — should be 404
    expect(response.statusCode).toBe(404);
  });
});
