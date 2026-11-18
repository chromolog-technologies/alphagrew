import { plausibleDomain, plausibleScript } from './config';

// Cookie-free page and goal counts with Plausible (no cookie banner needed; the Privacy
// Policy describes it). The "manual" script records only what we send it, so pageviews are
// sent from marketing pages alone and paths inside the signed-in app are never reported.

type Plausible = ((event: string, options?: { props?: Record<string, string>; u?: string }) => void) & { q?: unknown[] };

declare global {
  interface Window {
    plausible?: Plausible;
  }
}

let loaded = false;

function ensureLoaded(): boolean {
  const domain = plausibleDomain();
  if (!domain || typeof document === 'undefined') return false;
  if (!loaded) {
    loaded = true;
    // Queue calls made before the script arrives (Plausible's documented snippet).
    window.plausible =
      window.plausible ??
      Object.assign((...args: unknown[]) => (window.plausible!.q = window.plausible!.q ?? []).push(args), {});
    const script = document.createElement('script');
    script.defer = true;
    script.src = plausibleScript();
    script.dataset.domain = domain;
    document.head.appendChild(script);
  }
  return true;
}

export function trackPageview() {
  if (ensureLoaded()) window.plausible?.('pageview');
}

/** Goal names are set up once in Plausible, e.g. "Demo request". */
export function trackGoal(name: string, props?: Record<string, string>) {
  if (ensureLoaded()) window.plausible?.(name, props ? { props } : undefined);
}
