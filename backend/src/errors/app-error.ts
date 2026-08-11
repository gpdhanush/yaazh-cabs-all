export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly errors: Record<string, unknown> | null = null,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed.", errors: Record<string, unknown> | null = null) {
    super(400, message, errors, "VALIDATION_ERROR");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized.") {
    super(401, message, null, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden.") {
    super(403, message, null, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found.") {
    super(404, message, null, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict.") {
    super(409, message, null, "CONFLICT");
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "Too many requests.") {
    super(429, message, null, "RATE_LIMITED");
  }
}
