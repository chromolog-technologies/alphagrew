/** Students: materials and assignments of the subjects they take; submit text and/or a file. */
import { useEffect, useState } from 'react';
import { ApiError } from '../../api/apiError';
import { lmsApi, useLmsMutation, useLmsSubject, useMyLmsSubjects, type LmsAssignment } from '../../api/lmsApi';
import { Alert, AlertDescription, Badge, Button, Card, Select, Skeleton } from '../ui';

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

export function StudentLmsView() {
  const subjects = useMyLmsSubjects();
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const content = useLmsSubject(subjectId);

  useEffect(() => {
    if (subjectId === null && subjects.data && subjects.data.length > 0) setSubjectId(subjects.data[0].id);
  }, [subjects.data, subjectId]);

  if (subjects.isLoading) return <Skeleton className="h-40 w-full" />;
  if (subjects.error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{subjects.error instanceof ApiError ? subjects.error.message : 'Your subjects could not be loaded.'}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Materials &amp; assignments</h1>
          <p className="text-sm text-muted-foreground">Shared by your faculty for the subjects you take.</p>
        </div>
        <Select aria-label="Subject" value={subjectId ?? ''} onChange={(e) => setSubjectId(Number(e.target.value))} className="md:w-80">
          {(subjects.data ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.code} · {s.name} {s.openAssignments ? `(${s.openAssignments} open)` : ''}
            </option>
          ))}
        </Select>
      </div>

      {(subjects.data ?? []).length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">No subjects found for your department and year.</Card>
      ) : content.isLoading || !content.data ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-2 p-4">
            <h2 className="text-sm font-semibold">Materials</h2>
            {content.data.materials.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing shared yet.</p>
            ) : (
              <ul className="space-y-2" aria-label="Materials">
                {content.data.materials.map((m) => (
                  <li key={m.id} className="flex items-start justify-between gap-2 rounded-md border border-border p-2 text-sm">
                    <div>
                      <p className="font-medium">{m.title}</p>
                      {m.description ? <p className="text-xs text-muted-foreground">{m.description}</p> : null}
                    </div>
                    {m.hasFile ? (
                      <Button type="button" size="sm" variant="outline" onClick={() => lmsApi.open('material', m.id)}>
                        Open
                      </Button>
                    ) : m.linkUrl ? (
                      <a className="text-sm text-primary underline" href={m.linkUrl} target="_blank" rel="noreferrer">
                        Link
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card className="space-y-2 p-4">
            <h2 className="text-sm font-semibold">Assignments</h2>
            {content.data.assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No assignments.</p>
            ) : (
              content.data.assignments.map((a) => <AssignmentCard key={a.id} assignment={a} />)
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function AssignmentCard({ assignment: a }: { assignment: LmsAssignment }) {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const submit = useLmsMutation(() => lmsApi.submit(a.id, { textAnswer: text.trim() || undefined, file }));
  const mine = a.mySubmission;
  const canSubmit = (a.isOpen || a.allowLate) && !mine?.gradedAt;

  return (
    <div className="space-y-2 rounded-md border border-border p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{a.title}</p>
        {mine?.gradedAt ? (
          <Badge variant="success">
            {mine.marks}/{a.maxMarks}
          </Badge>
        ) : mine ? (
          <Badge variant={mine.isLate ? 'warning' : 'info'}>{mine.isLate ? 'Submitted late' : 'Submitted'}</Badge>
        ) : (
          <Badge variant={a.isOpen ? 'secondary' : 'destructive'}>{a.isOpen ? 'Open' : 'Closed'}</Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Due {when(a.dueAt)} · {a.maxMarks} marks{a.allowLate ? ' · late work accepted' : ''}
      </p>
      {a.instructions ? <p className="whitespace-pre-line">{a.instructions}</p> : null}
      {mine?.feedback ? <p className="rounded bg-muted/50 p-2 text-xs">Feedback: {mine.feedback}</p> : null}
      {canSubmit ? (
        <div className="space-y-2">
          <textarea
            aria-label={`Answer for ${a.title}`}
            className="w-full rounded-md border border-border p-2 text-sm"
            rows={3}
            placeholder={mine?.textAnswer ?? 'Your answer (or attach a file)'}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex items-center justify-between gap-2">
            <input type="file" aria-label={`File for ${a.title}`} onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-xs" />
            <Button type="button" size="sm" disabled={submit.isPending || (!text.trim() && !file)} onClick={() => submit.mutate(undefined)}>
              {mine ? 'Resubmit' : 'Submit'}
            </Button>
          </div>
          {submit.error ? <p className="text-xs text-destructive">{submit.error instanceof ApiError ? submit.error.message : 'Could not submit.'}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
