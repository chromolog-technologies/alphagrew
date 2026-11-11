import { ButtonLink } from '../components/Button';
import { Container } from '../components/Layout';
import { usePageMeta } from '../components/PageMeta';
import { DEMO_PATH, SIGN_IN_PATH } from '../navigation';
import { SITE_PAGES } from '../siteMap';

const SUGGESTIONS = [SITE_PAGES.platform, SITE_PAGES.solutions, SITE_PAGES.howItWorks, SITE_PAGES.faq];

export default function NotFoundPage() {
  usePageMeta({ title: 'Page not found', noindex: true });

  return (
    <section className="mk-tone-hero py-24 sm:py-32">
      <Container narrow>
        <div className="flex flex-col items-start gap-5">
          <p className="mk-eyebrow">Error 404</p>
          <h1 className="mk-h1">We couldn't find that page.</h1>
          <p className="mk-lede">
            The link may be old or mistyped. If you were signing in, the sign-in page has moved to its own address.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <ButtonLink to="/" arrow>
              Go to the home page
            </ButtonLink>
            <ButtonLink to={SIGN_IN_PATH} variant="secondary">
              Sign in
            </ButtonLink>
            <ButtonLink to={DEMO_PATH} variant="ghost">
              Book a demo
            </ButtonLink>
          </div>
          <nav aria-label="Popular pages" className="mt-6 w-full border-t border-line pt-6">
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {SUGGESTIONS.map((page) => (
                <li key={page.path}>
                  <ButtonLink to={page.path} variant="ghost" size="sm">
                    {page.label}
                  </ButtonLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </Container>
    </section>
  );
}
