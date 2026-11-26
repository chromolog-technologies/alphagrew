import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DepartmentOverview } from './DepartmentOverview';
import { HODReportsAnalytics } from './HODReportsAnalytics';
import { HODStaffManagement } from './HODStaffManagement';

// Stable objects and implementations: test/setup.ts restores mocks after each test.
const mocks = vi.hoisted(() => ({
  summary: {
    data: {
      department: { id: 1, name: 'Data Science', code: 'DSC', hodName: 'Dr. Rao', intakeCapacity: 60 },
      counts: { students: 120, staff: 9, courses: 2, subjects: 14, upcomingExams: 3 },
      averages: { cgpa: 7.82, attendance: 86.5, placementRate: 41.7 },
      placedStudents: 50,
      studentsByYear: [{ year: 'year_1', students: 60, averageCgpa: 7.5 }],
      courses: [{ id: 1, name: 'B.Tech DS', code: 'BTDS', semesters: 8, subjects: 14 }],
    },
    isLoading: false,
    error: null,
  },
  reports: {
    data: {
      academic: [{ subjectId: 1, code: 'DS101', name: 'Statistics', students: 60, averageMarks: 71.2, passPercentage: 93.3 }],
      attendance: [{ subjectId: 1, code: 'DS101', name: 'Statistics', records: 900, presentPercentage: 88 }],
      placement: { students: 120, placed: 50, placementRate: 41.7, offers: 61, averageOfferLpa: 6.2, highestOfferLpa: 18, topCompanies: [{ company: 'Acme', students: 12 }] },
    },
    isLoading: false,
    error: null,
  },
  staff: {
    data: {
      data: [
        { id: 4, name: 'Meera Nair', email: 'meera@x', role: 'staff', phone: null, designationId: 2, designationName: 'Lecturer', subjects: [{ code: 'DS101', name: 'Statistics', semester: 'Sem 1' }] },
      ],
      meta: { department: { code: 'DSC', name: 'Data Science' }, canCreate: false, canEdit: false, canDelete: false, designations: [] },
    },
    isLoading: false,
    error: null,
  },
}));

vi.mock('../../api/departmentPortalApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/departmentPortalApi')>()),
  useDepartmentSummary: vi.fn(() => mocks.summary),
  useDepartmentReports: vi.fn(() => mocks.reports),
  useDepartmentStaff: vi.fn(() => mocks.staff),
  useSaveDepartmentStaff: vi.fn(() => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null })),
  useRemoveDepartmentStaff: vi.fn(() => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null })),
}));

describe('department staff portal', () => {
  it('shows the user’s own department figures', () => {
    render(<DepartmentOverview />);

    expect(screen.getByRole('heading', { name: 'Data Science' })).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('41.7% (50)')).toBeInTheDocument();
    expect(screen.getByText('BTDS · B.Tech DS')).toBeInTheDocument();
  });

  it('shows reports by tab', async () => {
    const user = userEvent.setup();
    render(<HODReportsAnalytics />);

    expect(screen.getByText('93.3%')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Placement' }));
    expect(screen.getByText('Acme')).toBeInTheDocument();
  });

  it('lists department staff read-only without staff permissions', () => {
    render(<HODStaffManagement />);

    expect(screen.getByText('Meera Nair')).toBeInTheDocument();
    expect(screen.getByText('DS101 (Sem 1)')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add staff/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Edit Meera Nair/ })).not.toBeInTheDocument();
  });

  it('offers add, edit and remove to HODs with staff permissions', () => {
    const meta = mocks.staff.data.meta;
    Object.assign(meta, { canCreate: true, canEdit: true, canDelete: true });
    render(<HODStaffManagement />);

    expect(screen.getByRole('button', { name: /Add staff/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Meera Nair' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Meera Nair' })).toBeInTheDocument();
    Object.assign(meta, { canCreate: false, canEdit: false, canDelete: false });
  });
});
