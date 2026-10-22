import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'success';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
}

const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
  default: 'bg-blue-600 text-white shadow-xs hover:bg-blue-700 focus-visible:ring-blue-500',
  destructive: 'bg-red-600 text-white shadow-xs hover:bg-red-700 focus-visible:ring-red-500',
  outline: 'border border-slate-200 bg-white shadow-2xs hover:bg-slate-50 hover:text-slate-900 focus-visible:ring-slate-400',
  secondary: 'bg-slate-100 text-slate-900 shadow-2xs hover:bg-slate-200 focus-visible:ring-slate-400',
  ghost: 'hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-400',
  link: 'text-blue-600 underline-offset-4 hover:underline focus-visible:ring-blue-500',
  success: 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 focus-visible:ring-emerald-500',
};

const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
  default: 'h-9 px-4 py-2 text-sm',
  sm: 'h-8 rounded-lg px-3 text-xs',
  lg: 'h-11 rounded-xl px-8 text-base',
  icon: 'h-9 w-9 p-0',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';
