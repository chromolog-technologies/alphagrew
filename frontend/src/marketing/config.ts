// Deployment settings for the public site. Both are optional: without them the site
// still works, but the demo form cannot send and pages carry no canonical URL.
// Read on each call (not at import) so tests can stub them.

/** Inbox that receives demo requests, e.g. "hello@example.com". */
export const contactEmail = () => (import.meta.env.VITE_CONTACT_EMAIL ?? '').trim();

/** Public origin of the marketing site, e.g. "https://www.example.com", without a trailing slash. */
export const siteUrl = () => (import.meta.env.VITE_SITE_URL ?? '').trim().replace(/\/+$/, '');

export const BRAND = 'Alphagrew';
export const COMPANY = 'Chromolog Technologies';
