/**
 * IntegriSense AI — Error Types
 *
 * Defines structured error classes used throughout the backend.
 * Fastify's error handler uses these to produce consistent API error responses.
 */

/**
 * Base application error.
 * All custom errors should extend this class.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 — The request body or query parameters failed validation.
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

/**
 * 400 — Bad request parameter or malformed body.
 */
export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

/**
 * 401 — The request is missing or has an invalid authentication token.
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

/**
 * 403 — The authenticated user does not have permission.
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

/**
 * 404 — The requested resource does not exist.
 */
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
  }
}

/**
 * 500 — An unexpected internal server error occurred.
 * isOperational = false signals that this may require manual intervention.
 */
export class InternalError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 500, false);
  }
}

/**
 * Type guard — checks whether a thrown value is an AppError.
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
