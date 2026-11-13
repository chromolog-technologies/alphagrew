import type { ElementType, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { breadcrumbTrail, SITE_PAGES, type SitePageId } from '../siteMap';

/** Centres content at the site's max width with responsive side gutters. */
export function Container({
  narrow = false,
  className,
  children,
}: {
  narrow?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn('mk-container', narrow && 'mk-container-narrow', className)}>{children}</div>;
}

export type SectionTone = 'light' | 'muted' | 'dark';

/** A full-width page band. Tone sets the background; spacing is shared across the site. */
export function Section({
  tone = 'light',
  tight = false,
  id,
  labelledBy,
  as: Tag = 'section',
  className,
  children,
}: {
  tone?: SectionTone;
  tight?: boolean;
  id?: string;
  /** id of the heading that names this section for assistive technology. */
  labelledBy?: string;
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag
      id={id}
      aria-labelledby={labelledBy}
      className={cn(tight ? 'mk-section-tight' : 'mk-section', `mk-tone-${tone}`, className)}
    >
      <Container>{children}</Container>
    </Tag>
  );
}

/** Eyebrow, heading and lede that open a section. */
export function SectionHeader({
  eyebrow,
  title,
  lede,
  id,
  align = 'left',
  className,
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  /** Heading id, for Section labelledBy. */
  id?: string;
  align?: 'left' | 'center';
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'mb-10 flex max-w-3xl flex-col gap-4 sm:mb-14',
        align === 'center' && 'mx-auto items-center text-center',
        className,
      )}
    >
      {eyebrow && <p className="mk-eyebrow">{eyebrow}</p>}
      <h2 id={id} className="mk-h2">
        {title}
      </h2>
      {lede && <p className="mk-lede">{lede}</p>}
      {children}
    </div>
  );
}

/** Breadcrumb trail derived from the site map. Hidden on the home page. */
export function Breadcrumbs({ page }: { page: SitePageId }) {
  const trail = breadcrumbTrail(page);
  if (trail.length < 2) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-ink-500">
        {trail.map((id, index) => {
          const isLast = index === trail.length - 1;
          return (
            <li key={id} className="flex items-center gap-1.5">
              {isLast ? (
                <span aria-current="page" className="font-medium text-ink-900">
                  {SITE_PAGES[id].label}
                </span>
              ) : (
                <>
                  <Link to={SITE_PAGES[id].path} className="transition-colors hover:text-iris-700">
                    {SITE_PAGES[id].label}
                  </Link>
                  <ChevronRight size={14} aria-hidden="true" className="text-ink-500" />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Pale-blue opening band for inner pages: breadcrumbs, eyebrow, h1, lede and optional actions or visual. */
export function PageHero({
  page,
  eyebrow,
  title,
  lede,
  actions,
  aside,
}: {
  page: SitePageId;
  eyebrow: ReactNode;
  title: ReactNode;
  lede: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="mk-tone-hero relative overflow-hidden pb-16 pt-10 sm:pb-24 sm:pt-14">
      <Container>
        <Breadcrumbs page={page} />
        <div className={cn('grid items-center gap-12', aside && 'lg:grid-cols-[1.05fr_1fr]')}>
          <div className="flex max-w-3xl flex-col gap-5">
            <p className="mk-eyebrow mk-rise">{eyebrow}</p>
            <h1 className="mk-h1 mk-rise mk-rise-1">{title}</h1>
            <p className="mk-lede mk-rise mk-rise-2">{lede}</p>
            {actions && <div className="mk-rise mk-rise-3 mt-2 flex flex-wrap gap-3">{actions}</div>}
          </div>
          {aside && <div className="mk-rise mk-rise-2">{aside}</div>}
        </div>
      </Container>
    </section>
  );
}

/** Responsive grid for cards: 1 column on phones, then 2, then the requested count. */
export function CardGrid({ cols = 3, className, children }: { cols?: 2 | 3 | 4; className?: string; children: ReactNode }) {
  const colsClass = { 2: 'md:grid-cols-2', 3: 'md:grid-cols-2 lg:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4' }[cols];
  return <div className={cn('grid gap-5 lg:gap-6', colsClass, className)}>{children}</div>;
}

/** Two-column text + visual layout that stacks on small screens. */
export function Split({
  reverse = false,
  align = 'center',
  className,
  children,
}: {
  reverse?: boolean;
  align?: 'center' | 'start';
  className?: string;
  children: [ReactNode, ReactNode];
}) {
  return (
    <div
      className={cn(
        'grid gap-12 lg:grid-cols-2 lg:gap-16 [&>*]:min-w-0',
        align === 'center' ? 'items-center' : 'items-start',
        reverse && 'lg:[&>*:first-child]:order-2',
        className,
      )}
    >
      {children}
    </div>
  );
}
