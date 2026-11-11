import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { BRAND } from '../config';

/** Logo mark plus wordmark, linking home. The mark is cropped from public/alpha-logo.png. */
export function Logo({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  return (
    <Link to="/" className={cn('inline-flex items-center gap-2.5 rounded-lg', className)} aria-label={`${BRAND} home`}>
      <img src="/brand/alphagrew-mark.png" alt="" width={32} height={32} className="h-8 w-8" />
      <span className={cn('font-display text-lg font-bold tracking-tight', onDark ? 'text-white' : 'text-ink-900')}>
        {BRAND}
      </span>
    </Link>
  );
}
