// Settings for the public site. VITE_CONTACT_EMAIL and VITE_SITE_URL are optional overrides.
// Read on each call (not at import) so tests can stub them.

/** Chromolog Technologies' public contact details, shown on the Contact page and in the footer. */
export const CONTACT = {
  email: 'info@chromologtechnologies.com',
  phone: '+91 94002 30723',
  /** The phone number for tel: links (digits only, with country code). */
  phoneHref: 'tel:+919400230723',
  addressLines: ['SPATIUM, Ground Floor, Island Castle', 'Opposite YMCA, Chittoor Road', 'Ernakulam, Kerala 682035'],
  mapsUrl:
    'https://www.google.com/maps/search/?api=1&query=' +
    encodeURIComponent('SPATIUM, Ground Floor Island Castle, Opposite YMCA, Chittoor Road, Ernakulam, Kerala 682035'),
} as const;

/** Inbox shown for demo requests; VITE_CONTACT_EMAIL overrides the company address. */
export const contactEmail = () => (import.meta.env.VITE_CONTACT_EMAIL ?? '').trim() || CONTACT.email;

/** The public website's address; VITE_SITE_URL overrides it (no trailing slash). */
export const SITE_URL_DEFAULT = 'https://alphagrew.com';
export const siteUrl = () => ((import.meta.env?.VITE_SITE_URL ?? '').trim() || SITE_URL_DEFAULT).replace(/\/+$/, '');

/** Image shown when a page is shared (LinkedIn, WhatsApp, X), 1200 × 630. */
export const SHARE_IMAGE = { path: '/brand/og-image.png', width: 1200, height: 630, alt: 'AlphaGrew: from campus learning to career readiness' } as const;

export const BRAND = 'AlphaGrew';
export const COMPANY = 'Chromolog Technologies';
