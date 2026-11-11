/** Small building blocks shared by the owner console pages. */
import type { ReactNode } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { Badge, Button, Card, Skeleton } from '@/components/ui';
import { institutionStatusLabels, verificationLabels, type InstitutionStatus, type PageMeta, type VerificationStatus } from '../../api/ownerApi';

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function KpiCard({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {icon ? <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</span> : null}
      </div>
    </Card>
  );
}

const statusVariant: Record<InstitutionStatus, 'success' | 'info' | 'warning' | 'destructive' | 'secondary'> = {
  active: 'success',
  trial: 'info',
  prospect: 'secondary',
  suspended: 'destructive',
  expired: 'warning',
  closed: 'secondary',
};

export function InstitutionStatusBadge({ status }: { status: InstitutionStatus }) {
  return <Badge variant={statusVariant[status] ?? 'secondary'}>{institutionStatusLabels[status] ?? status}</Badge>;
}

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const variant = status === 'verified' ? 'success' : status === 'rejected' ? 'destructive' : status === 'requires_information' ? 'warning' : 'secondary';
  return <Badge variant={variant}>{verificationLabels[status] ?? status}</Badge>;
}

export function UserStatusBadge({ status }: { status: string }) {
  const variant = status === 'active' ? 'success' : status === 'suspended' || status === 'rejected' ? 'destructive' : 'warning';
  return (
    <Badge variant={variant} className="capitalize">
      {status}
    </Badge>
  );
}

export function LoadingRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : 'Something went wrong.';
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center text-sm">
      <AlertCircle className="text-destructive" size={22} aria-hidden="true" />
      <p className="text-foreground">{message}</p>
      {onRetry ? (
        <Button size="sm" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border p-8 text-center">
      <Inbox className="text-muted-foreground" size={22} aria-hidden="true" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? <p className="max-w-sm text-xs text-muted-foreground">{description}</p> : null}
    </div>
  );
}

export function Pagination({ meta, onPage }: { meta?: PageMeta; onPage: (page: number) => void }) {
  if (!meta || meta.lastPage <= 1) {
    return meta ? <p className="text-xs text-muted-foreground">{meta.total} total</p> : null;
  }

  return (
    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
      <span>
        Page {meta.currentPage} of {meta.lastPage} · {meta.total} total
      </span>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={meta.currentPage <= 1} onClick={() => onPage(meta.currentPage - 1)} aria-label="Previous page">
          <ChevronLeft size={14} />
        </Button>
        <Button size="sm" variant="outline" disabled={meta.currentPage >= meta.lastPage} onClick={() => onPage(meta.currentPage + 1)} aria-label="Next page">
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
}

/** A labelled native field used by the owner forms. */
export function Field({ label, error, hint, children, htmlFor }: { label: string; error?: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-foreground">
        {label}
      </label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

const dateTime = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const dateOnly = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export function formatDateTime(value: string | null | undefined): string {
  return value ? dateTime.format(new Date(value)) : '—';
}

export function formatDate(value: string | null | undefined): string {
  return value ? dateOnly.format(new Date(value)) : '—';
}

/** "owner.institution_created" → "Institution created". */
export function actionLabel(action: string): string {
  const last = action.split('.').pop() ?? action;
  const text = last.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function errorMessage(error: unknown, fallback = 'That did not work.'): string {
  return error instanceof Error ? error.message : fallback;
}
