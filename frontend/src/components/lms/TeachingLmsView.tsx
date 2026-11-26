/** Faculty: post materials and assignments for the subjects they teach, and grade submissions. */
import { useEffect, useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { ApiError } from '../../api/apiError';
import { lmsApi, useLmsMutation, useLmsSubject, useSubmissions, useTeachingSubjects } from '../../api/lmsApi';
import { Alert, AlertDescription, Button, Card, Dialog, DialogContent, DialogHeader, DialogTitle, Input, Label, Select, Skeleton } from '../ui';

const errorText = (error: unknown) =>
  error instanceof ApiError ? Object.values(error.firstFieldErrors)[0] ?? error.message : error ? 'The change could not be saved.' : null;

export function TeachingLmsView() {
  const subjects = useTeachingSubjects();
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const content = useLmsSubject(subjectId);
  const [gradingId, setGradingId] = useState<number | null>(null);

  useEffect(() => {
    if (subjectId === null && subjects.data && subjects.data.length > 0) setSubjectId(subjects.data[0].id);
  }, [subjects.data, subjectId]);

  const addMaterial = useLmsMutation((input: { title: string; linkUrl?: string; file?: File | null }) => lmsApi.addMaterial(subjectId as number, input));
  const removeMaterial = useLmsMutation((id: number) => lmsApi.removeMaterial(id));
  const addAssignment = useLmsMutation((input: { title: string; instructions?: string; dueAt: string; maxMarks: number; allowLate: boolean }) =>
    lmsApi.addAssignment(subjectId as number, input),
  );
  const removeAssignment = useLmsMutation((id: number) => lmsApi.removeAssignment(id));

  const [material, setMaterial] = useState({ title: '', linkUrl: '', file: null as File | null, key: 0 });
  const [assignment, setAssignment] = useState({ title: '', instructions: '', dueAt: '', maxMarks: '10', allowLate: false });

  if (subjects.isLoading) return <Skeleton className="h-40 w-full" />;
  if ((subjects.data ?? []).length === 0) {
    return <Card className="p-6 text-center text-sm text-muted-foreground">You are not allocated to any subject yet. Ask your admin to allocate you (Subjects → Faculty).</Card>;
  }

  const submitMaterial = (event: FormEvent) => {
    event.preventDefault();
    addMaterial.mutate(
      { title: material.title.trim(), linkUrl: material.linkUrl.trim() || undefined, file: material.file },
      { onSuccess: () => setMaterial({ title: '', linkUrl: '', file: null, key: material.key + 1 }) },
    );
  };

  const submitAssignment = (event: FormEvent) => {
    event.preventDefault();
    addAssignment.mutate(
      { title: assignment.title.trim(), instructions: assignment.instructions.trim() || undefined, dueAt: new Date(assignment.dueAt).toISOString(), maxMarks: Number(assignment.maxMarks), allowLate: assignment.allowLate },
      { onSuccess: () => setAssignment({ title: '', instructions: '', dueAt: '', maxMarks: '10', allowLate: false }) },
    );
  };

  const error = errorText(addMaterial.error ?? addAssignment.error ?? removeMaterial.error ?? removeAssignment.error);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Materials &amp; assignments</h1>
          <p className="text-sm text-muted-foreground">Students of the subject see what you post here.</p>
        </div>
        <Select aria-label="Subject" value={subjectId ?? ''} onChange={(e) => setSubjectId(Number(e.target.value))} className="md:w-80">
          {(subjects.data ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.code} · {s.name}
            </option>
          ))}
        </Select>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {content.isLoading || !content.data ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-3 p-4">
            <h2 className="text-sm font-semibold">Materials</h2>
            <form key={material.key} onSubmit={submitMaterial} className="space-y-2">
              <Input aria-label="Material title" required placeholder="Title" value={material.title} onChange={(e) => setMaterial({ ...material, title: e.target.value })} />
              <Input aria-label="Link" type="url" placeholder="Link (or attach a file)" value={material.linkUrl} onChange={(e) => setMaterial({ ...material, linkUrl: e.target.value })} />
              <div className="flex items-center justify-between gap-2">
                <input type="file" aria-label="Material file" onChange={(e) => setMaterial({ ...material, file: e.target.files?.[0] ?? null })} className="text-xs" />
                <Button type="submit" size="sm" disabled={addMaterial.isPending || (!material.file && !material.linkUrl.trim())}>
                  Share
                </Button>
              </div>
            </form>
            <ul className="space-y-1" aria-label="Materials">
              {content.data.materials.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>{m.title}</span>
                  <span className="flex gap-1">
                    {m.hasFile ? (
                      <Button type="button" size="sm" variant="ghost" onClick={() => lmsApi.open('material', m.id)}>
                        Open
                      </Button>
                    ) : null}
                    <Button type="button" size="icon" variant="ghost" aria-label={`Remove ${m.title}`} onClick={() => removeMaterial.mutate(m.id)}>
                      <Trash2 size={13} />
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="space-y-3 p-4">
            <h2 className="text-sm font-semibold">Assignments</h2>
            <form onSubmit={submitAssignment} className="grid grid-cols-2 gap-2">
              <Input aria-label="Assignment title" required placeholder="Title" className="col-span-2" value={assignment.title} onChange={(e) => setAssignment({ ...assignment, title: e.target.value })} />
              <textarea
                aria-label="Instructions"
                className="col-span-2 rounded-md border border-border p-2 text-sm"
                rows={2}
                placeholder="Instructions"
                value={assignment.instructions}
                onChange={(e) => setAssignment({ ...assignment, instructions: e.target.value })}
              />
              <div className="space-y-1">
                <Label htmlFor="as-due">Due</Label>
                <Input id="as-due" type="datetime-local" required value={assignment.dueAt} onChange={(e) => setAssignment({ ...assignment, dueAt: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="as-max">Max marks</Label>
                <Input id="as-max" type="number" min={1} max={1000} required value={assignment.maxMarks} onChange={(e) => setAssignment({ ...assignment, maxMarks: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={assignment.allowLate} onChange={(e) => setAssignment({ ...assignment, allowLate: e.target.checked })} /> Accept late work
              </label>
              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={addAssignment.isPending}>
                  Post
                </Button>
              </div>
            </form>
            <ul className="space-y-1" aria-label="Assignments">
              {content.data.assignments.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    {a.title} <span className="text-xs text-muted-foreground">({a.submissions ?? 0} submitted)</span>
                  </span>
                  <span className="flex gap-1">
                    <Button type="button" size="sm" variant="outline" onClick={() => setGradingId(a.id)}>
                      Submissions
                    </Button>
                    <Button type="button" size="icon" variant="ghost" aria-label={`Delete ${a.title}`} onClick={() => removeAssignment.mutate(a.id)}>
                      <Trash2 size={13} />
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      <SubmissionsDialog
        assignment={content.data?.assignments.find((a) => a.id === gradingId) ?? null}
        onClose={() => setGradingId(null)}
      />
    </div>
  );
}

function SubmissionsDialog({ assignment, onClose }: { assignment: { id: number; title: string; maxMarks: number } | null; onClose: () => void }) {
  const submissions = useSubmissions(assignment?.id ?? null);
  const grade = useLmsMutation(({ id, marks, feedback }: { id: number; marks: number; feedback?: string }) => lmsApi.grade(id, marks, feedback));
  const [marks, setMarks] = useState<Record<number, string>>({});

  return (
    <Dialog open={assignment !== null} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{assignment?.title} · submissions</DialogTitle>
        </DialogHeader>
        {submissions.isLoading ? (
          <Skeleton className="h-24" />
        ) : (submissions.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No submissions yet.</p>
        ) : (
          <ul className="max-h-96 space-y-2 overflow-y-auto" aria-label="Submissions">
            {(submissions.data ?? []).map((s) => (
              <li key={s.id} className="space-y-1 rounded-md border border-border p-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {s.student?.name} {s.isLate ? <span className="text-xs text-destructive">(late)</span> : null}
                  </span>
                  {s.hasFile ? (
                    <Button type="button" size="sm" variant="ghost" onClick={() => lmsApi.open('submission', s.id)}>
                      Open file
                    </Button>
                  ) : null}
                </div>
                {s.textAnswer ? <p className="whitespace-pre-line text-xs">{s.textAnswer}</p> : null}
                <div className="flex items-center gap-2">
                  <Input
                    aria-label={`Marks for ${s.student?.name}`}
                    type="number"
                    min={0}
                    max={assignment?.maxMarks}
                    className="w-24"
                    value={marks[s.id] ?? (s.marks !== null ? String(s.marks) : '')}
                    onChange={(e) => setMarks({ ...marks, [s.id]: e.target.value })}
                  />
                  <span className="text-xs text-muted-foreground">/ {assignment?.maxMarks}</span>
                  <Button type="button" size="sm" disabled={grade.isPending || (marks[s.id] ?? '') === ''} onClick={() => grade.mutate({ id: s.id, marks: Number(marks[s.id]) })}>
                    {s.gradedAt ? 'Regrade' : 'Grade'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {errorText(grade.error) ? <p className="text-xs text-destructive">{errorText(grade.error)}</p> : null}
      </DialogContent>
    </Dialog>
  );
}
