/**
 * Typed HTTP client for the Laravel API. Every new API module uses it, so errors are
 * handled the same way everywhere:
 * - 401 → the session expired; App signs the user out (SESSION_EXPIRED_EVENT).
 * - 422 → ApiError.fieldErrors holds Laravel's per-field messages for forms.
 * - 403 / 404 / 409 / 423 / 429 → ApiError with the server's message.
 */

import { ApiError } from './apiError';
import { apiBaseUrl, apiFetch, getStoredToken, isApiConfigured, notifySessionExpired } from './core';

export { ApiError, isApiConfigured };

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

function send<T>(method: Method, path: string, body?: unknown, options: { auth?: boolean } = {}): Promise<T> {
  return apiFetch<T>(path, { method, body, token: options.auth === false ? null : undefined });
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

/** Downloads a file response (CSV export) and saves it under the server's file name. */
export async function downloadFile(path: string, query?: Query, fallbackName = 'export.csv'): Promise<void> {
  if (!apiBaseUrl) {
    throw new ApiError('Campus API is not configured.', 0);
  }

  const token = getStoredToken();
  const response = await fetch(`${apiBaseUrl}${withQuery(path, query)}`, {
    headers: { Accept: 'text/csv, application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });

  if (!response.ok) {
    const payload = (response.headers.get('content-type') ?? '').includes('application/json') ? await response.json() : null;
    if (response.status === 401 && token) notifySessionExpired();
    throw new ApiError(
      typeof payload?.message === 'string' ? payload.message : response.status === 429 ? 'Too many exports. Wait a minute and try again.' : `Download failed (${response.status}).`,
      response.status,
    );
  }

  const name = /filename="?([^";]+)"?/i.exec(response.headers.get('content-disposition') ?? '')?.[1] ?? fallbackName;
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

/** Laravel resource collection page. */
export interface Paginated<T> {
  data: T[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
}
