/**
 * Error thrown by every API helper. Keeps the HTTP status and Laravel's 422 field errors
 * so screens can tell "not in your institution" (404), "no access" (403), "signed out" (401)
 * and invalid input (422) apart.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly errors: Record<string, string[]>;

  constructor(message: string, status: number, errors: Record<string, string[]> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }

  /** First validation message for a field, e.g. fieldError('institutionCode'). */
  fieldError(field: string): string | undefined {
    return this.errors[field]?.[0];
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Builds an ApiError from a failed response's JSON body ({ message, errors }). */
export function apiErrorFromResponse(status: number, payload: unknown, fallbackMessage: string): ApiError {
  const body = payload && typeof payload === 'object' ? (payload as { message?: unknown; errors?: unknown }) : {};
  const message = typeof body.message === 'string' && body.message ? body.message : fallbackMessage;
  const errors =
    body.errors && typeof body.errors === 'object' ? (body.errors as Record<string, string[]>) : {};

  return new ApiError(message, status, errors);
}
