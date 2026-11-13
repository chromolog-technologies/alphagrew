import { CalendarCheck } from 'lucide-react';
import { DEMO_PATH } from '../navigation';
import { SITE_PAGES } from '../siteMap';
import { ButtonLink } from './Button';
import { Container } from './Layout';

/** Closing call to action used at the end of most pages: a full-width royal-blue band. */
export function CtaBand({
  title = 'See Alphagrew with your own departments and batches',
  lede = 'Book a walkthrough and we will show you how a placement season could run on Alphagrew, using your eligibility rules.',
  primary = { to: DEMO_PATH, label: 'Book a demo' },
  secondary = { to: SITE_PAGES.howItWorks.path, label: 'See how it works' },
}: {
  title?: string;
  lede?: string;
  /** The main button; defaults to Book a demo. */
  primary?: { to: string; label: string };
  /** The second button; pass a different page when the CTA sits on the How it works page itself. */
  secondary?: { to: string; label: string };
}) {
  return (
    <section aria-labelledby="cta-title" className="mk-tone-brand relative overflow-hidden py-12 sm:py-16">
      <Container>
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex max-w-2xl flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
            <span className="mk-cta-icon" aria-hidden="true">
              <CalendarCheck size={24} strokeWidth={1.8} />
            </span>
            <div className="flex flex-col gap-3">
              <h2 id="cta-title" className="mk-h2 !text-[clamp(1.5rem,1.25rem+1vw,2.1rem)]">
                {title}
              </h2>
              <p className="mk-lede">{lede}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 lg:shrink-0">
            <ButtonLink to={primary.to} size="lg" arrow>
              {primary.label}
            </ButtonLink>
            <ButtonLink to={secondary.to} variant="secondary" size="lg">
              {secondary.label}
            </ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
