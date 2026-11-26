/**
 * Staff portal for one department: the signed-in staff member's own department (admins pass
 * a department code). Overview, reports, and the department's staff — which HODs with staff.*
 * permissions can also manage.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from './http';

export interface DepartmentSummary {
  department: { id: number; name: string; code: string; hodName: string | null; intakeCapacity: number | null };
  counts: { students: number; staff: number; courses: number; subjects: number; upcomingExams: number };
  averages: { cgpa: number; attendance: number; placementRate: number };
  placedStudents: number;
  studentsByYear: { year: string; students: number; averageCgpa: number }[];
  courses: { id: number; name: string; code: string; semesters: number; subjects: number }[];
}

export interface DepartmentReports {
  academic: { subjectId: number; code: string; name: string; students: number; averageMarks: number | null; passPercentage: number | null }[];
  attendance: { subjectId: number; code: string; name: string; records: number; presentPercentage: number | null }[];
  placement: {
    students: number;
    placed: number;
    placementRate: number;
    offers: number;
    averageOfferLpa: number;
    highestOfferLpa: number;
    topCompanies: { company: string; students: number }[];
  };
}

export interface DepartmentStaffMember {
  id: number;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  designationId: number | null;
  designationName: string | null;
  subjects: { code: string; name: string; semester: string | null }[];
}

export interface DepartmentStaffList {
  data: DepartmentStaffMember[];
  meta: {
    department: { code: string; name: string };
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    designations: { id: number; name: string }[];
  };
}

export interface DepartmentStaffInput {
  name: string;
  email: string;
  password?: string | null;
  designationId: number;
  phone?: string | null;
  specialization?: string | null;
}

const query = (departmentCode?: string) => (departmentCode ? { departmentCode } : undefined);

export const departmentPortalApi = {
  summary: (departmentCode?: string) => http.get<{ data: DepartmentSummary }>('/department-portal/summary', query(departmentCode)).then((r) => r.data),
  reports: (departmentCode?: string) => http.get<{ data: DepartmentReports }>('/department-portal/reports', query(departmentCode)).then((r) => r.data),
  staff: (departmentCode?: string) => http.get<DepartmentStaffList>('/department-portal/staff', query(departmentCode)),
  saveStaff: (id: number | null, input: DepartmentStaffInput) =>
    (id === null
      ? http.post<{ data: DepartmentStaffMember }>('/department-portal/staff', input)
      : http.put<{ data: DepartmentStaffMember }>(`/department-portal/staff/${id}`, input)
    ).then((r) => r.data),
  removeStaff: (id: number) => http.delete<{ message: string }>(`/department-portal/staff/${id}`),
};

const keys = {
  all: ['department-portal'] as const,
  summary: (code?: string) => ['department-portal', 'summary', code ?? 'own'] as const,
  reports: (code?: string) => ['department-portal', 'reports', code ?? 'own'] as const,
  staff: (code?: string) => ['department-portal', 'staff', code ?? 'own'] as const,
};

export const useDepartmentSummary = (code?: string) => useQuery({ queryKey: keys.summary(code), queryFn: () => departmentPortalApi.summary(code) });
export const useDepartmentReports = (code?: string) => useQuery({ queryKey: keys.reports(code), queryFn: () => departmentPortalApi.reports(code) });
export const useDepartmentStaff = (code?: string) => useQuery({ queryKey: keys.staff(code), queryFn: () => departmentPortalApi.staff(code) });

export function useSaveDepartmentStaff() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number | null; input: DepartmentStaffInput }) => departmentPortalApi.saveStaff(id, input),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useRemoveDepartmentStaff() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => departmentPortalApi.removeStaff(id),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.all }),
  });
}
