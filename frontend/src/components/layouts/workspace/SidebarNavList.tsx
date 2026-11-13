/**
 * The items of one sidebar group. Normally plain links; in arrange mode (admins, via the group's
 * sliders icon) each item can be dragged, moved with the arrow buttons or Alt+↑/↓, and hidden.
 */
import { useState, type DragEvent, type KeyboardEvent } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical } from 'lucide-react';
import type { LayoutDashboard } from 'lucide-react';
import { classNames } from './helpers';

export interface SidebarEntry {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  count?: number;
  locked?: boolean;
  lockedTitle?: string;
}

interface SidebarNavListProps {
  /** Group name, for screen readers. */
  label: string;
  items: SidebarEntry[];
  activeTab: string;
  arranging: boolean;
  hiddenIds: string[];
  onSelect: (id: string) => void;
  onReorder: (ids: string[]) => void;
  onToggleHidden: (id: string) => void;
}

const move = <T,>(list: T[], from: number, to: number): T[] => {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

export function SidebarNavList({ label, items, activeTab, arranging, hiddenIds, onSelect, onReorder, onToggleHidden }: SidebarNavListProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const hidden = new Set(hiddenIds);

  const moveTo = (from: number, to: number) => {
    if (from < 0 || to < 0 || from >= items.length || to >= items.length || from === to) return;
    onReorder(move(items, from, to).map((item) => item.id));
  };

  const onDrop = (event: DragEvent, targetId: string) => {
    event.preventDefault();
    const from = items.findIndex((item) => item.id === draggingId);
    const to = items.findIndex((item) => item.id === targetId);
    setDraggingId(null);
    setOverId(null);
    moveTo(from, to);
  };

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    if (!arranging || !event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
    event.preventDefault();
    moveTo(index, event.key === 'ArrowUp' ? index - 1 : index + 1);
  };

  return (
    <div className="space-y-0.5" role="list" aria-label={label}>
      {items.map((item, index) => {
        const isActive = activeTab === item.id;
        const isHidden = hidden.has(item.id);
        const count = item.count ?? 0;

        if (arranging) {
          return (
            <div
              key={item.id}
              role="listitem"
              draggable
              onDragStart={(event) => {
                setDraggingId(item.id);
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', item.id);
              }}
              onDragOver={(event) => {
                if (draggingId === null) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                setOverId(item.id);
              }}
              onDragLeave={() => setOverId((current) => (current === item.id ? null : current))}
              onDrop={(event) => onDrop(event, item.id)}
              onDragEnd={() => {
                setDraggingId(null);
                setOverId(null);
              }}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={classNames(
                'flex items-center gap-1.5 rounded-md border border-dashed border-sidebar-border bg-sidebar px-1.5 py-1 text-[13px]',
                draggingId === item.id && 'opacity-50',
                overId === item.id && draggingId !== item.id && 'border-primary bg-primary/5',
              )}
            >
              <GripVertical size={14} className="shrink-0 cursor-grab text-muted-foreground" aria-hidden="true" />
              <item.icon size={15} className={classNames('shrink-0', isHidden && 'opacity-40')} aria-hidden="true" />
              <span className={classNames('flex-1 truncate font-medium', isHidden ? 'text-muted-foreground line-through' : 'text-foreground')}>
                {item.label}
              </span>
              <button
                type="button"
                onClick={() => moveTo(index, index - 1)}
                disabled={index === 0}
                aria-label={`Move ${item.label} up`}
                className="rounded p-0.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground disabled:opacity-30"
              >
                <ArrowUp size={13} />
              </button>
              <button
                type="button"
                onClick={() => moveTo(index, index + 1)}
                disabled={index === items.length - 1}
                aria-label={`Move ${item.label} down`}
                className="rounded p-0.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground disabled:opacity-30"
              >
                <ArrowDown size={13} />
              </button>
              <button
                type="button"
                onClick={() => onToggleHidden(item.id)}
                aria-label={isHidden ? `Show ${item.label}` : `Hide ${item.label}`}
                aria-pressed={isHidden}
                title={isHidden ? 'Hidden from the sidebar — click to show' : 'Hide from the sidebar'}
                className="rounded p-0.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              >
                {isHidden ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          );
        }

        return (
          <div key={item.id} role="listitem">
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              disabled={item.locked}
              aria-current={isActive ? 'page' : undefined}
              title={item.locked ? item.lockedTitle : item.label}
              className={classNames(
                'flex w-full items-center gap-3 rounded-md px-3 py-1.75 text-left text-[13px] font-medium transition-colors duration-150',
                isActive
                  ? 'bg-primary/8 text-primary'
                  : item.locked
                    ? 'cursor-not-allowed text-muted-foreground/50'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground',
              )}
            >
              <item.icon size={16} className="shrink-0" aria-hidden="true" />
              <span className="flex-1 truncate">{item.label}</span>
              {count > 0 ? (
                <span
                  className={classNames(
                    'rounded-full px-1.5 py-0.5 text-2xs font-semibold leading-none',
                    isActive ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {count}
                </span>
              ) : null}
            </button>
          </div>
        );
      })}
    </div>
  );
}
