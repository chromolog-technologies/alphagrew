import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { BRAND } from '../config';

/**
 * Logo: the mark (cropped from public/alpha-logo.png) and the "AlphaGrew" wordmark with the
 * "SMART CAMPUS" tagline from the Figma design, set in the site's display font so it stays
 * sharp at any size. Replace the mark with a vector file when one exists.
 */
export function Logo({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  return (
    <Link to="/" className={cn('inline-flex items-center gap-2.5 rounded-lg', className)} aria-label={`${BRAND} home`}>
      <img src="/brand/alphagrew-mark.png" alt="" width={32} height={32} className="h-8 w-8" />
      <span className="flex flex-col whitespace-nowrap leading-none" aria-hidden="true">
        <span className={cn('font-display text-lg font-bold tracking-tight', onDark ? 'text-white' : 'text-ink-900')}>{BRAND}</span>
        <span className={cn('mt-0.5 text-[0.5625rem] font-semibold tracking-[0.22em]', onDark ? 'text-aqua-300' : 'text-iris-600')}>
          SMART CAMPUS
        </span>
      </span>
    </Link>
  );
}
