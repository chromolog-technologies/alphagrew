import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { StudentFeesView } from '../students/StudentFeesView';
import { FeesModule } from './FeesModule';

const recordMutate = vi.fn();

// Stable objects and implementations: test/setup.ts restores mocks after each test.
const mocks = vi.hoisted(() => {
  const fee = {
    id: 4, studentId: 1, feeStructureId: 2, amountDue: 50000, amountPaid: 20000, balance: 30000, status: 'partial', dueDate: '2026-12-01', paidDate: null,
    student: { id: 1, name: 'Rahul Sharma', registrationNumber: 'BIT1', departmentCode: 'CSE' },
    feeStructure: { id: 2, semester: 1, course: { code: 'BTDS', name: 'B.Tech DS' } },
    payments: [{ id: 9, receiptNumber: 'RCPT-2026-000009', amount: 20000, method: 'upi', reference: 'UPI-1', paidOn: '2026-11-10', remarks: null, voided: false, voidReason: null }],
  };
  return {
    fee,
    structures: { data: [], isLoading: false, error: null },
    dues: { data: { data: [fee], meta: { total: 1 } }, isLoading: false, error: null },
    one: { data: fee, isLoading: false },
    mine: { data: { data: [fee], meta: { totalDue: 30000 } }, isLoading: false, error: null },
    empty: { data: [], isLoading: false },
  };
});

vi.mock('../../api/feesApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/feesApi')>()),
  useFeeStructures: vi.fn(() => mocks.structures),
  useStudentFees: vi.fn(() => mocks.dues),
  useStudentFee: vi.fn((id: number | null) => (id ? mocks.one : { data: undefined, isLoading: false })),
  useMyFees: vi.fn(() => mocks.mine),
  useSaveFeeStructure: vi.fn(() => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null })),
  useDeleteFeeStructure: vi.fn(() => ({ mutate: vi.fn(), isPending: false, error: null })),
  useAssignFeeStructure: vi.fn(() => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null, data: undefined })),
  useRecordPayment: vi.fn(() => ({ mutate: recordMutate, isPending: false, error: null })),
  useVoidPayment: vi.fn(() => ({ mutate: vi.fn(), isPending: false, error: null })),
}));

vi.mock('../../api/academicsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/academicsApi')>()),
  useAcademicYears: vi.fn(() => mocks.empty),
  useClasses: vi.fn(() => mocks.empty),
}));

vi.mock('../../api/apiClient', () => ({ apiCall: vi.fn(() => Promise.resolve([])) }));

function withClient(ui: React.ReactElement) {
  return render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);
}

describe('fees', () => {
  it('records a payment against a student due', async () => {
    const user = userEvent.setup();
    recordMutate.mockClear();
    withClient(<FeesModule />);

    await user.click(screen.getByRole('tab', { name: 'Student dues' }));
    await user.click(screen.getByRole('button', { name: 'Payments of Rahul Sharma' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/RCPT-2026-000009/)).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText(/^Amount/), '30000');
    await user.selectOptions(within(dialog).getByLabelText('Method'), 'cash');
    await user.click(within(dialog).getByRole('button', { name: 'Record payment' }));

    expect(recordMutate).toHaveBeenCalledWith({ feeId: 4, input: { amount: 30000, method: 'cash', reference: null } }, expect.anything());
  });

  it('shows students their dues and receipts', () => {
    withClient(<StudentFeesView />);

    expect(screen.getByText(/Total outstanding: ₹30,000/)).toBeInTheDocument();
    expect(screen.getByText(/RCPT-2026-000009/)).toBeInTheDocument();
  });
});
