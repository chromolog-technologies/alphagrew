/**
 * Academic structure: academic years, classes and subject allocations (who teaches which
 * subject in which semester; allocated faculty are the ones who can enter marks).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from './http';

export interface AcademicYear {
  id: number;
  year: string;
  code: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  semestersCount: number;
}

export interface AcademicYearInput {
  year?: string;
  code?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface SchoolClass {
  id: number;
  name: string;
  code: string;
  courseId: number;
  semesterId: number;
  batch: string;
  batchId: number | null;
  admissionYear: number;
  hodId: number | null;
  totalStudents: number;
  course: { id: number; name: string; code: string } | null;
  semester: { id: number; name: string } | null;
  hod: { id: number; name: string } | null;
}

export interface SchoolClassInput {
  name?: string;
  code?: string;
  courseId?: number;
  semesterId?: number;
  batch?: string;
  admissionYear?: number;
}

export interface SubjectAllocation {
  id: number;
  subjectId: number;
  semesterId: number;
  facultyId: number;
  allocatedFrom: string | null;
  allocatedTo: string | null;
  subject: { id: number; name: string; code: string } | null;
  semester: { id: number; name: string } | null;
  faculty: { id: number; name: string; email: string } | null;
}

export interface SubjectAllocationInput {
  subjectId: number;
  semesterId: number;
  facultyId: number;
  allocatedFrom?: string;
}


export interface ClassStudent {
  id: number;
  name: string;
  registrationNumber: string | null;
  departmentCode: string | null;
}

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
export const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export type SessionType = 'lecture' | 'practical' | 'lab' | 'tutorial';

export interface TimetableEntry {
  id: number;
  classId: number;
  subjectId: number;
  facultyId: number;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  roomNumber: string | null;
  sessionType: SessionType;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  class: { id: number; name: string; code: string } | null;
  subject: { id: number; name: string; code: string } | null;
  faculty: { id: number; name: string } | null;
}

export interface TimetableInput {
  classId: number;
  subjectId: number;
  facultyId: number;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  roomNumber?: string | null;
  sessionType?: SessionType;
  effectiveFrom?: string;
}

export const academicsApi = {
  years: () => http.get<{ data: AcademicYear[] }>('/academic-years').then((r) => r.data),
  saveYear: (id: number | null, input: AcademicYearInput) =>
    (id === null ? http.post<{ data: AcademicYear }>('/academic-years', input) : http.put<{ data: AcademicYear }>(`/academic-years/${id}`, input)).then((r) => r.data),
  deleteYear: (id: number) => http.delete<{ message: string }>(`/academic-years/${id}`),

  classes: () => http.get<{ data: SchoolClass[] }>('/classes').then((r) => r.data),
  saveClass: (id: number | null, input: SchoolClassInput) =>
    (id === null ? http.post<{ data: SchoolClass }>('/classes', input) : http.put<{ data: SchoolClass }>(`/classes/${id}`, input)).then((r) => r.data),
  deleteClass: (id: number) => http.delete<{ message: string }>(`/classes/${id}`),

  classStudents: (classId: number) => http.get<{ data: ClassStudent[] }>(`/classes/${classId}/students`).then((r) => r.data),
  saveClassStudents: (classId: number, studentIds: number[]) =>
    http.put<{ data: ClassStudent[] }>(`/classes/${classId}/students`, { studentIds }).then((r) => r.data),
  /** Every student visible to the caller, a page of 100 at a time (stops at 2,000). */
  allStudents: async (): Promise<ClassStudent[]> => {
    const all: ClassStudent[] = [];
    for (let page = 1; page <= 20; page++) {
      const r = await http.get<{ data: ClassStudent[]; meta: { lastPage: number } }>('/students', { page, per_page: 100 });
      all.push(...r.data);
      if (page >= r.meta.lastPage) break;
    }
    return all;
  },

  timetables: (filters: { classId?: number; mine?: boolean } = {}) =>
    http.get<{ data: TimetableEntry[] }>('/timetables', { classId: filters.classId, mine: filters.mine ? 1 : undefined }).then((r) => r.data),
  saveTimetable: (id: number | null, input: TimetableInput) =>
    (id === null ? http.post<{ data: TimetableEntry }>('/timetables', input) : http.put<{ data: TimetableEntry }>(`/timetables/${id}`, input)).then((r) => r.data),
  deleteTimetable: (id: number) => http.delete<{ message: string }>(`/timetables/${id}`),

  allocations: (filters: { subjectId?: number; semesterId?: number; facultyId?: number } = {}) =>
    http.get<{ data: SubjectAllocation[] }>('/subject-allocations', filters).then((r) => r.data),
  allocate: (input: SubjectAllocationInput) => http.post<{ data: SubjectAllocation }>('/subject-allocations', input).then((r) => r.data),
  deallocate: (id: number) => http.delete<{ message: string }>(`/subject-allocations/${id}`),
};

