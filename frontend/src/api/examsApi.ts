/**
 * Exams: scheduled by admins and exam coordinators (marks.publish), listed for mark entry.
 * Exam types are shared by every institution and only read here.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from './http';
import type { CustomFieldValues } from './customFieldsApi';

export type ExamMode = 'offline' | 'online' | 'hybrid';
export type ExamStatus = 'scheduled' | 'conducted' | 'cancelled' | 'postponed';

export interface ExamType {
  id: number;
  name: string;
  code: string;
  max_marks: number;
  passing_marks: number;
  weightage: number;
}

export interface Exam {
  id: number;
  name: string;
  subject_id: number;
  exam_type_id: number;
  semester_id: number;
  /** ISO date-time; the day is the first 10 characters. */
  exam_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  location: string | null;
  max_marks: number;
  exam_mode: ExamMode;
  status: ExamStatus;
  subject?: { id: number; name: string; code: string } | null;
  exam_type?: { id: number; name: string; code: string } | null;
  semester?: { id: number; name: string; is_active: boolean } | null;
  /** Marks entered against the exam; once any exist, subject and semester are fixed. */
  mark_entries_count?: number;
  customFields?: CustomFieldValues;
}

export interface ExamInput {
  name?: string;
  subjectId?: number;
  semesterId?: number;
  examTypeId?: number;
  examDate?: string;
  startTime?: string;
  endTime?: string;
  location?: string | null;
  maxMarks?: number;
  examMode?: ExamMode;
  status?: ExamStatus;
  customFields?: CustomFieldValues;
}

export const EXAM_STATUSES: { value: ExamStatus; label: string }[] = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'conducted', label: 'Conducted' },
  { value: 'postponed', label: 'Postponed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const EXAM_MODES: { value: ExamMode; label: string }[] = [
  { value: 'offline', label: 'Offline' },
  { value: 'online', label: 'Online' },
  { value: 'hybrid', label: 'Hybrid' },
];

export const examsApi = {
  list: (filters: { semester_id?: number; subject_id?: number } = {}) =>
    http.get<{ data: Exam[] }>('/exams', filters).then((r) => r.data),
  types: () => http.get<{ data: ExamType[] }>('/exam-types').then((r) => r.data),
  create: (input: ExamInput) => http.post<{ data: Exam }>('/exams', input).then((r) => r.data),
  update: (id: number, input: ExamInput) => http.put<{ data: Exam }>(`/exams/${id}`, input).then((r) => r.data),
  remove: (id: number) => http.delete<{ message: string }>(`/exams/${id}`),
};

const examKeys = {
  all: ['exams'] as const,
  list: (filters: object) => ['exams', 'list', filters] as const,
  types: ['exams', 'types'] as const,
};

export function useExams(filters: { semester_id?: number; subject_id?: number } = {}) {
  return useQuery({ queryKey: examKeys.list(filters), queryFn: () => examsApi.list(filters) });
}

export function useExamTypes() {
  return useQuery({ queryKey: examKeys.types, queryFn: examsApi.types, staleTime: 10 * 60 * 1000 });
}

export function useSaveExam() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number | null; input: ExamInput }) =>
      id === null ? examsApi.create(input) : examsApi.update(id, input),
    onSuccess: () => client.invalidateQueries({ queryKey: examKeys.all }),
  });
}

export function useDeleteExam() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => examsApi.remove(id),
    onSuccess: () => client.invalidateQueries({ queryKey: examKeys.all }),
  });
}
