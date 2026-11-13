import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { CustomFieldsModule } from './CustomFieldsModule';
import { useCustomFieldDefinitions } from '../../api/customFieldsApi';
import { useSaveCustomModule } from '../../api/customModulesApi';

const saveModuleMutate = vi.fn();

vi.mock('../../api/customModulesApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/customModulesApi')>();
  return {
    ...actual,
    // Implementations rather than mockReturnValue: test/setup.ts restores all mocks after each test.
    useCustomModules: vi.fn(() => ({
      data: [
        {
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
          recordsCount: 7,
          canEdit: true,
          updatedAt: '2026-11-13T10:00:00+00:00',
        },
      ],
      isLoading: false,
      error: null,
    })),
    useSaveCustomModule: vi.fn(() => ({ mutate: saveModuleMutate, reset: vi.fn(), isPending: false, error: null })),
    useDeleteCustomModule: vi.fn(() => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null })),
  };
});

vi.mock('../../api/apiClient', () => ({
  apiCall: vi.fn().mockResolvedValue([
    { id: 101, name: 'B.Tech Computer Science', code: 'CS101' },
    { id: 102, name: 'B.Tech Information Technology', code: 'IT101' },
  ]),
}));

vi.mock('../../api/customFieldsApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/customFieldsApi')>();
  return {
    ...actual,
    useCustomFieldDefinitions: vi.fn().mockReturnValue({
      data: [
        {
          id: 1,
          entity: 'course',
          key: 'nba_accredited',
          label: 'NBA Accredited',
          type: 'boolean',
          options: [],
          helpText: null,
          isRequired: false,
          isActive: true,
          sortOrder: 0,
        },
      ],
      isLoading: false,
      error: null,
    }),
    useSaveCustomField: vi.fn().mockReturnValue({
      mutate: vi.fn(),
      reset: vi.fn(),
      isPending: false,
      error: null,
    }),
    useDeleteCustomField: vi.fn().mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    }),
  };
});

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('CustomFieldsModule (Zoho CRM-Style Modules & Dynamic Tables)', () => {
  const mockDepartments = [
    { id: 1, name: 'Computer Science and Engineering', code: 'CSE' },
    { id: 2, name: 'Mechanical Engineering', code: 'MECH' },
  ];

  const mockDesignations = [
    { id: 10, name: 'Professor' },
    { id: 11, name: 'Assistant Professor' },
  ];

  const mockCourses = [
    { id: 101, name: 'B.Tech Computer Science', code: 'CS101' },
    { id: 102, name: 'B.Tech Information Technology', code: 'IT101' },
  ];

  it('renders modules table with live records counts for courses, departments, and designations', () => {
    renderWithClient(
      <CustomFieldsModule
        departments={mockDepartments}
        designations={mockDesignations}
        courses={mockCourses}
        studentsCount={450}
        staffCount={32}
        companiesCount={18}
      />
    );

    // Header & Tabs
    expect(screen.getByText('Modules and Fields')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^modules$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Web Tabs/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Global Sets/i })).toBeInTheDocument();

    // Table Headers
    expect(screen.getByText('Displayed In Tabs As')).toBeInTheDocument();
    expect(screen.getByText('Module Name')).toBeInTheDocument();

    // Core dynamic modules exist
    expect(screen.getByText('Courses & Programs')).toBeInTheDocument();
    expect(screen.getByText('Departments')).toBeInTheDocument();
    expect(screen.getByText('Designations & Roles')).toBeInTheDocument();

    // Live DB table record counts
    expect(screen.getAllByText(/2 records/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/450 records/i)).toBeInTheDocument();
    // Server-backed modules take custom fields; Attendance, Fees and Announcements are fixed
    expect(screen.getAllByText('Custom fields').length).toBeGreaterThanOrEqual(8);
    expect(screen.getAllByText('Fixed schema')).toHaveLength(3);
  });

  it('navigates to Layout Studio and supports dynamic 1-click option populating from tables', async () => {
    const user = userEvent.setup();

    renderWithClient(
      <CustomFieldsModule
        departments={mockDepartments}
        designations={mockDesignations}
        courses={mockCourses}
      />
    );

    // Click customize on Courses & Programs
    const customizeButtons = screen.getAllByRole('button', { name: /Customize Fields/i });
    await user.click(customizeButtons[1]); // Course or Department

    // Layout Studio header
    expect(screen.getByText(/Standard Layout/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quick Create' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Detail View' })).toBeInTheDocument();

    // Left Palette
    expect(screen.getByText('New Fields')).toBeInTheDocument();
    expect(screen.getByText('Dropdown (Pick List)')).toBeInTheDocument();

    // Click "Add Custom Field"
    const addFieldBtn = screen.getByRole('button', { name: /Add Custom Field/i });
    await user.click(addFieldBtn);

    // Dialog opens
    expect(screen.getByText(/Field Label/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Field Type/i)).toBeInTheDocument();

    // Switch to Dropdown type to reveal dynamic populator
    const typeSelect = screen.getByLabelText(/Field Type/i);
    await user.selectOptions(typeSelect, 'select');

    // Dynamic Data Source buttons
    expect(screen.getByText(/Dynamic Data Sources/i)).toBeInTheDocument();
    const deptSourceBtn = screen.getByRole('button', { name: /From Departments \(2\)/i });
    expect(deptSourceBtn).toBeInTheDocument();

    // Click From Departments button -> fills options textarea
    await user.click(deptSourceBtn);
    const optionsTextarea = screen.getByPlaceholderText(/Option 1/i) as HTMLTextAreaElement;
    expect(optionsTextarea.value).toContain('Computer Science and Engineering');
    expect(optionsTextarea.value).toContain('Mechanical Engineering');
  });

  it('keeps fixed-schema modules read-only instead of falling back to student fields', async () => {
    const user = userEvent.setup();
    vi.mocked(useCustomFieldDefinitions).mockClear();

    renderWithClient(
      <CustomFieldsModule departments={mockDepartments} designations={mockDesignations} courses={mockCourses} />
    );

    const attendanceRow = screen.getByText('Attendance').closest('tr') as HTMLElement;
    await user.click(within(attendanceRow).getByRole('button', { name: /Customize Fields/i }));

    expect(screen.getByText(/Custom fields are not available for Attendance/i)).toBeInTheDocument();
    expect(screen.queryByText('New Fields')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add Custom Field/i })).not.toBeInTheDocument();
    expect(screen.queryByText('NBA Accredited')).not.toBeInTheDocument();

    // No definitions are fetched for the module, and never for 'student' as a fallback
    const calls = vi.mocked(useCustomFieldDefinitions).mock.calls;
    expect(calls.at(-1)).toEqual([undefined, { includeInactive: true, enabled: false }]);
    expect(calls.some(([entity]) => entity === 'student')).toBe(false);
  });

  it('lists server modules with their record count and opens their field builder', async () => {
    const user = userEvent.setup();
    vi.mocked(useCustomFieldDefinitions).mockClear();

    renderWithClient(<CustomFieldsModule courses={mockCourses} />);

    const row = screen.getByText('Hostel Rooms').closest('tr') as HTMLElement;
    expect(within(row).getByText('7 records')).toBeInTheDocument();
    expect(within(row).getByText('Custom fields')).toBeInTheDocument();
    expect(within(row).getByText('Admins, Staff, Students')).toBeInTheDocument();

    await user.click(within(row).getByRole('button', { name: /Customize Fields/i }));

    expect(screen.getByText('New Fields')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete Module/i })).toBeInTheDocument();
    expect(vi.mocked(useCustomFieldDefinitions).mock.calls.at(-1)).toEqual(['module_5', { includeInactive: true, enabled: true }]);
  });

  it('creates modules on the server with the chosen access', async () => {
    const user = userEvent.setup();
    saveModuleMutate.mockClear();

    renderWithClient(<CustomFieldsModule courses={mockCourses} />);

    await user.click(screen.getByRole('button', { name: /Create New Module/i }));
    await user.type(screen.getByLabelText(/Module Name \(Plural\)/i), 'Alumni Events');
    await user.selectOptions(screen.getByLabelText(/Teamspace \/ Category/i), 'Operations');
    await user.selectOptions(screen.getByLabelText(/Who can use its records/i), 'staff_students');
    await user.click(screen.getByRole('button', { name: /^Create Module$/i }));

    expect(vi.mocked(useSaveCustomModule)).toHaveBeenCalled();
    expect(saveModuleMutate).toHaveBeenCalledWith(
      {
        id: null,
        input: {
          pluralLabel: 'Alumni Events',
          singularLabel: null,
          category: 'Operations',
          viewRoles: ['student'],
          editRoles: ['staff', 'placement_officer'],
        },
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
