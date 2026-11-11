import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { CAPABILITIES, STATUS_DESCRIPTION, STATUS_LABEL, type CapabilityId, type CapabilityStatus } from '../content/capabilities';

/** "In current build" / "In development" / "Planned" chip. Every feature claim on the site should carry one. */
export function StatusBadge({ status, className }: { status: CapabilityStatus; className?: string }) {
  return <span className={cn('mk-badge', `mk-badge-${status}`, className)}>{STATUS_LABEL[status]}</span>;
}

export function CapabilityBadge({ id }: { id: CapabilityId }) {
  return <StatusBadge status={CAPABILITIES[id].status} />;
}

/** Marks a mockup or example as sample data so it is never read as a real customer metric. */
export function SampleBadge({ children = 'Illustrative sample data' }: { children?: ReactNode }) {
  return <span className="mk-badge mk-badge-sample">{children}</span>;
}

export function IconTile({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="mk-icon-tile">
      <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
    </span>
  );
}

/**
 * A feature card. With `to`, the heading becomes a link that covers the card,
 * so the whole card is one tab stop.
 */
export function FeatureCard({
  icon,
  title,
  children,
  to,
  linkLabel = 'Learn more',
  status,
  plain = false,
  headingLevel: H = 'h3',
}: {
  icon?: LucideIcon;
  title: string;
  children: ReactNode;
  to?: string;
  linkLabel?: string;
  status?: CapabilityStatus;
  plain?: boolean;
  headingLevel?: 'h2' | 'h3' | 'h4';
}) {
  return (
    <article className={cn('mk-card', plain && 'mk-card-plain', to && 'mk-card-interactive')}>
      {(icon || status) && (
        <div className="flex items-start justify-between gap-3">
          {icon && <IconTile icon={icon} />}
          {status && <StatusBadge status={status} />}
        </div>
      )}
      <H className="mk-h3">
        {to ? (
          <Link to={to} className="mk-card-link focus-visible:outline-none">
            {title}
          </Link>
        ) : (
          title
        )}
      </H>
      <div className="flex flex-1 flex-col gap-3 text-ink-500">{children}</div>
      {to && (
        <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-iris-700" aria-hidden="true">
          {linkLabel}
          <ArrowRight size={15} />
        </span>
      )}
    </article>
  );
}

/** A numbered step in a process list. Use inside an <ol>. */
export function Step({
  index,
  role,
  title,
  id,
  children,
}: {
  index: number;
  role?: string;
  title: string;
  /** Anchor id, for linking to this step. */
  id?: string;
  children: ReactNode;
}) {
  return (
    <li id={id} className="group relative grid grid-cols-[auto_1fr] gap-5 pb-10 last:pb-0">
      <div className="flex flex-col items-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-iris-600 font-display text-sm font-bold text-white shadow-[0_8px_20px_-8px_rgb(76_61_199/0.8)]">
          {index}
        </span>
        <span aria-hidden="true" className="mt-2 w-px flex-1 bg-line group-last:hidden" />
      </div>
      <div className="flex flex-col gap-1.5 pt-1.5">
        {role && <p className="text-xs font-semibold uppercase tracking-[0.08em] text-iris-700">{role}</p>}
        <h3 className="mk-h3">{title}</h3>
        <div className="text-ink-500">{children}</div>
      </div>
    </li>
  );
}

/** Explains the status chips. Place it once, near the first chip on a page that lists many. */
export function StatusLegend({ className }: { className?: string }) {
  const statuses: CapabilityStatus[] = ['available', 'building', 'planned'];
  return (
    <dl className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {statuses.map((status) => (
        <div key={status} className="flex flex-col items-start gap-1.5">
          <dt>
            <StatusBadge status={status} />
          </dt>
          <dd className="m-0 text-sm text-ink-500">{STATUS_DESCRIPTION[status]}</dd>
        </div>
      ))}
      <div className="flex flex-col items-start gap-1.5">
        <dt>
          <span className="mk-badge mk-badge-planned">Illustrative</span>
        </dt>
        <dd className="m-0 text-sm text-ink-500">Product pictures on this site are mockups with sample data, not live screenshots.</dd>
      </div>
    </dl>
  );
}

/** A list of capabilities, each with its name, summary and status chip. */
export function CapabilityList({
  ids,
  summaries,
  className,
}: {
  ids: CapabilityId[];
  /** Audience-specific wording that replaces the default summary for some capabilities. */
  summaries?: Partial<Record<CapabilityId, string>>;
  className?: string;
}) {
  return (
    <ul className={cn('flex flex-col divide-y divide-line', className)}>
      {ids.map((id) => (
        <li key={id} className="flex flex-col gap-1.5 py-4 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-ink-900">{CAPABILITIES[id].name}</span>
            <StatusBadge status={CAPABILITIES[id].status} />
          </div>
          <p className="text-sm text-ink-500">{summaries?.[id] ?? CAPABILITIES[id].summary}</p>
        </li>
      ))}
    </ul>
  );
}

/** "Related pages" links at the end of a page, so readers can continue to the next relevant page. */
export function RelatedLinks({
  title = 'Keep exploring',
  links,
}: {
  title?: string;
  links: { to: string; label: string; description: string }[];
}) {
  return (
    <nav aria-labelledby="related-title" className="flex flex-col gap-5">
      <h2 id="related-title" className="mk-h3 text-xl">
        {title}
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <li key={link.to} className="mk-card mk-card-interactive gap-1.5 p-5">
            <Link to={link.to} className="mk-card-link inline-flex items-center gap-1.5 font-semibold text-ink-900 focus-visible:outline-none">
              {link.label}
              <ArrowRight size={15} aria-hidden="true" className="text-iris-700" />
            </Link>
            <p className="text-sm text-ink-500">{link.description}</p>
          </li>
        ))}
      </ul>
    </nav>
  );
}
