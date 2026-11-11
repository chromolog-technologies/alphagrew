/**
 * Institution setup screens: batches, campuses, institution settings and branding, and the
 * placement policy. The APIs existed before these screens (see documentation/api/02, 05).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from './http';

export interface Batch {
  id: number;
  name: string;
  code: string;
  departmentCode: string | null;
  courseId: number | null;
  courseName?: string | null;
  admissionYear: number;
  graduationYear: number;
  status: 'active' | 'graduated' | 'archived' | string;
  studentCount?: number;
}

export type BatchInput = Omit<Batch, 'id' | 'courseName' | 'studentCount' | 'status'> & { status?: string };

export interface Campus {
  id: number;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  isPrimary: boolean;
}

export type CampusInput = Omit<Campus, 'id'>;

export interface InstitutionSettings {
  id: number;
  name: string;
  code: string;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  address: string | null;
  emailSenderName: string | null;
  emailReplyTo: string | null;
}

export type InstitutionSettingsInput = Omit<InstitutionSettings, 'id' | 'code' | 'logoUrl'>;

export interface PlacementPolicy {
  oneOfferRule: boolean;
  dreamOfferEnabled: boolean;
  dreamOfferMinCtc: number | null;
  offerResponseDays: number;
  maxActiveApplications: number | null;
  minProfileCompletion: number;
  debarOnRenege: boolean;
  isDefault?: boolean;
  updatedAt?: string | null;
}

export interface StudentOption {
  id: number;
  name: string;
  registrationNumber: string;
  departmentCode: string;
  year: string;
  batchId: number | null;
}

const unwrap = <T,>(response: { data: T }) => response.data;

export const setupApi = {
  batches: () => http.get<{ data: Batch[] }>('/batches').then(unwrap),
  createBatch: (input: BatchInput) => http.post<{ data: Batch }>('/batches', input).then(unwrap),
  updateBatch: (id: number, input: BatchInput) => http.put<{ data: Batch }>(`/batches/${id}`, input).then(unwrap),
  deleteBatch: (id: number) => http.delete(`/batches/${id}`),
  assignStudents: (id: number, studentIds: number[]) => http.post(`/batches/${id}/students`, { studentIds }),
  removeStudents: (id: number, studentIds: number[]) => http.delete(`/batches/${id}/students?${studentIds.map((sid) => `studentIds[]=${sid}`).join('&')}`),
  students: () => http.get<{ data: StudentOption[] }>('/students', { per_page: 100 }).then(unwrap),

  campuses: () => http.get<{ data: Campus[] }>('/campuses').then(unwrap),
  createCampus: (input: CampusInput) => http.post<{ data: Campus }>('/campuses', input).then(unwrap),
  updateCampus: (id: number, input: CampusInput) => http.put<{ data: Campus }>(`/campuses/${id}`, input).then(unwrap),
  deleteCampus: (id: number) => http.delete(`/campuses/${id}`),

  institution: () => http.get<{ data: InstitutionSettings }>('/institution').then(unwrap),
  updateInstitution: (input: InstitutionSettingsInput) => http.put<{ data: InstitutionSettings }>('/institution/settings', input).then(unwrap),
  uploadLogo: (file: File) => {
    const form = new FormData();
    form.append('logo', file);
    return http.post<{ data: InstitutionSettings }>('/institution/logo', form).then(unwrap);
  },

  policy: () => http.get<{ data: PlacementPolicy }>('/placement-policy').then(unwrap),
  updatePolicy: (input: PlacementPolicy) => http.put<{ data: PlacementPolicy }>('/placement-policy', input).then(unwrap),
};

export const setupKeys = {
  batches: ['setup', 'batches'] as const,
  students: ['setup', 'students'] as const,
  campuses: ['setup', 'campuses'] as const,
  institution: ['setup', 'institution'] as const,
  policy: ['setup', 'policy'] as const,
};

export const useBatches = () => useQuery({ queryKey: setupKeys.batches, queryFn: setupApi.batches });
export const useStudentOptions = (enabled = true) => useQuery({ queryKey: setupKeys.students, queryFn: setupApi.students, enabled });
export const useCampuses = () => useQuery({ queryKey: setupKeys.campuses, queryFn: setupApi.campuses });
export const useInstitutionSettings = () => useQuery({ queryKey: setupKeys.institution, queryFn: setupApi.institution });
export const usePlacementPolicy = () => useQuery({ queryKey: setupKeys.policy, queryFn: setupApi.policy });

/** A setup mutation that refreshes the given queries on success. */
export function useSetupMutation<TVariables, TResult>(
  mutationFn: (variables: TVariables) => Promise<TResult>,
  invalidate: readonly (readonly string[])[],
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => invalidate.forEach((queryKey) => void client.invalidateQueries({ queryKey })),
  });
}
