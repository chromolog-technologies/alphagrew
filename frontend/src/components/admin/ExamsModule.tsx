/**
 * Exams: scheduled by admins and exam coordinators, read-only for everyone else. Exams are what
 * faculty enter marks against (Marks → Enter Marks), so once marks exist an exam's subject and
 * semester are fixed and it can only be cancelled, not deleted.
 */
import { useMemo, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Clock, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { ApiError } from '../../api/apiError';
import { apiCall, semesterApi } from '../../api/apiClient';
import {
  EXAM_MODES,
  EXAM_STATUSES,
  useDeleteExam,
  useExamTypes,
  useExams,
  useSaveExam,
  type Exam,
  type ExamMode,
  type ExamStatus,
} from '../../api/examsApi';
import { useRecordCustomFields } from '../../hooks/useRecordCustomFields';
import { CustomFieldInputs } from '../shared/CustomFieldInputs';
import {
  Alert,
  AlertDescription,
  Badge,
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

type Draft = {
  id: number | null;
  name: string;
  subjectId: string;
  semesterId: string;
  examTypeId: string;
  examDate: string;
  startTime: string;
  endTime: string;
  location: string;
  maxMarks: string;
  examMode: ExamMode;
  status: ExamStatus;
  hasMarks: boolean;
};

const emptyDraft: Draft = {
  id: null, name: '', subjectId: '', semesterId: '', examTypeId: '', examDate: '', startTime: '10:00', endTime: '12:00',
  location: '', maxMarks: '100', examMode: 'offline', status: 'scheduled', hasMarks: false,
};

const statusVariant: Record<ExamStatus, 'info' | 'success' | 'warning' | 'secondary'> = {
  scheduled: 'info',
  conducted: 'success',
  postponed: 'warning',
  cancelled: 'secondary',
};

/** Lists may come as an array or inside `{ data }` (older endpoints). */
const asList = (response: unknown): Option[] =>
  (Array.isArray(response) ? response : Array.isArray((response as { data?: unknown })?.data) ? (response as { data: Option[] }).data : []) as Option[];

const day = (iso: string) => iso.slice(0, 10);

export function ExamsModule({ canManage = true }: { canManage?: boolean }) {
  const exams = useExams();
  const types = useExamTypes();
  const subjects = useQuery({ queryKey: ['subjects', 'options'], queryFn: () => apiCall('/subjects').then(asList) });
  const semesters = useQuery({ queryKey: ['semesters', 'options'], queryFn: () => semesterApi.list().then(asList) });
  const save = useSaveExam();
  const remove = useDeleteExam();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ExamStatus | ''>('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<Exam | null>(null);
  const customFields = useRecordCustomFields('exam', draft?.id ?? null, draft !== null);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (exams.data ?? []).filter(
      (exam) =>
        (!statusFilter || exam.status === statusFilter) &&
        (!term || exam.name.toLowerCase().includes(term) || (exam.subject?.name ?? '').toLowerCase().includes(term) || (exam.subject?.code ?? '').toLowerCase().includes(term)),
    );
  }, [exams.data, search, statusFilter]);

  const fieldErrors = save.error instanceof ApiError ? save.error.firstFieldErrors : {};
  const formError = save.error instanceof ApiError && Object.keys(fieldErrors).length === 0 ? save.error.message : save.error && !(save.error instanceof ApiError) ? 'The exam could not be saved.' : null;

  const openCreate = () => {
    save.reset();
    setDraft({ ...emptyDraft });
  };

  const openEdit = (exam: Exam) => {
    save.reset();
    setDraft({
      id: exam.id,
      name: exam.name,
      subjectId: String(exam.subject_id),
      semesterId: String(exam.semester_id),
      examTypeId: String(exam.exam_type_id),
      examDate: day(exam.exam_date),
      startTime: exam.start_time,
      endTime: exam.end_time,
      location: exam.location ?? '',
      maxMarks: String(exam.max_marks),
      examMode: exam.exam_mode,
      status: exam.status,
      hasMarks: (exam.mark_entries_count ?? 0) > 0,
    });
  };

  // Picking an exam type fills in its usual maximum marks for a new exam.
  const pickType = (examTypeId: string) => {
    if (!draft) return;
    const type = types.data?.find((t) => String(t.id) === examTypeId);
    setDraft({ ...draft, examTypeId, maxMarks: draft.id === null && type ? String(type.max_marks) : draft.maxMarks });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    save.mutate(
      {
        id: draft.id,
        input: {
          name: draft.name.trim(),
          subjectId: Number(draft.subjectId),
          semesterId: Number(draft.semesterId),
          examTypeId: Number(draft.examTypeId),
          examDate: draft.examDate,
          startTime: draft.startTime,
          endTime: draft.endTime,
          location: draft.location.trim() || null,
          maxMarks: Number(draft.maxMarks),
          examMode: draft.examMode,
          status: draft.status,
          ...customFields.payload(),
        },
      },
      {
        onSuccess: () => setDraft(null),
        onError: (error) => customFields.captureErrors(error),
      },
    );
  };

  const error = (field: string) => (fieldErrors[field] ? <p className="text-xs text-destructive">{fieldErrors[field]}</p> : null);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Exams</h1>
          <p className="text-sm text-muted-foreground">
            {canManage ? 'Schedule exams. Faculty enter marks against them under Marks.' : 'Scheduled exams. Exam coordinators and admins manage them.'}
          </p>
        </div>
        {canManage ? (
          <Button type="button" onClick={openCreate} className="gap-1.5">
            <Plus size={16} /> Schedule exam
          </Button>
        ) : null}
      </div>

      <Card className="p-4">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input aria-label="Search exams" placeholder="Search by exam or subject…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
          </div>
          <Select aria-label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ExamStatus | '')} className="sm:w-44">
            <option value="">All statuses</option>
            {EXAM_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>

        {exams.isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : exams.error ? (
          <Alert variant="destructive">
            <AlertDescription>{exams.error instanceof ApiError ? exams.error.message : 'Exams could not be loaded.'}</AlertDescription>
          </Alert>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {search || statusFilter ? 'No exams match these filters.' : 'No exams scheduled yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exam</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date &amp; time</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead>Max marks</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage ? <TableHead className="text-right">Actions</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((exam) => (
                  <TableRow key={exam.id}>
                    <TableCell className="font-medium">
                      {exam.name}
                      {(exam.mark_entries_count ?? 0) > 0 ? <span className="block text-2xs text-muted-foreground">{exam.mark_entries_count} marks entered</span> : null}
                    </TableCell>
                    <TableCell>{exam.subject ? `${exam.subject.code} · ${exam.subject.name}` : '—'}</TableCell>
                    <TableCell>{exam.exam_type?.name ?? '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={13} aria-hidden="true" /> {day(exam.exam_date)}
                      </span>
                      <span className="ml-3 inline-flex items-center gap-1">
                        <Clock size={13} aria-hidden="true" /> {exam.start_time}–{exam.end_time}
                      </span>
                    </TableCell>
                    <TableCell>{exam.location || '—'}</TableCell>
                    <TableCell>{exam.max_marks}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[exam.status] ?? 'secondary'}>{EXAM_STATUSES.find((s) => s.value === exam.status)?.label ?? exam.status}</Badge>
                    </TableCell>
                    {canManage ? (
                      <TableCell className="text-right">
                        <Button type="button" variant="ghost" size="icon" aria-label={`Edit ${exam.name}`} onClick={() => openEdit(exam)}>
                          <Pencil size={14} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${exam.name}`}
                          onClick={() => {
                            remove.reset();
                            setDeleting(exam);
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
          </div>
        )}
      </Card>

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-w-2xl">
          {draft ? (
            <form onSubmit={submit}>
              <DialogHeader>
                <DialogTitle>{draft.id === null ? 'Schedule exam' : `Edit “${draft.name}”`}</DialogTitle>
                <DialogDescription>
                  {draft.hasMarks ? 'Marks have been entered for this exam, so its subject and semester cannot change.' : 'Faculty enter marks against this exam once it is conducted.'}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="exam-name">Name *</Label>
                  <Input id="exam-name" required maxLength={255} placeholder="e.g. DBMS Mid Term 1" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                  {error('name')}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="exam-subject">Subject *</Label>
                  <Select id="exam-subject" required disabled={draft.hasMarks} value={draft.subjectId} onChange={(e) => setDraft({ ...draft, subjectId: e.target.value })}>
                    <option value="">Choose a subject</option>
                    {(subjects.data ?? []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code ? `${s.code} · ${s.name}` : s.name}
                      </option>
                    ))}
                  </Select>
                  {error('subjectId')}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="exam-semester">Semester *</Label>
                  <Select id="exam-semester" required disabled={draft.hasMarks} value={draft.semesterId} onChange={(e) => setDraft({ ...draft, semesterId: e.target.value })}>
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
                  <Label htmlFor="exam-type">Exam type *</Label>
                  <Select id="exam-type" required value={draft.examTypeId} onChange={(e) => pickType(e.target.value)}>
                    <option value="">Choose a type</option>
                    {(types.data ?? []).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                  {error('examTypeId')}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="exam-max">Maximum marks *</Label>
                  <Input id="exam-max" type="number" min={1} max={1000} required value={draft.maxMarks} onChange={(e) => setDraft({ ...draft, maxMarks: e.target.value })} />
                  {error('maxMarks')}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="exam-date">Date *</Label>
                  <Input id="exam-date" type="date" required value={draft.examDate} onChange={(e) => setDraft({ ...draft, examDate: e.target.value })} />
                  {error('examDate')}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="exam-start">Starts *</Label>
                    <Input id="exam-start" type="time" required value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} />
                    {error('startTime')}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="exam-end">Ends *</Label>
                    <Input id="exam-end" type="time" required value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} />
                    {error('endTime')}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="exam-location">Venue</Label>
                  <Input id="exam-location" maxLength={255} placeholder="Hall / room" value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
                  {error('location')}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="exam-mode">Mode</Label>
                    <Select id="exam-mode" value={draft.examMode} onChange={(e) => setDraft({ ...draft, examMode: e.target.value as ExamMode })}>
                      {EXAM_MODES.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="exam-status">Status</Label>
                    <Select id="exam-status" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as ExamStatus })}>
                      {EXAM_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <CustomFieldInputs definitions={customFields.fields} values={customFields.values} onChange={customFields.setValues} errors={customFields.errors} />
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
                  {save.isPending ? 'Saving…' : draft.id === null ? 'Schedule' : 'Save'}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete “{deleting?.name}”?</DialogTitle>
            <DialogDescription>
              {(deleting?.mark_entries_count ?? 0) > 0
                ? 'Marks have been entered for this exam, so it cannot be deleted. Set its status to Cancelled instead.'
                : 'The exam is removed from the schedule and from mark entry.'}
            </DialogDescription>
          </DialogHeader>
          {remove.error ? (
            <Alert variant="destructive">
              <AlertDescription>{remove.error instanceof ApiError ? remove.error.message : 'The exam could not be deleted.'}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={remove.isPending || (deleting?.mark_entries_count ?? 0) > 0}
              onClick={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
            >
              {remove.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
