/**
 * Build-time rendering of the public pages (see scripts/prerender.mjs). Each page is rendered
 * to HTML with the same component tree as main.tsx, so the browser can hydrate it. Search
 * engines and link previews then see real content instead of an empty page.
 */
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Root from './Root';
import { documentTitle } from './marketing/components/PageMeta';
import { BRAND, SHARE_IMAGE, siteUrl } from './marketing/config';
import { preloadMarketingPages } from './marketing/MarketingRoutes';
import { SITE_PAGES, type SitePageId } from './marketing/siteMap';

export const PAGE_IDS = Object.keys(SITE_PAGES) as SitePageId[];

export async function renderPage(path: string): Promise<string> {
  // Every page chunk is loaded first, so lazy pages render their content, not the fallback.
  await preloadMarketingPages();
  return renderToString(
    <StrictMode>
      <StaticRouter location={path}>
        <QueryClientProvider client={new QueryClient()}>
          <Root />
        </QueryClientProvider>
      </StaticRouter>
    </StrictMode>,
  );
}

/** The head tags usePageMeta would set in the browser, for the static HTML. */
export function pageHead(id: SitePageId) {
  const page = SITE_PAGES[id];
  const origin = siteUrl();
  return {
    path: page.path,
    title: documentTitle(id === 'home' ? `${BRAND}: ${page.title}` : page.title),
    description: page.description,
    url: `${origin}${page.path === '/' ? '/' : page.path}`,
    image: `${origin}${SHARE_IMAGE.path}`,
    noindex: Boolean(page.noindex),
  };
}
