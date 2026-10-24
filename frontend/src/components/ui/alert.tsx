import * as React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info';
}

const alertVariants = {
  default: 'bg-white text-slate-900 border-slate-200',
  destructive: 'border-red-200 bg-red-50/80 text-red-900 [&>svg]:text-red-600',
  success: 'border-emerald-200 bg-emerald-50/80 text-emerald-900 [&>svg]:text-emerald-600',
  warning: 'border-amber-200 bg-amber-50/80 text-amber-900 [&>svg]:text-amber-600',
  info: 'border-blue-200 bg-blue-50/80 text-blue-900 [&>svg]:text-blue-600',
};

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'relative w-full rounded-2xl border p-4 text-xs shadow-2xs flex items-start gap-3',
          alertVariants[variant],
          className,
        )}
        {...props}
      >
        {variant === 'destructive' && <AlertCircle className="shrink-0 mt-0.5" size={18} />}
        {variant === 'success' && <CheckCircle2 className="shrink-0 mt-0.5" size={18} />}
        {variant === 'warning' && <AlertTriangle className="shrink-0 mt-0.5" size={18} />}
        {variant === 'info' && <Info className="shrink-0 mt-0.5" size={18} />}
        <div className="flex-1 space-y-1">{children}</div>
      </div>
    );
  },
);
Alert.displayName = 'Alert';

export const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn('font-bold leading-none tracking-tight text-sm', className)} {...props} />
  ),
);
AlertTitle.displayName = 'AlertTitle';

export const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-xs opacity-90 leading-relaxed', className)} {...props} />
  ),
);
AlertDescription.displayName = 'AlertDescription';
