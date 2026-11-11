import { useEffect } from 'react';
import { BRAND, siteUrl } from '../config';
import { SITE_PAGES, type SitePageId } from '../siteMap';

function upsertMeta(attr: 'name' | 'property', key: string, content: string | null) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (content === null) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

function upsertCanonical(href: string | null) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (href === null) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = href;
}

export function documentTitle(title: string) {
  return title.startsWith(BRAND) ? title : `${title} | ${BRAND}`;
}

interface MetaInput {
  title: string;
  description?: string;
  path?: string;
  noindex?: boolean;
}

/** Sets the document title, description, canonical URL, robots and Open Graph tags. */
export function usePageMeta({ title, description, path, noindex = false }: MetaInput) {
  useEffect(() => {
    const fullTitle = documentTitle(title);
    const origin = siteUrl();
    const url = origin && path ? `${origin}${path === '/' ? '' : path}` : null;

    document.title = fullTitle;
    upsertMeta('name', 'description', description ?? null);
    upsertMeta('name', 'robots', noindex ? 'noindex, follow' : null);
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', description ?? null);
    upsertMeta('property', 'og:url', url);
    upsertCanonical(url);
  }, [title, description, path, noindex]);
}

/** Metadata for a page listed in the site map. */
export function PageMeta({ page }: { page: SitePageId }) {
  const { title, description, path, noindex } = SITE_PAGES[page];
  usePageMeta({ title: page === 'home' ? `${BRAND}: ${title}` : title, description, path, noindex });
  return null;
}
