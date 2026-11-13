import { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { SITE_PAGES, SOLUTION_ROLES, solutionPath } from '../siteMap';

/**
 * Audience switcher shown on the Solutions hub and every role page. Plain links with
 * aria-current, so each audience stays a real, indexable page rather than a hidden tab.
 */
export function SolutionNav({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  const listRef = useRef<HTMLUListElement>(null);
  const { pathname } = useLocation();

  // On phones the list scrolls sideways; bring the current audience into view without moving the page.
  useEffect(() => {
    const list = listRef.current;
    const current = list?.querySelector<HTMLElement>('[aria-current="page"]');
    if (list && current && list.scrollWidth > list.clientWidth) {
      list.scrollLeft = current.offsetLeft - list.offsetLeft - 16;
    }
  }, [pathname]);

  const items = [{ label: 'All solutions', to: SITE_PAGES.solutions.path }, ...SOLUTION_ROLES.map((role) => ({ label: role.label, to: solutionPath(role.id) }))];
  return (
    <nav aria-label="Solutions by audience" className={className}>
      <ul ref={listRef} className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
        {items.map((item) => (
          <li key={item.to} className="shrink-0 snap-start">
            <NavLink
              to={item.to}
              end
              className={({ isActive }) =>
                cn(
                  'inline-flex min-h-10 items-center rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                  onDark
                    ? isActive
                      ? 'border-white bg-white text-navy-900'
                      : 'border-white/20 bg-white/5 text-white hover:border-white/40 hover:bg-white/10'
                    : isActive
                      ? 'border-iris-600 bg-iris-600 text-white'
                      : 'border-line bg-white text-ink-700 hover:border-iris-300 hover:text-iris-800',
                )
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
