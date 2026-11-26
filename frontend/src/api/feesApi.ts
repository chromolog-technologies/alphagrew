/**
 * Campus fees (record-keeping): fee structures per course semester, dues per student, and
 * payments recorded by staff with a receipt each. Students read their own fees.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from './http';

export interface FeeStructure {
  id: number;
  academicYearId: number;
  courseId: number;
  semester: number;
  tuitionFee: number;
  labFee: number;
  libraryFee: number;
  examFee: number;
  otherFee: number;
  totalFee: number;
  dueDate: string;
  remarks: string | null;
  course: { id: number; name: string; code: string } | null;
  academicYear: { id: number; year: string } | null;
  studentsBilled: number;
  collected: number;
}

export interface FeeStructureInput {
  academicYearId: number;
  courseId: number;
  semester: number;
  tuitionFee: number;
  labFee?: number;
  libraryFee?: number;
  examFee?: number;
  otherFee?: number;
  dueDate: string;
  remarks?: string | null;
}

export type FeeStatus = 'pending' | 'partial' | 'paid' | 'overdue';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'upi' | 'card' | 'cheque' | 'other';
export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'card', label: 'Card' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

export interface FeePayment {
  id: number;
  receiptNumber: string | null;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  paidOn: string | null;
  remarks: string | null;
  voided: boolean;
  voidReason: string | null;
}

export interface StudentFee {
  id: number;
  studentId: number;
  feeStructureId: number;
  amountDue: number;
  amountPaid: number;
  balance: number;
  status: FeeStatus;
  dueDate: string | null;
  paidDate: string | null;
  student: { id: number; name: string; registrationNumber: string; departmentCode: string } | null;
  feeStructure: { id: number; semester: number; course: { code: string; name: string } | null } | null;
  payments?: FeePayment[];
}

export interface PaymentInput {
  amount: number;
  method: PaymentMethod;
  reference?: string | null;
  paidOn?: string;
  remarks?: string | null;
}

export const feesApi = {
  structures: () => http.get<{ data: FeeStructure[] }>('/fee-structures').then((r) => r.data),
  saveStructure: (id: number | null, input: FeeStructureInput) =>
    (id === null ? http.post<{ data: FeeStructure }>('/fee-structures', input) : http.put<{ data: FeeStructure }>(`/fee-structures/${id}`, input)).then((r) => r.data),
  deleteStructure: (id: number) => http.delete<{ message: string }>(`/fee-structures/${id}`),
  assign: (id: number, target: { classId: number } | { studentIds: number[] }) =>
    http.post<{ data: { assigned: number; skipped: number } }>(`/fee-structures/${id}/assign`, target).then((r) => r.data),
  studentFees: (filters: { feeStructureId?: number; status?: FeeStatus; search?: string }) =>
    http.get<{ data: StudentFee[]; meta: { total: number } }>('/student-fees', filters),
  studentFee: (id: number) => http.get<{ data: StudentFee }>(`/student-fees/${id}`).then((r) => r.data),
  recordPayment: (feeId: number, input: PaymentInput) => http.post<{ data: StudentFee }>(`/student-fees/${feeId}/payments`, input).then((r) => r.data),
  voidPayment: (paymentId: number, reason: string) => http.post<{ data: StudentFee }>(`/fee-payments/${paymentId}/void`, { reason }).then((r) => r.data),
  myFees: () => http.get<{ data: StudentFee[]; meta: { totalDue: number } }>('/students/me/fees'),
};

const keys = { all: ['fees'] as const };

export const useFeeStructures = () => useQuery({ queryKey: ['fees', 'structures'], queryFn: feesApi.structures });
export const useStudentFees = (filters: { feeStructureId?: number; status?: FeeStatus; search?: string }) =>
  useQuery({ queryKey: ['fees', 'student-fees', filters], queryFn: () => feesApi.studentFees(filters) });
export const useStudentFee = (id: number | null) =>
  useQuery({ queryKey: ['fees', 'student-fee', id], queryFn: () => feesApi.studentFee(id as number), enabled: id !== null });
export const useMyFees = () => useQuery({ queryKey: ['fees', 'mine'], queryFn: feesApi.myFees });

function useFeeMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const client = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => client.invalidateQueries({ queryKey: keys.all }) });
}

export const useSaveFeeStructure = () => useFeeMutation(({ id, input }: { id: number | null; input: FeeStructureInput }) => feesApi.saveStructure(id, input));
export const useDeleteFeeStructure = () => useFeeMutation((id: number) => feesApi.deleteStructure(id));
export const useAssignFeeStructure = () =>
  useFeeMutation(({ id, target }: { id: number; target: { classId: number } | { studentIds: number[] } }) => feesApi.assign(id, target));
export const useRecordPayment = () => useFeeMutation(({ feeId, input }: { feeId: number; input: PaymentInput }) => feesApi.recordPayment(feeId, input));
export const useVoidPayment = () => useFeeMutation(({ paymentId, reason }: { paymentId: number; reason: string }) => feesApi.voidPayment(paymentId, reason));

export const formatMoney = (amount: number) => `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
