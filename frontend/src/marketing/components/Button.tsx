import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link, type LinkProps } from 'react-router-dom';
import { cn } from '../../lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface StyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Adds a trailing arrow that nudges on hover; use for forward navigation. */
  arrow?: boolean;
}

export function buttonClass({ variant = 'primary', size = 'md' }: StyleProps, extra?: string) {
  return cn('mk-btn', `mk-btn-${variant}`, size !== 'md' && `mk-btn-${size}`, extra);
}

function Content({ children, arrow }: { children: ReactNode; arrow?: boolean }) {
  return (
    <>
      {children}
      {arrow && <ArrowRight size={16} className="mk-btn-arrow" aria-hidden="true" />}
    </>
  );
}

/** A button-styled link to a page on this site. Navigation always uses a link, never a button. */
export function ButtonLink({ variant, size, arrow, className, children, ...props }: StyleProps & LinkProps) {
  return (
    <Link className={buttonClass({ variant, size }, className)} {...props}>
      <Content arrow={arrow}>{children}</Content>
    </Link>
  );
}

/** A button-styled link to another site or a mailto: address. */
export function ButtonAnchor({
  variant,
  size,
  arrow,
  className,
  children,
  ...props
}: StyleProps & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className={buttonClass({ variant, size }, className)} {...props}>
      <Content arrow={arrow}>{children}</Content>
    </a>
  );
}

/** An action button (forms, toggles). Shows a spinner and stays disabled while busy. */
export function Button({
  variant,
  size,
  arrow,
  busy = false,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: StyleProps & ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size }, className)}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...props}
    >
      {busy && <span className="mk-spinner" aria-hidden="true" />}
      <Content arrow={arrow && !busy}>{children}</Content>
    </button>
  );
}
