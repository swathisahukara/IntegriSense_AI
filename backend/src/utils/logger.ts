/**
 * IntegriSense AI — Structured Logger
 *
 * Uses Pino for structured JSON logging.
 * In development: pretty-printed via pino-pretty.
 * In production (Cloud Run): plain JSON — compatible with Google Cloud Logging.
 *
 * IMPORTANT: Never log API keys, credentials, or sensitive payloads.
 */

import pino from 'pino';

const isDevelopment = process.env['NODE_ENV'] !== 'production';
const logLevel = process.env['LOG_LEVEL'] ?? 'info';

/**
 * Create the application logger.
 *
 * Cloud Run captures stdout — structured JSON logs are automatically
 * parsed and indexed by Google Cloud Logging.
 *
 * Note on exactOptionalPropertyTypes:
 *   We create two separate logger configs to avoid passing `undefined`
 *   where Pino's strict types don't allow it.
 */
export const logger: pino.Logger = isDevelopment
  ? pino({
      level: logLevel,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss.l',
          ignore: 'pid,hostname',
        },
      },
    })
  : pino({ level: logLevel });

/**
 * Create a child logger scoped to a specific module/component.
 * Child loggers inherit the parent's settings and add extra context.
 *
 * Usage:
 *   const log = createLogger('health-route');
 *   log.info({ requestId: '...' }, 'Health check called');
 */
export function createLogger(component: string): pino.Logger {
  return logger.child({ component });
}
