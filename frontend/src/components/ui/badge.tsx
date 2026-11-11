import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';
}

const badgeVariants: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'border-transparent bg-primary/10 text-primary',
  secondary: 'border-transparent bg-muted text-muted-foreground',
  destructive: 'border-transparent bg-destructive/10 text-destructive',
  outline: 'border-border text-foreground',
  success: 'border-transparent bg-success/10 text-success',
  warning: 'border-transparent bg-warning/10 text-warning',
  info: 'border-transparent bg-info/10 text-info',
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
