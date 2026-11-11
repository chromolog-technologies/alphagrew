import { Badge } from '../ui';
import { APPLICATION_STATUS, type ApplicationStatus } from '../../api/placementApi';
import { ApiError } from '../../api/http';

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const meta = APPLICATION_STATUS[status];
  return <Badge variant={meta.tone}>{meta.label}</Badge>;
}

export function formatDate(value: string | null | undefined, withTime = false): string {
  if (!value) return '—';
  const date = new Date(value);
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

/** "3 days left", "Closes today", or null when there is no deadline. */
export function deadlineHint(value: string | null | undefined): string | null {
  if (!value) return null;
  const hours = (new Date(value).getTime() - Date.now()) / 36e5;
  if (hours < 0) return 'Closed';
  if (hours < 24) return 'Closes today';
  const days = Math.ceil(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} left`;
}

/** The server's message, or each reason it sent (eligibility and policy blockers). */
export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return error.message || fallback;
  }
  return fallback;
}
