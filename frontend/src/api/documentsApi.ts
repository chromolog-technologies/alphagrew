/** Student documents: students upload their own; staff list them per student; admins verify. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from './http';

export type DocumentType = 'id_proof' | 'mark_sheet' | 'certificate' | 'transfer_certificate' | 'photo' | 'other';
export type DocumentStatus = 'pending' | 'verified' | 'rejected';

export const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'id_proof', label: 'ID proof' },
  { value: 'mark_sheet', label: 'Mark sheet' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'transfer_certificate', label: 'Transfer certificate' },
  { value: 'photo', label: 'Photo' },
  { value: 'other', label: 'Other' },
];

export interface StudentDocument {
  id: number;
  studentId: number;
  type: DocumentType;
  title: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status: DocumentStatus;
  reviewRemarks: string | null;
  reviewedAt: string | null;
  uploadedAt: string | null;
}

export const documentsApi = {
  mine: () => http.get<{ data: StudentDocument[] }>('/students/me/documents').then((r) => r.data),
  upload: (input: { type: DocumentType; title: string; file: File }) => {
    const body = new FormData();
    body.append('type', input.type);
    body.append('title', input.title);
    body.append('file', input.file);
    return http.post<{ data: StudentDocument }>('/students/me/documents', body).then((r) => r.data);
  },
  remove: (id: number) => http.delete<{ message: string }>(`/students/me/documents/${id}`),
  forStudent: (studentId: number) => http.get<{ data: StudentDocument[] }>(`/students/${studentId}/documents`).then((r) => r.data),
  review: (id: number, status: 'verified' | 'rejected', remarks?: string) =>
    http.post<{ data: StudentDocument }>(`/student-documents/${id}/review`, { status, remarks }).then((r) => r.data),
  /** Opens the file through a five-minute signed link. */
  open: async (id: number) => {
    const { data } = await http.get<{ data: { url: string } }>(`/student-documents/${id}/link`);
    window.open(data.url, '_blank', 'noopener');
  },
};

export const useMyDocuments = () => useQuery({ queryKey: ['documents', 'mine'], queryFn: documentsApi.mine });
export const useStudentDocuments = (studentId: number | null) =>
  useQuery({ queryKey: ['documents', 'student', studentId], queryFn: () => documentsApi.forStudent(studentId as number), enabled: studentId !== null });

function useDocumentMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const client = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => client.invalidateQueries({ queryKey: ['documents'] }) });
}

export const useUploadDocument = () => useDocumentMutation(documentsApi.upload);
export const useRemoveDocument = () => useDocumentMutation(documentsApi.remove);
export const useReviewDocument = () =>
  useDocumentMutation(({ id, status, remarks }: { id: number; status: 'verified' | 'rejected'; remarks?: string }) => documentsApi.review(id, status, remarks));
