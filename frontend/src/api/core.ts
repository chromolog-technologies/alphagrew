/**
 * The single request path to the Laravel API. http.ts, campusApi.ts and apiClient.ts are thin
 * wrappers over apiFetch, so every call gets the same behaviour:
 * - base URL from VITE_API_BASE_URL, Accept: application/json (Laravel then answers a
 *   validation error with a 422 instead of a redirect), JSON or FormData bodies;
 * - one ApiError type for every failure, with Laravel's message, field errors and code;
 * - a 401 on a request that carried a token signs the user out (SESSION_EXPIRED_EVENT);
 * - responses marked `X-Data-Source: sample` are reported through SAMPLE_DATA_EVENT, so the
 *   workspace can say the screen shows sample data.
 */
import { ApiError, apiErrorFromResponse } from './apiError';

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '') ?? '';

export const AUTH_STORAGE_KEY = 'chromolog-campus-auth';
/** Older builds stored the bare token here; App keeps it in step for screens not yet migrated. */
export const LEGACY_TOKEN_STORAGE_KEY = 'auth_token';

/** Fired when the API rejects the stored token (expired or revoked); App signs the user out. */
export const SESSION_EXPIRED_EVENT = 'campus:session-expired';

/** Fired with `detail: { path }` when a response carries `X-Data-Source: sample`. */
export const SAMPLE_DATA_EVENT = 'campus:sample-data';

export function isApiConfigured() {
  return Boolean(apiBaseUrl);
}

export function notifySessionExpired() {
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

/** The signed-in user's bearer token: the current session first, then the legacy key. */
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    const token = raw ? (JSON.parse(raw) as { token?: unknown })?.token : null;
    if (typeof token === 'string' && token.trim()) return token.trim();
  } catch {
    // Unreadable session: fall through to the legacy key.
  }
  const legacy = localStorage.getItem(LEGACY_TOKEN_STORAGE_KEY);
  return legacy && legacy.trim() ? legacy.trim() : null;
}

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiFetchOptions {
  method?: ApiMethod | string;
  /** A plain value is sent as JSON; FormData and strings are sent as they are. */
  body?: unknown;
  /** Explicit token; `null` sends none. Leave undefined to use the stored token. */
  token?: string | null;
  headers?: Record<string, string>;
  /** Message when the server gives none. */
  fallbackMessage?: string;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  if (!apiBaseUrl) {
    throw new ApiError('Campus API is not configured. Set VITE_API_BASE_URL.', 0);
  }

  const token = options.token === undefined ? getStoredToken() : options.token;
  const { body } = options;
  const isRaw = body instanceof FormData || typeof body === 'string' || body instanceof Blob;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(body === undefined || isRaw ? {} : { 'Content-Type': 'application/json' }),
    ...(typeof body === 'string' ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  };

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: body === undefined ? undefined : isRaw ? (body as BodyInit) : JSON.stringify(body),
  });

  if (response.headers.get('x-data-source') === 'sample') {
    window.dispatchEvent(new CustomEvent(SAMPLE_DATA_EVENT, { detail: { path } }));
  }

  const payload = (response.headers.get('content-type') ?? '').includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    if (response.status === 401 && token) {
      notifySessionExpired();
    }
    const fallback =
      response.status === 429
        ? 'Too many requests. Wait a minute and try again.'
        : (options.fallbackMessage ?? `Request failed (${response.status}).`);
    throw apiErrorFromResponse(response.status, payload, fallback);
  }

  return payload as T;
}