const keys = {
  classStudents: (classId: number) => ['academics', 'class-students', classId] as const,
  timetables: (filters: object) => ['academics', 'timetables', filters] as const,
  years: ['academics', 'years'] as const,
  classes: ['academics', 'classes'] as const,
  allocations: (filters: object) => ['academics', 'allocations', filters] as const,
};

export const useAcademicYears = () => useQuery({ queryKey: keys.years, queryFn: academicsApi.years });
export const useClasses = () => useQuery({ queryKey: keys.classes, queryFn: academicsApi.classes });
export const useSubjectAllocations = (filters: { subjectId?: number }, enabled = true) =>
  useQuery({ queryKey: keys.allocations(filters), queryFn: () => academicsApi.allocations(filters), enabled });

function useInvalidating<TArgs>(fn: (args: TArgs) => Promise<unknown>, invalidate: readonly unknown[]) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    // Years feed the semester pickers elsewhere, so refresh those too.
    onSuccess: () => Promise.all([client.invalidateQueries({ queryKey: invalidate }), client.invalidateQueries({ queryKey: ['semesters'] })]),
  });
}

export const useSaveAcademicYear = () =>
  useInvalidating(({ id, input }: { id: number | null; input: AcademicYearInput }) => academicsApi.saveYear(id, input), keys.years);
export const useDeleteAcademicYear = () => useInvalidating((id: number) => academicsApi.deleteYear(id), keys.years);
export const useSaveClass = () =>
  useInvalidating(({ id, input }: { id: number | null; input: SchoolClassInput }) => academicsApi.saveClass(id, input), keys.classes);
export const useDeleteClass = () => useInvalidating((id: number) => academicsApi.deleteClass(id), keys.classes);
export const useAllocate = () => useInvalidating((input: SubjectAllocationInput) => academicsApi.allocate(input), ['academics', 'allocations']);
export const useDeallocate = () => useInvalidating((id: number) => academicsApi.deallocate(id), ['academics', 'allocations']);

export const useClassStudents = (classId: number | null) =>
  useQuery({ queryKey: keys.classStudents(classId ?? 0), queryFn: () => academicsApi.classStudents(classId as number), enabled: classId !== null });
export const useAllStudents = (enabled: boolean) =>
  useQuery({ queryKey: ['academics', 'all-students'], queryFn: academicsApi.allStudents, enabled, staleTime: 60_000 });
export const useSaveClassStudents = () =>
  useInvalidating(({ classId, studentIds }: { classId: number; studentIds: number[] }) => academicsApi.saveClassStudents(classId, studentIds), ['academics']);
export const useTimetables = (filters: { classId?: number; mine?: boolean }, enabled = true) =>
  useQuery({ queryKey: keys.timetables(filters), queryFn: () => academicsApi.timetables(filters), enabled });
export const useSaveTimetable = () =>
  useInvalidating(({ id, input }: { id: number | null; input: TimetableInput }) => academicsApi.saveTimetable(id, input), ['academics', 'timetables']);
export const useDeleteTimetable = () => useInvalidating((id: number) => academicsApi.deleteTimetable(id), ['academics', 'timetables']);
