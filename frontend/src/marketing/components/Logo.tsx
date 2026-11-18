import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { BRAND } from '../config';

/**
 * Logo mark plus the Figma-style wordmark ("ALPHAGREW" over "SMART CAMPUS"), linking home.
 * The wordmark is live text so it stays sharp at any size; the mark is still cropped from
 * public/alpha-logo.png until a vector logo is available.
 */
export function Logo({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  return (
    <Link to="/" className={cn('inline-flex items-center gap-2.5 rounded-lg', className)} aria-label={`${BRAND} home`}>
      <img src="/brand/alphagrew-mark.png" alt="" width={36} height={36} className="h-9 w-9" />
      <span className="flex flex-col leading-none" aria-hidden="true">
        <span className={cn('font-display text-[1.0625rem] font-extrabold tracking-[0.06em]', onDark ? 'text-white' : 'text-ink-900')}>
          {BRAND.toUpperCase()}
        </span>
        <span className={cn('mt-1 text-[0.5625rem] font-semibold tracking-[0.3em]', onDark ? 'text-aqua-300' : 'text-iris-700')}>
          SMART CAMPUS
        </span>
      </span>
    </Link>
  );
}
