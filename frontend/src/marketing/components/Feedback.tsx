import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, RotateCcw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button, ButtonLink } from './Button';

/**
 * Loading, error and status states for interactive parts of the public site
 * (the demo form today; search, pricing calculators or embedded data later).
 */

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2">
      <span className="mk-spinner" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Placeholder while a section's data or code loads. */
export function LoadingState({ label = 'Loading…', className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cn('flex items-center justify-center gap-3 py-16 text-ink-500', className)}>
      <span className="mk-spinner text-iris-600" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

/** Shown when a section fails. Offer a retry only when there is something to retry. */
export function ErrorState({
  title = 'Something went wrong',
  message = 'This part of the page could not be loaded.',
  onRetry,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div role="alert" className={cn('mk-card items-start', className)}>
      <span className="mk-icon-tile !bg-red-50 !text-red-700 !border-red-100">
        <AlertTriangle size={20} aria-hidden="true" />
      </span>
      <h2 className="mk-h3">{title}</h2>
      <p className="text-ink-500">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RotateCcw size={15} aria-hidden="true" /> Try again
        </Button>
      )}
    </div>
  );
}

const ALERT_STYLES = {
  info: { icon: Info, box: 'border-iris-200 bg-iris-50 text-ink-700', iconColor: 'text-iris-700' },
  success: { icon: CheckCircle2, box: 'border-emerald-200 bg-emerald-50 text-emerald-950', iconColor: 'text-emerald-700' },
  warning: { icon: AlertTriangle, box: 'border-amber-200 bg-amber-50 text-amber-950', iconColor: 'text-amber-700' },
  error: { icon: AlertTriangle, box: 'border-red-200 bg-red-50 text-red-950', iconColor: 'text-red-700' },
} as const;

/** Inline message box. Errors are announced immediately; other tones politely. */
export function InlineAlert({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: keyof typeof ALERT_STYLES;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const { icon: Icon, box, iconColor } = ALERT_STYLES[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cn('flex gap-3 rounded-xl border p-4 text-sm', box, className)}>
      <Icon size={18} className={cn('mt-0.5 shrink-0', iconColor)} aria-hidden="true" />
      <div className="flex flex-col gap-1">
        {title && <p className="font-semibold">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}

interface BoundaryProps {
  children: ReactNode;
  /** Changing this value clears the error, e.g. pass the current pathname. */
  resetKey?: string;
}

/** Keeps one broken page from blanking the whole site; the header and footer stay usable. */
export class PageErrorBoundary extends Component<BoundaryProps, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page failed to render', error, info.componentStack);
  }

  componentDidUpdate(prev: BoundaryProps) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mk-container mk-section flex flex-col items-start gap-4">
        <h1 className="mk-h2">This page could not be displayed</h1>
        <p className="mk-lede">Please reload the page. If it keeps happening, the rest of the site is still available.</p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => window.location.reload()}>Reload page</Button>
          <ButtonLink to="/" variant="secondary">
            Go to the home page
          </ButtonLink>
        </div>
      </div>
    );
  }
}
