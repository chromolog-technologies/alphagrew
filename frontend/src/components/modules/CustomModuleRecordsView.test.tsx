import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { CustomModule } from '../../api/customModulesApi';
import { CustomModuleRecordsView } from './CustomModuleRecordsView';

const saveMutate = vi.fn();

// Implementations, not mockReturnValue: test/setup.ts restores all mocks after each test.
vi.mock('../../api/customFieldsApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/customFieldsApi')>();
  return {
    ...actual,
    useCustomFieldDefinitions: vi.fn(() => ({
      data: [
        { id: 1, entity: 'module_5', key: 'capacity', label: 'Capacity', type: 'number', options: [], helpText: null, isRequired: true, isActive: true, sortOrder: 0 },
        { id: 2, entity: 'module_5', key: 'ac', label: 'Air conditioned', type: 'boolean', options: [], helpText: null, isRequired: false, isActive: true, sortOrder: 1 },
      ],
      isLoading: false,
    })),
  };
});

vi.mock('../../api/customModulesApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/customModulesApi')>();
  return {
    ...actual,
    useCustomModuleRecords: vi.fn(() => ({
      data: {
        data: [
          {
            id: 9, moduleId: 5, title: 'Room 101', status: 'active', customFields: { capacity: 3, ac: true },
            createdBy: 1, createdAt: null, updatedAt: '2026-11-13T10:00:00+00:00',
          },
        ],
        meta: { currentPage: 1, lastPage: 1, perPage: 25, total: 1 },
      },
      isLoading: false,
      error: null,
    })),
    useSaveCustomModuleRecord: vi.fn(() => ({ mutate: saveMutate, reset: vi.fn(), isPending: false, error: null })),
    useDeleteCustomModuleRecord: vi.fn(() => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null })),
  };
});

const hostelRooms = (canEdit: boolean): CustomModule => ({
  id: 5,
  key: 'hostel_rooms',
  entity: 'module_5',
  pluralLabel: 'Hostel Rooms',
  singularLabel: 'Hostel Room',
  category: 'Operations',
  description: null,
  viewRoles: ['student'],
  editRoles: ['staff'],
  isActive: true,
  sortOrder: 0,
  recordsCount: 1,
  canEdit,
  updatedAt: null,
});

describe('CustomModuleRecordsView', () => {
  it('lists records with their custom field values', () => {
    render(<CustomModuleRecordsView module={hostelRooms(true)} />);

    expect(screen.getByRole('heading', { name: 'Hostel Rooms' })).toBeInTheDocument();
    const row = screen.getByText('Room 101').closest('tr') as HTMLElement;
    expect(within(row).getByText('3')).toBeInTheDocument();
    expect(within(row).getByText('Yes')).toBeInTheDocument();
    expect(within(row).getByText('Active')).toBeInTheDocument();
  });

  it('creates a record with its custom fields', async () => {
    const user = userEvent.setup();
    saveMutate.mockClear();
    render(<CustomModuleRecordsView module={hostelRooms(true)} />);

    await user.click(screen.getByRole('button', { name: /New Hostel Room/i }));
    await user.type(screen.getByLabelText(/Hostel Room name \/ title/i), 'Room 202');
    await user.type(screen.getByLabelText(/Capacity/), '4');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(saveMutate).toHaveBeenCalledWith(
      { id: null, input: { title: 'Room 202', status: 'active', customFields: { capacity: 4, ac: false } } },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('is read-only for users who cannot edit the module', () => {
    render(<CustomModuleRecordsView module={hostelRooms(false)} />);

    expect(screen.getByText('Room 101')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /New Hostel Room/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Edit Room 101/i })).not.toBeInTheDocument();
  });
});
