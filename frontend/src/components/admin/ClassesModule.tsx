/**
 * Classes: a course's cohort in a semester (e.g. "CSE 2023 · Sem 5 · A"). Timetables are built
 * per class, so a class with timetable entries cannot be deleted.
 */
import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { ApiError } from '../../api/apiError';
import { apiCall, semesterApi } from '../../api/apiClient';
import { useClasses, useDeleteClass, useSaveClass, type SchoolClass } from '../../api/academicsApi';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui';

type Option = { id: number; name: string; code?: string };
type Draft = { id: number | null; name: string; code: string; courseId: string; semesterId: string; batch: string; admissionYear: string };

const asList = (response: unknown): Option[] =>
  (Array.isArray(response) ? response : Array.isArray((response as { data?: unknown })?.data) ? (response as { data: Option[] }).data : []) as Option[];

export function ClassesModule({ canManage = true }: { canManage?: boolean }) {
  const classes = useClasses();
  const courses = useQuery({ queryKey: ['courses', 'options'], queryFn: () => apiCall('/courses').then(asList) });
  const semesters = useQuery({ queryKey: ['semesters', 'options'], queryFn: () => semesterApi.list().then(asList) });
  const save = useSaveClass();
  const remove = useDeleteClass();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<SchoolClass | null>(null);

  const fieldErrors = save.error instanceof ApiError ? save.error.firstFieldErrors : {};
  const formError = save.error instanceof ApiError && Object.keys(fieldErrors).length === 0 ? save.error.message : null;
  const error = (field: string) => (fieldErrors[field] ? <p className="text-xs text-destructive">{fieldErrors[field]}</p> : null);

  const open = (c?: SchoolClass) => {
    save.reset();
    setDraft(
      c
        ? { id: c.id, name: c.name, code: c.code, courseId: String(c.courseId), semesterId: String(c.semesterId), batch: c.batch, admissionYear: String(c.admissionYear) }
        : { id: null, name: '', code: '', courseId: '', semesterId: '', batch: '', admissionYear: String(new Date().getFullYear()) },
    );
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    save.mutate(
      {
        id: draft.id,
        input: {
          name: draft.name.trim(),
          code: draft.code.trim(),
          courseId: Number(draft.courseId),
          semesterId: Number(draft.semesterId),
          batch: draft.batch.trim(),
          admissionYear: Number(draft.admissionYear),
        },
      },
      { onSuccess: () => setDraft(null) },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Classes</h1>
          <p className="text-sm text-muted-foreground">A course&apos;s cohort in a semester. Timetables are built per class.</p>
        </div>
        {canManage ? (
          <Button type="button" onClick={() => open()} className="gap-1.5">
            <Plus size={16} /> Add class
          </Button>
        ) : null}
      </div>

      <Card className="p-4">
        {classes.isLoading ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : classes.error ? (
          <Alert variant="destructive">
            <AlertDescription>{classes.error instanceof ApiError ? classes.error.message : 'Classes could not be loaded.'}</AlertDescription>
          </Alert>
        ) : (classes.data ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No classes yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Semester</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Students</TableHead>
                {canManage ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(classes.data ?? []).map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="font-mono text-xs">{c.code}</TableCell>
                  <TableCell>{c.course ? `${c.course.code} · ${c.course.name}` : '—'}</TableCell>
                  <TableCell>{c.semester?.name ?? '—'}</TableCell>
                  <TableCell>
                    {c.batch} <span className="text-muted-foreground">({c.admissionYear})</span>
                  </TableCell>
                  <TableCell>{c.totalStudents}</TableCell>
                  {canManage ? (
                    <TableCell className="text-right">
                      <Button type="button" variant="ghost" size="icon" aria-label={`Edit ${c.name}`} onClick={() => open(c)}>
                        <Pencil size={14} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${c.name}`}
                        onClick={() => {
                          remove.reset();
                          setDeleting(c);
                        }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={draft !== null} onOpenChange={(isOpen) => !isOpen && setDraft(null)}>
        <DialogContent className="max-w-lg">
          {draft ? (
            <form onSubmit={submit}>
              <DialogHeader>
                <DialogTitle>{draft.id === null ? 'Add class' : `Edit ${draft.name}`}</DialogTitle>
                <DialogDescription>For example “CSE 2023 · Sem 5 · A”.</DialogDescription>
              </DialogHeader>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="class-name">Name *</Label>
                  <Input id="class-name" required maxLength={255} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                  {error('name')}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="class-code">Code *</Label>
                  <Input id="class-code" required maxLength={50} value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} />
                  {error('code')}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="class-course">Course *</Label>
                  <Select id="class-course" required value={draft.courseId} onChange={(e) => setDraft({ ...draft, courseId: e.target.value })}>
                    <option value="">Choose a course</option>
                    {(courses.data ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code ? `${c.code} · ${c.name}` : c.name}
                      </option>
                    ))}
                  </Select>
                  {error('courseId')}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="class-semester">Semester *</Label>
                  <Select id="class-semester" required value={draft.semesterId} onChange={(e) => setDraft({ ...draft, semesterId: e.target.value })}>
                    <option value="">Choose a semester</option>
                    {(semesters.data ?? []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                  {error('semesterId')}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="class-batch">Batch *</Label>
                  <Input id="class-batch" required maxLength={50} placeholder="2023-2027" value={draft.batch} onChange={(e) => setDraft({ ...draft, batch: e.target.value })} />
                  {error('batch')}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="class-year">Admission year *</Label>
                  <Input id="class-year" type="number" required min={1990} max={2100} value={draft.admissionYear} onChange={(e) => setDraft({ ...draft, admissionYear: e.target.value })} />
                  {error('admissionYear')}
                </div>
              </div>
              {formError ? (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              ) : null}
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setDraft(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={save.isPending}>
                  {save.isPending ? 'Saving…' : 'Save'}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(isOpen) => !isOpen && setDeleting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {deleting?.name}?</DialogTitle>
            <DialogDescription>A class with a timetable cannot be deleted.</DialogDescription>
          </DialogHeader>
          {remove.error ? (
            <Alert variant="destructive">
              <AlertDescription>{remove.error instanceof ApiError ? remove.error.message : 'The class could not be deleted.'}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" disabled={remove.isPending} onClick={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
