/**
 * Typed HTTP client for the Laravel API. Every new API module uses it, so errors are
 * handled the same way everywhere:
 * - 401 → the session expired; App signs the user out (SESSION_EXPIRED_EVENT).
 * - 422 → ApiError.fieldErrors holds Laravel's per-field messages for forms.
 * - 403 / 404 / 409 / 423 / 429 → ApiError with the server's message.
 */

import { notifySessionExpired } from './campusApi';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '') ?? '';

const AUTH_KEY = 'chromolog-campus-auth';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** First message per field, for showing next to inputs. */
  get firstFieldErrors(): Record<string, string> {
    return Object.fromEntries(Object.entries(this.fieldErrors).map(([field, messages]) => [field, messages[0] ?? '']));
  }
}

export function isApiConfigured() {
  return Boolean(apiBaseUrl);
}

function storedToken(): string | null {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY) ?? 'null')?.token ?? null;
  } catch {
    return null;
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type Query = Record<string, string | number | boolean | null | undefined>;

export function withQuery(path: string, query?: Query): string {
  if (!query) return path;
  const search = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `${path}?${text}` : path;
}

async function send<T>(method: Method, path: string, body?: unknown, options: { auth?: boolean } = {}): Promise<T> {
  if (!apiBaseUrl) {
    throw new ApiError('Campus API is not configured.', 0);
  }

  const token = options.auth === false ? null : storedToken();
  const isForm = body instanceof FormData;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(isForm || body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  const payload = (response.headers.get('content-type') ?? '').includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    if (response.status === 401 && token) {
      notifySessionExpired();
    }

    const fallback = response.status === 429 ? 'Too many requests. Wait a minute and try again.' : `Request failed (${response.status}).`;
    throw new ApiError(typeof payload?.message === 'string' ? payload.message : fallback, response.status, payload?.errors ?? {});
  }

  return payload as T;
}

export const http = {
  get: <T>(path: string, query?: Query) => send<T>('GET', withQuery(path, query)),
  post: <T>(path: string, body: unknown = {}) => send<T>('POST', path, body),
  put: <T>(path: string, body: unknown = {}) => send<T>('PUT', path, body),
  patch: <T>(path: string, body: unknown = {}) => send<T>('PATCH', path, body),
  delete: <T>(path: string) => send<T>('DELETE', path),
  /** For pages used before signing in (no Authorization header). */
  public: {
    get: <T>(path: string, query?: Query) => send<T>('GET', withQuery(path, query), undefined, { auth: false }),
    post: <T>(path: string, body: unknown = {}) => send<T>('POST', path, body, { auth: false }),
  },
};

/** Laravel resource collection page. */
export interface Paginated<T> {
  data: T[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
}
