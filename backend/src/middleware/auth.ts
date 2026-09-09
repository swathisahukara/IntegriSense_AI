/**
 * IntegriSense AI — Auth Middleware (Placeholder)
 *
 * Phase 14+ — Firebase Authentication JWT verification.
 *
 * In Phase 0, this is a placeholder stub.
 * The actual implementation will:
 *   1. Extract the Bearer token from the Authorization header
 *   2. Verify it against Firebase Auth / Google's public keys
 *   3. Attach the decoded user to request.user
 *   4. Reject with 401 if invalid or expired
 *
 * Azure equivalent:
 *   Similar to Azure AD JWT validation middleware in Azure Functions
 *   or API Management JWT validation policy.
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import { createLogger } from '../utils/logger.js';

const log = createLogger('auth-middleware');

/**
 * Placeholder authentication hook.
 * Currently allows all requests through (Phase 0 — no auth required).
 * Will be replaced with Firebase token verification in Phase 14.
 */
export async function authMiddleware(
  _request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  // Phase 0: No authentication required
  // Phase 14: Implement Firebase JWT verification here
  log.trace('Auth middleware — passthrough (Phase 0)');
}
