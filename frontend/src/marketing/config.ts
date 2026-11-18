// Deployment settings for the public site. All are optional: without them the site still
// works, but contact rows are hidden, pages carry no canonical URL and nothing is measured.
// Read on each call (not at import) so tests can stub them.

const env = (value: string | undefined) => (value ?? '').trim();

/** Public contact inbox, e.g. "hello@example.com". Shown in the footer and on the Contact page. */
export const contactEmail = () => env(import.meta.env.VITE_CONTACT_EMAIL);

/** Public contact phone in display form, e.g. "+91 80 1234 5678". */
export const contactPhone = () => env(import.meta.env.VITE_CONTACT_PHONE);

/** Short public address, e.g. "Bengaluru, India". */
export const contactAddress = () => env(import.meta.env.VITE_CONTACT_ADDRESS);

/** tel: link target: digits and a leading plus only. */
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

/** Public origin of the marketing site, e.g. "https://www.example.com", without a trailing slash. */
export const siteUrl = () => env(import.meta.env.VITE_SITE_URL).replace(/\/+$/, '');

/** Plausible site domain, e.g. "alphagrew.com". Empty turns analytics off. */
export const plausibleDomain = () => env(import.meta.env.VITE_PLAUSIBLE_DOMAIN);

/** Plausible script URL; only needed when self-hosting Plausible. */
export const plausibleScript = () => env(import.meta.env.VITE_PLAUSIBLE_SRC) || 'https://plausible.io/js/script.manual.js';

export const BRAND = 'Alphagrew';
export const COMPANY = 'Chromolog Technologies';
