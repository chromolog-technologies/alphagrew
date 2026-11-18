/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONTACT_EMAIL?: string;
  readonly VITE_SITE_URL?: string;
  /** "off" leaves out Vercel Web Analytics (for hosts other than Vercel). */
  readonly VITE_ANALYTICS?: string;
}
