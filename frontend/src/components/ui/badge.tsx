import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';
}

const badgeVariants: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'border-transparent bg-blue-600 text-white shadow-2xs hover:bg-blue-700',
  secondary: 'border-transparent bg-slate-100 text-slate-800 hover:bg-slate-200',
  destructive: 'border-transparent bg-red-100 text-red-800 hover:bg-red-200',
  outline: 'text-slate-800 border-slate-300',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  info: 'border-sky-200 bg-sky-50 text-sky-800',
};

export const Badge: React.FC<BadgeProps> = ({ className, variant = 'default', ...props }) => {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
        badgeVariants[variant],
        className,
      )}
      {...props}
    />
  );
};
