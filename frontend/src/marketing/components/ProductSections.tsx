import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CAPABILITIES, type CapabilityId } from '../content/capabilities';
import { solutionPath, solutionRole, type SolutionRoleId } from '../siteMap';
import { IconTile, StatusBadge, Step } from './Cards';
import { CardGrid } from './Layout';

/** Building blocks shared by the three product pages (AI Interviewer, Career Intelligence, Placement Management). */

export interface ProductFeature {
  icon: LucideIcon;
  title: string;
  body: ReactNode;
  /** The capability whose build status this feature carries. */
  capability: CapabilityId;
  /** Who gains from it; each links to that audience's solution page. */
  benefits: SolutionRoleId[];
  /** One line on what that audience gets out of it. */
  why: string;
}

function AudienceLinks({ roles }: { roles: SolutionRoleId[] }) {
  return (
    <>
      {roles.map((role, index) => (
        <span key={role}>
          {index > 0 && ', '}
          <Link to={solutionPath(role)} className="mk-link">
            {solutionRole(role).label}
          </Link>
        </span>
      ))}
    </>
  );
}

/** Feature cards that say who benefits and carry a build-status chip. */
export function FeatureDetails({ features }: { features: ProductFeature[] }) {
  return (
    <CardGrid cols={3}>
      {features.map((feature) => (
        <article key={feature.title} className="mk-card">
          <div className="flex items-start justify-between gap-3">
            <IconTile icon={feature.icon} />
            <StatusBadge status={CAPABILITIES[feature.capability].status} />
          </div>
          <h3 className="mk-h3">{feature.title}</h3>
          <div className="flex flex-1 flex-col gap-3 text-ink-500">{feature.body}</div>
          <div className="mt-auto border-t border-line pt-4 text-sm">
            <p className="font-semibold text-ink-900">
              Who benefits: <AudienceLinks roles={feature.benefits} />
            </p>
            <p className="mt-1 text-ink-500">{feature.why}</p>
          </div>
        </article>
      ))}
    </CardGrid>
  );
}

export interface WorkflowStep {
  title: string;
  /** Who carries out this step, e.g. "Student" or "Alphagrew". */
  actor: string;
  body: ReactNode;
  capability?: CapabilityId;
}

/** A vertical numbered workflow with a status chip per step. */
export function Workflow({ steps, className }: { steps: WorkflowStep[]; className?: string }) {
  return (
    <ol className={className ?? 'm-0 list-none p-0'}>
      {steps.map((step, index) => (
        <Step key={step.title} index={index + 1} role={step.actor} title={step.title}>
          <div className="flex flex-col items-start gap-2">
            <div>{step.body}</div>
            {step.capability && <StatusBadge status={CAPABILITIES[step.capability].status} />}
          </div>
        </Step>
      ))}
    </ol>
  );
}

export interface UseCase {
  audience: SolutionRoleId;
  title: string;
  body: ReactNode;
}

/** Short scenarios, one per audience. */
export function UseCases({ items }: { items: UseCase[] }) {
  return (
    <CardGrid cols={3}>
      {items.map((item) => (
        <article key={item.title} className="mk-card">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-iris-700">{solutionRole(item.audience).label}</p>
          <h3 className="mk-h3">{item.title}</h3>
          <div className="flex flex-col gap-3 text-ink-500">{item.body}</div>
        </article>
      ))}
    </CardGrid>
  );
}

export interface Benefit {
  title: string;
  body: string;
}

/** Numbered benefit statements, used near the top of each product page. */
export function BenefitList({ items }: { items: Benefit[] }) {
  return (
    <ul className="m-0 grid list-none gap-x-10 gap-y-8 p-0 md:grid-cols-2 lg:grid-cols-4">
      {items.map((item, index) => (
        <li key={item.title} className="flex flex-col gap-2 border-t-2 border-iris-500 pt-4">
          <span className="font-mono text-xs font-semibold text-iris-700">{String(index + 1).padStart(2, '0')}</span>
          <h3 className="mk-h3 text-lg">{item.title}</h3>
          <p className="text-ink-500">{item.body}</p>
        </li>
      ))}
    </ul>
  );
}

/** A plain statement of what exists today and what does not, shown near the top of each product page. */
export function BuildNote({ title = "What's in the current build", items }: { title?: string; items: ReactNode[] }) {
  return (
    <aside aria-label={title} className="mt-12 rounded-2xl border border-line bg-mist-50 p-5 sm:p-6">
      <p className="mb-3 font-display font-semibold text-ink-900">{title}</p>
      <ul className="mk-ticks text-sm text-ink-700">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </aside>
  );
}
