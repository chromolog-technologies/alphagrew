import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

/**
 * Accessible tabs (WAI-ARIA tabs pattern): arrow keys, Home and End move between
 * tabs and select them; only the selected tab is in the tab order.
 */
export function Tabs({ label, items, className }: { label: string; items: TabItem[]; className?: string }) {
  const [selected, setSelected] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();

  function select(index: number) {
    setSelected(index);
    tabRefs.current[index]?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const last = items.length - 1;
    const next = { ArrowRight: selected === last ? 0 : selected + 1, ArrowLeft: selected === 0 ? last : selected - 1, Home: 0, End: last }[
      event.key
    ];
    if (next === undefined) return;
    event.preventDefault();
    select(next);
  }

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      <div role="tablist" aria-label={label} className="mk-tablist">
        {items.map((item, index) => (
          <button
            key={item.id}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${item.id}`}
            aria-selected={index === selected}
            aria-controls={`${baseId}-panel-${item.id}`}
            tabIndex={index === selected ? 0 : -1}
            className="mk-tab"
            onClick={() => setSelected(index)}
            onKeyDown={onKeyDown}
          >
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item, index) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`${baseId}-panel-${item.id}`}
          aria-labelledby={`${baseId}-tab-${item.id}`}
          hidden={index !== selected}
          tabIndex={0}
          className="rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-iris-500"
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
