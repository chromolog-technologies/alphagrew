/**
 * Class timetables: pick a class, see its week, add / edit / remove sessions. The server refuses
 * clashes (same class, faculty member or room at overlapping times on the same day). Students in
 * the class see it under Timetable.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { ApiError } from '../../api/apiError';
import { apiCall } from '../../api/apiClient';
import {
  DAYS,
  useClasses,
  useDeleteTimetable,
  useSaveTimetable,
  useTimetables,
  type DayOfWeek,
  type SessionType,
  type TimetableEntry,
} from '../../api/academicsApi';
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
} from '../ui';

type Option = { id: number; name: string; code?: string };
type Draft = {
  id: number | null;
  subjectId: string;
  facultyId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  roomNumber: string;
  sessionType: SessionType;
};

const SESSION_TYPES: SessionType[] = ['lecture', 'practical', 'lab', 'tutorial'];

const asList = (response: unknown): Option[] =>
  (Array.isArray(response) ? response : Array.isArray((response as { data?: unknown })?.data) ? (response as { data: Option[] }).data : []) as Option[];

export function TimetableModule({ canManage = true }: { canManage?: boolean }) {
  const classes = useClasses();
  const [classId, setClassId] = useState<number | null>(null);
  const timetable = useTimetables({ classId: classId ?? undefined }, classId !== null);
  const subjects = useQuery({ queryKey: ['subjects', 'options'], queryFn: () => apiCall('/subjects').then(asList) });
  const staff = useQuery({ queryKey: ['staff', 'options'], queryFn: () => apiCall('/staff').then(asList), enabled: canManage });
  const save = useSaveTimetable();
  const remove = useDeleteTimetable();
  const [draft, setDraft] = useState<Draft | null>(null);

  // Start on the first class.
  useEffect(() => {
    if (classId === null && classes.data && classes.data.length > 0) setClassId(classes.data[0].id);
  }, [classes.data, classId]);

  const fieldErrors = save.error instanceof ApiError ? save.error.firstFieldErrors : {};
  const formError = save.error instanceof ApiError && Object.keys(fieldErrors).length === 0 ? save.error.message : null;
  const error = (field: string) => (fieldErrors[field] ? <p className="text-xs text-destructive">{fieldErrors[field]}</p> : null);

  const open = (entry?: TimetableEntry, day: DayOfWeek = 'Monday') => {
    save.reset();
    setDraft(
      entry
        ? {
            id: entry.id, subjectId: String(entry.subjectId), facultyId: String(entry.facultyId), dayOfWeek: entry.dayOfWeek,
            startTime: entry.startTime, endTime: entry.endTime, roomNumber: entry.roomNumber ?? '', sessionType: entry.sessionType,
          }
        : { id: null, subjectId: '', facultyId: '', dayOfWeek: day, startTime: '09:00', endTime: '10:00', roomNumber: '', sessionType: 'lecture' },
    );
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft || classId === null) return;
    save.mutate(
      {
        id: draft.id,
        input: {
          classId,
          subjectId: Number(draft.subjectId),
          facultyId: Number(draft.facultyId),
          dayOfWeek: draft.dayOfWeek,
          startTime: draft.startTime,
          endTime: draft.endTime,
          roomNumber: draft.roomNumber.trim() || null,
          sessionType: draft.sessionType,
        },
      },
      { onSuccess: () => setDraft(null) },
    );
  };

  const byDay = (day: DayOfWeek) => (timetable.data ?? []).filter((e) => e.dayOfWeek === day);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Timetable</h1>
          <p className="text-sm text-muted-foreground">Weekly sessions per class. Students in the class see them under Timetable.</p>
        </div>
        <div className="flex gap-2">
          <Select aria-label="Class" value={classId ?? ''} onChange={(e) => setClassId(Number(e.target.value))} className="w-64">
            {(classes.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          {canManage && classId !== null ? (
            <Button type="button" onClick={() => open()} className="gap-1.5">
              <Plus size={16} /> Add session
            </Button>
          ) : null}
        </div>
      </div>

      {classes.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (classes.data ?? []).length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Create a class first (Academic → Classes).</Card>
      ) : timetable.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : timetable.error ? (
        <Alert variant="destructive">
          <AlertDescription>{timetable.error instanceof ApiError ? timetable.error.message : 'The timetable could not be loaded.'}</AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {DAYS.map((day) => (
            <Card key={day} className="p-3">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold">{day}</h2>
                {canManage ? (
                  <Button type="button" variant="ghost" size="sm" aria-label={`Add session on ${day}`} onClick={() => open(undefined, day)}>
                    <Plus size={14} />
                  </Button>
                ) : null}
              </div>
              {byDay(day).length === 0 ? (
                <p className="text-xs text-muted-foreground">No sessions.</p>
              ) : (
                <ul className="space-y-2" aria-label={`${day} sessions`}>
                  {byDay(day).map((e) => (
                    <li key={e.id} className="flex items-start justify-between gap-2 rounded-md border border-border p-2 text-sm">
                      <div>
                        <p className="font-medium">
                          {e.startTime}–{e.endTime} · {e.subject?.code}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {e.faculty?.name ?? 'TBA'} · {e.roomNumber ?? 'No room'} · {e.sessionType}
                        </p>
                      </div>
                      {canManage ? (
                        <div className="flex shrink-0">
                          <Button type="button" variant="ghost" size="icon" aria-label={`Edit ${e.subject?.code} ${day} ${e.startTime}`} onClick={() => open(e)}>
                            <Pencil size={13} />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${e.subject?.code} ${day} ${e.startTime}`} onClick={() => remove.mutate(e.id)}>
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={draft !== null} onOpenChange={(isOpen) => !isOpen && setDraft(null)}>
        <DialogContent className="max-w-lg">
          {draft ? (
            <form onSubmit={submit}>
              <DialogHeader>
                <DialogTitle>{draft.id === null ? 'Add session' : 'Edit session'}</DialogTitle>
                <DialogDescription>{classes.data?.find((c) => c.id === classId)?.name}</DialogDescription>
              </DialogHeader>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="tt-subject">Subject *</Label>
                  <Select id="tt-subject" required value={draft.subjectId} onChange={(e) => setDraft({ ...draft, subjectId: e.target.value })}>
                    <option value="">Choose…</option>
                    {(subjects.data ?? []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code ? `${s.code} · ${s.name}` : s.name}
                      </option>
                    ))}
                  </Select>
                  {error('subjectId')}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tt-faculty">Faculty *</Label>
                  <Select id="tt-faculty" required value={draft.facultyId} onChange={(e) => setDraft({ ...draft, facultyId: e.target.value })}>
                    <option value="">Choose…</option>
                    {(staff.data ?? []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                  {error('facultyId')}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tt-day">Day *</Label>
                  <Select id="tt-day" value={draft.dayOfWeek} onChange={(e) => setDraft({ ...draft, dayOfWeek: e.target.value as DayOfWeek })}>
                    {DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </Select>
                  {error('dayOfWeek')}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tt-type">Type</Label>
                  <Select id="tt-type" value={draft.sessionType} onChange={(e) => setDraft({ ...draft, sessionType: e.target.value as SessionType })}>
                    {SESSION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tt-start">Starts *</Label>
                  <Input id="tt-start" type="time" required value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} />
                  {error('startTime')}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tt-end">Ends *</Label>
                  <Input id="tt-end" type="time" required value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} />
                  {error('endTime')}
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="tt-room">Room</Label>
                  <Input id="tt-room" maxLength={50} value={draft.roomNumber} onChange={(e) => setDraft({ ...draft, roomNumber: e.target.value })} />
                  {error('roomNumber')}
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
    </div>
  );
}
