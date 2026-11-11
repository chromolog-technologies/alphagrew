import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { DEMO_PATH, isNavGroup, PRIMARY_NAV, SIGN_IN_PATH, type NavGroup } from '../navigation';
import { ButtonLink, buttonClass } from './Button';
import { Container } from './Layout';
import { Logo } from './Logo';

/**
 * Desktop dropdown built on the disclosure pattern (a button that shows a list of
 * links), which suits navigation better than an ARIA menu. Escape closes it and
 * returns focus to the button; clicking or tabbing away closes it too.
 */
function NavDropdown({
  group,
  open,
  onOpenChange,
}: {
  group: NavGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { pathname } = useLocation();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isCurrent = pathname === group.match || pathname.startsWith(`${group.match}/`);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onOpenChange(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, onOpenChange]);

  return (
    <div
      ref={rootRef}
      className="relative"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.stopPropagation();
          onOpenChange(false);
          buttonRef.current?.focus();
        }
      }}
      onBlur={(event) => {
        if (open && !rootRef.current?.contains(event.relatedTarget as Node | null)) onOpenChange(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        className={cn('mk-nav-link', isCurrent && 'mk-active')}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onOpenChange(!open)}
      >
        {group.label}
        <ChevronDown
          size={15}
          aria-hidden="true"
          className={cn('transition-transform duration-200', open && 'rotate-180')}
        />
      </button>
      <div id={panelId} hidden={!open} className="mk-menu-panel">
        <ul className="grid gap-1 sm:grid-cols-2">
          {group.items.map((item) => {
            const current = item.to === pathname;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="mk-menu-item"
                  aria-current={current ? 'page' : undefined}
                  onClick={() => onOpenChange(false)}
                >
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold text-ink-900">{item.label}</span>
                    {item.description && <span className="text-[0.8125rem] leading-snug text-ink-500">{item.description}</span>}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function SiteHeader({
  mobileOpen,
  onMobileOpenChange,
}: {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}) {
  const location = useLocation();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const mobileId = useId();

  // Any navigation closes every menu.
  useEffect(() => {
    setOpenGroup(null);
    onMobileOpenChange(false);
  }, [location.pathname, location.hash, onMobileOpenChange]);

  // Mobile panel: lock page scroll, move focus in, close on Escape or when the viewport widens.
  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector<HTMLElement>('a, button')?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onMobileOpenChange(false);
        toggleRef.current?.focus();
      }
    };
    const desktop = window.matchMedia?.('(min-width: 1024px)');
    const onWiden = (event: MediaQueryListEvent) => event.matches && onMobileOpenChange(false);

    document.addEventListener('keydown', onKeyDown);
    desktop?.addEventListener?.('change', onWiden);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      desktop?.removeEventListener?.('change', onWiden);
    };
  }, [mobileOpen, onMobileOpenChange]);

  return (
    <header className="mk-header">
      <Container className="flex h-16 items-center justify-between gap-4 lg:h-[4.5rem]">
        <Logo />

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {PRIMARY_NAV.map((entry) => (
              <li key={entry.label}>
                {isNavGroup(entry) ? (
                  <NavDropdown
                    group={entry}
                    open={openGroup === entry.label}
                    onOpenChange={(open) => setOpenGroup(open ? entry.label : null)}
                  />
                ) : (
                  <NavLink to={entry.to} className="mk-nav-link">
                    {entry.label}
                  </NavLink>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link to={SIGN_IN_PATH} className="mk-nav-link hidden sm:inline-flex">
            Sign in
          </Link>
          <ButtonLink to={DEMO_PATH} size="sm" className="hidden sm:inline-flex">
            Book a demo
          </ButtonLink>
          <button
            ref={toggleRef}
            type="button"
            className="mk-nav-link !p-2 lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls={mobileId}
            onClick={() => onMobileOpenChange(!mobileOpen)}
          >
            {mobileOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
            <span className="sr-only">{mobileOpen ? 'Close menu' : 'Open menu'}</span>
          </button>
        </div>
      </Container>

      <div
        id={mobileId}
        ref={panelRef}
        hidden={!mobileOpen}
        className="fixed inset-x-0 bottom-0 top-16 overflow-y-auto border-t border-line bg-white lg:hidden"
      >
        <nav aria-label="Main" className="mk-container flex flex-col gap-6 py-6">
          {PRIMARY_NAV.map((entry) =>
            isNavGroup(entry) ? (
              <div key={entry.label} className="flex flex-col gap-1">
                <p className="px-3 text-xs font-semibold uppercase tracking-[0.08em] text-iris-700">{entry.label}</p>
                <ul className="flex flex-col">
                  {entry.items.map((item) => (
                    <li key={item.to}>
                      <NavLink to={item.to} end className="mk-nav-link w-full !justify-start !py-3 text-base">
                        {item.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null,
          )}
          <ul className="flex flex-col border-t border-line pt-4">
            {PRIMARY_NAV.filter((entry) => !isNavGroup(entry)).map((entry) =>
              isNavGroup(entry) ? null : (
                <li key={entry.to}>
                  <NavLink to={entry.to} className="mk-nav-link w-full !justify-start !py-3 text-base">
                    {entry.label}
                  </NavLink>
                </li>
              ),
            )}
          </ul>
          <div className="grid gap-3 border-t border-line pt-6 sm:grid-cols-2">
            <ButtonLink to={DEMO_PATH} size="lg">
              Book a demo
            </ButtonLink>
            <Link to={SIGN_IN_PATH} className={buttonClass({ variant: 'secondary', size: 'lg' })}>
              Sign in
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
