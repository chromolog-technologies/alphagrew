import { Suspense, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { LoadingState, PageErrorBoundary } from './Feedback';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

/**
 * Scrolls to the top (or to the #hash target) after navigation and moves focus to the
 * main region, so keyboard and screen reader users start reading the new page.
 * The first render is left alone so the browser keeps its own scroll restoration.
 */
function useRouteFocus(mainRef: React.RefObject<HTMLElement | null>) {
  const { pathname, hash } = useLocation();
  const lastLocation = useRef<string | null>(null);

  useEffect(() => {
    const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
    const current = pathname + hash;
    const previous = lastLocation.current;
    lastLocation.current = current;
    // First render (or StrictMode's repeat of it): only honour a #hash in the URL.
    if (previous === null || previous === current) {
      target?.scrollIntoView?.();
      return;
    }
    if (target) {
      target.scrollIntoView?.({ block: 'start' });
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    } else {
      window.scrollTo(0, 0);
      mainRef.current?.focus({ preventScroll: true });
    }
  }, [pathname, hash, mainRef]);
}

/** Once the first page is shown, fetch the other pages' code while the browser is idle. */
function useIdlePreload(preload?: () => Promise<unknown>) {
  useEffect(() => {
    if (!preload) return;
    const run = () => void preload().catch(() => {});
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(run, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(run, 2000);
    return () => window.clearTimeout(id);
  }, [preload]);
}

/** Shared shell for every public page: skip link, header, main region and footer. */
export default function SiteLayout({ preload }: { preload?: () => Promise<unknown> }) {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  useRouteFocus(mainRef);
  useIdlePreload(preload);

  return (
    <div className="mk-site">
      <a href="#main" className="mk-skip-link">
        Skip to content
      </a>
      <SiteHeader mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} />
      <main id="main" ref={mainRef} tabIndex={-1} className="flex-1 focus:outline-none" inert={mobileOpen}>
        <PageErrorBoundary resetKey={pathname}>
          <Suspense fallback={<LoadingState label="Loading page…" />}>
            <Outlet />
          </Suspense>
        </PageErrorBoundary>
      </main>
      <SiteFooter inert={mobileOpen} />
    </div>
  );
}
