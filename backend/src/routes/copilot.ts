/**
 * IntegriSense AI — SRE Copilot & Multi-Agent Activity Routes
 *
 * Exposes interactive Gemini AI Copilot chat and agent reasoning traces.
 *
 * Endpoints:
 *   - POST /copilot/chat
 *   - GET  /copilot/activities
 */

import type { FastifyInstance } from 'fastify';
import geminiService from '../services/gemini.service.js';
import firestoreService from '../services/firestore.service.js';
import generatorService from '../services/generator.service.js';
import { MONITORED_INTEGRATIONS } from '../config/telemetry.config.js';
import { ValidationError } from '../utils/errors.js';

export async function copilotRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /copilot/chat
   * Friendly information endpoint for browser navigation.
   */
  app.get('/copilot/chat', async (request, reply) => {
    return reply.status(200).send({
      message: 'IntegriSense SRE Copilot API is online. Send a POST request with {"question": "..."} to query the copilot.',
      status: 'active',
      supportedMethods: ['POST'],
    });
  });

  /**
   * POST /copilot/chat
   * Interactive SRE troubleshooting conversation grounded on live telemetry.
   */
  app.post<{
    Body: {
      question: string;
      userLocalTime?: string;
    };
  }>('/copilot/chat', async (request, reply) => {
    const { question, userLocalTime } = request.body || {};

    if (!question || typeof question !== 'string') {
      throw new ValidationError("Missing required body parameter: 'question'");
    }

    const [activeIncidents, activeScenarios] = await Promise.all([
      firestoreService.listActiveIncidents(),
      firestoreService.loadActiveScenarios(),
    ]);

    const integrations = MONITORED_INTEGRATIONS.map((config) => ({
      id: config.id,
      name: config.name,
      source: config.sourceSystem,
      target: config.targetSystem,
      scenario: activeScenarios[config.id] ?? 'normal',
    }));

    const response = await geminiService.chatWithSRE(question, {
      integrations,
      activeIncidents,
      activeScenario: Object.values(activeScenarios)[0] ?? 'normal',
      userLocalTime,
    });

    return reply.status(200).send({
      question,
      response,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /copilot/activities
   * Returns recent agent activities and reasoning trace events.
   */
  app.get('/copilot/activities', async (request, reply) => {
    const incidents = await firestoreService.listIncidents();
    const allActivities = await Promise.all(
      incidents.map((inc) => firestoreService.listAgentActivities(inc.id))
    );

    const flattened = allActivities.flat().sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    return reply.status(200).send(flattened.slice(0, 30));
  });
}

export default copilotRoutes;
