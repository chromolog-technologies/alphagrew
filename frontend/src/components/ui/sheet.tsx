import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface SheetContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SheetContext = React.createContext<SheetContextValue | undefined>(undefined);

export interface SheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export const Sheet: React.FC<SheetProps> = ({ open, onOpenChange, children }) => {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = open !== undefined;
  const currentOpen = isControlled ? open : internalOpen;
  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  return (
    <SheetContext.Provider value={{ open: Boolean(currentOpen), onOpenChange: handleOpenChange }}>
      {children}
    </SheetContext.Provider>
  );
};

export const SheetTrigger: React.FC<{ children: React.ReactElement<{ onClick?: React.MouseEventHandler }> }> = ({ children }) => {
  const context = React.useContext(SheetContext);
  if (!context) throw new Error('SheetTrigger must be used within Sheet');

  return React.cloneElement(children, {
    onClick: (e: React.MouseEvent) => {
      children.props.onClick?.(e);
      context.onOpenChange(true);
    },
  });
};

export interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: 'top' | 'bottom' | 'left' | 'right';
  onClose?: () => void;
}

const sheetSideVariants = {
  top: 'inset-x-0 top-0 border-b animate-in slide-in-from-top duration-300',
  bottom: 'inset-x-0 bottom-0 border-t animate-in slide-in-from-bottom duration-300',
  left: 'inset-y-0 left-0 h-full w-3/4 sm:max-w-md border-r animate-in slide-in-from-left duration-300',
  right: 'inset-y-0 right-0 h-full w-3/4 sm:max-w-md border-l animate-in slide-in-from-right duration-300',
};

export const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({ side = 'right', className, children, onClose, ...props }, ref) => {
    const context = React.useContext(SheetContext);
    if (!context) throw new Error('SheetContent must be used within Sheet');

    React.useEffect(() => {
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && context.open) {
          context.onOpenChange(false);
          onClose?.();
        }
      };
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }, [context, onClose]);

    if (!context.open) return null;

    return (
      <div className="fixed inset-0 z-50 flex">
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200"
          onClick={() => {
            context.onOpenChange(false);
            onClose?.();
          }}
        />
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          className={cn(
            'fixed z-50 gap-4 bg-white p-6 shadow-2xl transition ease-in-out border-slate-200 overflow-y-auto',
            sheetSideVariants[side],
            className,
          )}
          {...props}
        >
          {children}
          <button
            type="button"
            onClick={() => {
              context.onOpenChange(false);
              onClose?.();
            }}
            className="absolute right-4 top-4 rounded-xl p-1 text-slate-400 opacity-70 transition-opacity hover:opacity-100 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <X size={18} />
            <span className="sr-only">Close</span>
          </button>
        </div>
      </div>
    );
  },
);
SheetContent.displayName = 'SheetContent';

export const SheetHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('flex flex-col space-y-2 text-left pb-4 border-b border-slate-100', className)} {...props} />
);

export const SheetFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4 border-t border-slate-100', className)} {...props} />
);

export const SheetTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, ...props }) => (
  <h2 className={cn('text-lg font-bold text-slate-900', className)} {...props} />
);

export const SheetDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ className, ...props }) => (
  <p className={cn('text-xs text-slate-500 leading-relaxed', className)} {...props} />
);
