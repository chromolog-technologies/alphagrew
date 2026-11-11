/**
 * The one error type thrown by every API helper (core.ts, http.ts, campusApi.ts, apiClient.ts).
 * Keeps the HTTP status, Laravel's 422 field errors and the optional machine-readable code,
 * so screens can tell "not in your institution" (404), "no access" (403), "signed out" (401)
 * and invalid input (422) apart.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly errors: Record<string, string[]>;
  readonly code?: string;

  constructor(message: string, status: number, errors: Record<string, string[]> = {}, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
    this.code = code;
  }

  /** Laravel's per-field messages (same as `errors`). */
  get fieldErrors(): Record<string, string[]> {
    return this.errors;
  }

  /** First message per field, for showing next to inputs. */
  get firstFieldErrors(): Record<string, string> {
    return Object.fromEntries(Object.entries(this.errors).map(([field, messages]) => [field, messages[0] ?? '']));
  }

  /** First validation message for a field, e.g. fieldError('institutionCode'). */
  fieldError(field: string): string | undefined {
    return this.errors[field]?.[0];
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Builds an ApiError from a failed response's JSON body ({ message, errors, code }). */
export function apiErrorFromResponse(status: number, payload: unknown, fallbackMessage: string): ApiError {
  const body = payload && typeof payload === 'object' ? (payload as { message?: unknown; errors?: unknown; code?: unknown }) : {};
  const message = typeof body.message === 'string' && body.message ? body.message : fallbackMessage;
  const errors =
    body.errors && typeof body.errors === 'object' ? (body.errors as Record<string, string[]>) : {};
  const code = typeof body.code === 'string' && body.code ? body.code : undefined;

  return new ApiError(message, status, errors, code);
}
