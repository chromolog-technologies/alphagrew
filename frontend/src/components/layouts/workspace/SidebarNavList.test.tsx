import { fireEvent, render, screen } from '@testing-library/react';
import { Building2, Users } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { arrangeItems } from '../../../api/sidebarLayoutApi';
import { SidebarNavList, type SidebarEntry } from './SidebarNavList';

const items: SidebarEntry[] = [
  { id: 'departments', label: 'Departments', icon: Building2 },
  { id: 'courses', label: 'Courses', icon: Building2, count: 3 },
  { id: 'batches', label: 'Batches', icon: Users, locked: true, lockedTitle: 'Locked' },
];

const renderList = (props: Partial<Parameters<typeof SidebarNavList>[0]> = {}) => {
  const handlers = { onSelect: vi.fn(), onReorder: vi.fn(), onToggleHidden: vi.fn() };
  render(<SidebarNavList label="Master Data" items={items} activeTab="courses" arranging={false} hiddenIds={[]} {...handlers} {...props} />);
  return handlers;
};

describe('SidebarNavList', () => {
  it('renders plain links outside arrange mode', () => {
    const { onSelect } = renderList();

    expect(screen.getByRole('button', { name: /Courses/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: /Batches/ })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Move .* up/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Departments/ }));
    expect(onSelect).toHaveBeenCalledWith('departments');
  });

  it('reorders by drag, arrow buttons and Alt+arrow keys in arrange mode', () => {
    const { onReorder, onSelect } = renderList({ arranging: true });
    const [departments, , batches] = screen.getAllByRole('listitem');

    const dataTransfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
    fireEvent.dragStart(batches, { dataTransfer });
    fireEvent.dragOver(departments, { dataTransfer });
    fireEvent.drop(departments, { dataTransfer });
    expect(onReorder).toHaveBeenLastCalledWith(['batches', 'departments', 'courses']);

    fireEvent.click(screen.getByRole('button', { name: 'Move Departments down' }));
    expect(onReorder).toHaveBeenLastCalledWith(['courses', 'departments', 'batches']);
    expect(screen.getByRole('button', { name: 'Move Departments up' })).toBeDisabled();

    fireEvent.keyDown(screen.getAllByRole('listitem')[2], { key: 'ArrowUp', altKey: true });
    expect(onReorder).toHaveBeenLastCalledWith(['departments', 'batches', 'courses']);

    // Items are not links while arranging.
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('hides and shows items in arrange mode', () => {
    const { onToggleHidden } = renderList({ arranging: true, hiddenIds: ['courses'] });

    fireEvent.click(screen.getByRole('button', { name: 'Show Courses' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hide Departments' }));
    expect(onToggleHidden.mock.calls).toEqual([['courses'], ['departments']]);
  });
});

describe('arrangeItems', () => {
  const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];

  it('puts saved ids first and keeps the rest in their default order', () => {
    expect(arrangeItems(list, { order: ['c', 'a', 'gone'], hidden: [] }).map((i) => i.id)).toEqual(['c', 'a', 'b', 'd']);
  });

  it('drops hidden items unless asked to include them', () => {
    const layout = { order: [], hidden: ['b'] };
    expect(arrangeItems(list, layout).map((i) => i.id)).toEqual(['a', 'c', 'd']);
    expect(arrangeItems(list, layout, { includeHidden: true }).map((i) => i.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('can keep the incoming order (modules use their own saved order)', () => {
    expect(arrangeItems(list, { order: ['d'], hidden: ['a'] }, { keepOrder: true }).map((i) => i.id)).toEqual(['b', 'c', 'd']);
  });
});
