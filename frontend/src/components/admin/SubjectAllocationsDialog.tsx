/**
 * Who teaches a subject in each semester. Allocated faculty are the ones who can enter marks for
 * the subject's exams (Marks → Enter Marks), so this is where mark entry is opened up.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trash2, UserPlus } from 'lucide-react';
import { ApiError } from '../../api/apiError';
import { apiCall, semesterApi } from '../../api/apiClient';
import { useAllocate, useDeallocate, useSubjectAllocations } from '../../api/academicsApi';
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  Skeleton,
} from '../ui';

type Option = { id: number; name: string; email?: string };

const asList = (response: unknown): Option[] =>
  (Array.isArray(response) ? response : Array.isArray((response as { data?: unknown })?.data) ? (response as { data: Option[] }).data : []) as Option[];

interface SubjectAllocationsDialogProps {
  subject: { id: number; name: string; code: string } | null;
  onClose: () => void;
}

export function SubjectAllocationsDialog({ subject, onClose }: SubjectAllocationsDialogProps) {
  const open = subject !== null;
  const allocations = useSubjectAllocations({ subjectId: subject?.id }, open);
  const staff = useQuery({ queryKey: ['staff', 'options'], queryFn: () => apiCall('/staff').then(asList), enabled: open });
  const semesters = useQuery({ queryKey: ['semesters', 'options'], queryFn: () => semesterApi.list().then(asList), enabled: open });
  const allocate = useAllocate();
  const deallocate = useDeallocate();
  const [semesterId, setSemesterId] = useState('');
  const [facultyId, setFacultyId] = useState('');

  const fieldErrors = allocate.error instanceof ApiError ? allocate.error.firstFieldErrors : {};
  const message =
    Object.values(fieldErrors)[0] ??
    (allocate.error instanceof ApiError ? allocate.error.message : deallocate.error instanceof ApiError ? deallocate.error.message : null);

  const add = () => {
    if (!subject || !semesterId || !facultyId) return;
    allocate.mutate(
      { subjectId: subject.id, semesterId: Number(semesterId), facultyId: Number(facultyId) },
      { onSuccess: () => setFacultyId('') },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          allocate.reset();
          deallocate.reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Faculty for {subject ? `${subject.code} · ${subject.name}` : ''}</DialogTitle>
          <DialogDescription>Allocated faculty enter marks for this subject&apos;s exams in that semester.</DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-2">
          {allocations.isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (allocations.data ?? []).length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">No one is allocated yet.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border" aria-label="Allocated faculty">
              {(allocations.data ?? []).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span>
                    <span className="font-medium">{a.faculty?.name ?? `#${a.facultyId}`}</span>
                    <span className="text-muted-foreground"> · {a.semester?.name ?? `Semester #${a.semesterId}`}</span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${a.faculty?.name ?? 'allocation'} from ${a.semester?.name ?? 'semester'}`}
                    disabled={deallocate.isPending}
                    onClick={() => deallocate.mutate(a.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="alloc-semester">Semester</Label>
            <Select id="alloc-semester" value={semesterId} onChange={(e) => setSemesterId(e.target.value)}>
              <option value="">Choose…</option>
              {(semesters.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="alloc-faculty">Faculty</Label>
            <Select id="alloc-faculty" value={facultyId} onChange={(e) => setFacultyId(e.target.value)}>
              <option value="">Choose…</option>
              {(staff.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <Button type="button" className="gap-1.5" disabled={!semesterId || !facultyId || allocate.isPending} onClick={add}>
            <UserPlus size={15} /> Allocate
          </Button>
        </div>

        {message ? (
          <Alert variant="destructive" className="mt-3">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
