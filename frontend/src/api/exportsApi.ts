/**
 * CSV exports (GET /exports/{type}). The download needs the bearer token, so it is fetched as a
 * blob and saved through a temporary link instead of opening the URL directly.
 */
import { ApiError } from './apiError';
import { apiBaseUrl, getStoredToken } from './core';
import { withQuery } from './http';

export type ExportType = 'students' | 'staff' | 'attendance' | 'results';

export async function downloadExport(type: ExportType, query: Record<string, string | number | undefined> = {}): Promise<void> {
  const response = await fetch(`${apiBaseUrl}${withQuery(`/exports/${type}`, query)}`, {
    headers: { Accept: 'text/csv, application/json', Authorization: `Bearer ${getStoredToken() ?? ''}` },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.message ?? 'The export could not be downloaded.', response.status, body.errors ?? {});
  }

  const blob = await response.blob();
  const name = /filename="?([^";]+)"?/.exec(response.headers.get('Content-Disposition') ?? '')?.[1] ?? `${type}.csv`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
