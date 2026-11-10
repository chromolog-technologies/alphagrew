import React, { useEffect, useMemo, useState } from 'react';
import { Save, Send } from 'lucide-react';
import { ApiError } from '../../api/http';
import {
  useMyExams,
  useRoster,
  useSaveDraft,
  useSubmitMarks,
  type DraftRow,
  type MyExam,
  type RosterScheme,
  type RosterStudent,
} from '../../api/markEntryApi';
import { Card, EmptyState, Notice, StatusBadge, inputClass, primaryButton, secondaryButton, selectClass } from './marksUi';

type Field = 'internal' | 'external' | 'extra';
type RowInput = Record<Field, string> & { absent: boolean };

const FIELDS: { key: Field; label: string; max: (scheme: RosterScheme) => number }[] = [
  { key: 'internal', label: 'Internal', max: (scheme) => scheme.internalMax },
  { key: 'external', label: 'External', max: (scheme) => scheme.externalMax },
  { key: 'extra', label: 'Extra', max: (scheme) => scheme.extraMarksAllowed },
];

const isEditable = (student: RosterStudent) => !student.entry || student.entry.status === 'draft';

function toInput(student: RosterStudent): RowInput {
  const entry = student.entry;
  const text = (value: number | null | undefined) => (value === null || value === undefined ? '' : String(Number(value)));
  return {
    internal: text(entry?.internalMarks),
    external: text(entry?.externalMarks),
    extra: entry?.extraMarks ? text(entry.extraMarks) : '',
    absent: entry?.isAbsent ?? false,
  };
}

const number = (value: string) => (value.trim() === '' ? null : Number(value));
const sameInput = (a: RowInput, b: RowInput) =>
  a.absent === b.absent && a.internal === b.internal && a.external === b.external && a.extra === b.extra;

/** The first problem with a row, checked against the mark scheme before anything is sent. */
function rowProblem(input: RowInput, scheme: RosterScheme): string | null {
  if (input.absent) return null;
  for (const field of FIELDS) {
    const value = number(input[field.key]);
    if (value === null) continue;
    if (Number.isNaN(value) || value < 0) return `${field.label} must be a number of 0 or more.`;
    if (value > field.max(scheme)) {
      return field.max(scheme) === 0 ? 'No extra marks are allowed for this subject.' : `${field.label} is out of ${field.max(scheme)}.`;
    }
  }
  return null;
}

const isComplete = (input: RowInput) => input.absent || (input.internal.trim() !== '' && input.external.trim() !== '');

function examLabel(exam: MyExam) {
  const date = exam.exam_date ? new Date(exam.exam_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '';
  return `${exam.subject?.code ?? ''} · ${exam.name}${date ? ` · ${date}` : ''}`;
}

/** Exams grouped by semester, the current semester first, newest exams first within each. */
function groupBySemester(exams: MyExam[]) {
  const groups = new Map<number, { name: string; active: boolean; exams: MyExam[] }>();
  [...exams]
    .sort((a, b) => b.exam_date.localeCompare(a.exam_date))
    .forEach((exam) => {
      const group = groups.get(exam.semester_id) ?? { name: exam.semester?.name ?? `Semester ${exam.semester_id}`, active: Boolean(exam.semester?.is_active), exams: [] };
      group.exams.push(exam);
      groups.set(exam.semester_id, group);
    });
  return [...groups.values()].sort((a, b) => Number(b.active) - Number(a.active));
}

/** The exam to open first: the most recent conducted exam of the current semester. */
function defaultExam(exams: MyExam[]): MyExam | null {
  const groups = groupBySemester(exams);
  const current = groups[0]?.exams ?? [];
  return current.find((exam) => exam.status === 'conducted') ?? current[0] ?? null;
}

/**
 * Faculty mark entry on the results workflow. A teacher sees the exams of the subjects allocated to
 * them, enters internal and external marks (or marks a student absent), saves drafts as often as they
 * like, then submits the whole class for review. Submitted marks are read-only unless a reviewer sends
 * them back.
 */
export const TeacherMarkEntry: React.FC = () => {
  const exams = useMyExams();
  const [examId, setExamId] = useState<number | null>(null);
  const exam = exams.data?.find((item) => item.id === examId) ?? null;
  const roster = useRoster(exam);
  const saveDraft = useSaveDraft(exam);
  const submit = useSubmitMarks(exam);

  const [inputs, setInputs] = useState<Record<number, RowInput>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (examId === null && exams.data?.length) setExamId(defaultExam(exams.data)?.id ?? null);
  }, [exams.data, examId]);

  // Reset the form whenever a roster (re)loads: after switching exams, saving or submitting.
  useEffect(() => {
    if (!roster.data) return;
    setInputs(Object.fromEntries(roster.data.students.map((student) => [student.id, toInput(student)])));
    setConfirmed(false);
  }, [roster.data]);

  const students = roster.data?.students ?? [];
  const scheme = roster.data?.markScheme;
  const editable = students.filter(isEditable);

  const summary = useMemo(() => {
    const problems: Record<number, string> = {};
    let changed = 0;
    let incomplete = 0;
    for (const student of editable) {
      const input = inputs[student.id];
      if (!input || !scheme) continue;
      const problem = rowProblem(input, scheme);
      if (problem) problems[student.id] = problem;
      if (!sameInput(input, toInput(student))) changed += 1;
      if (!isComplete(input)) incomplete += 1;
    }
    const drafts = students.filter((student) => student.entry?.status === 'draft').length;
    return { problems, changed, incomplete, drafts };
  }, [inputs, editable, students, scheme]);

  const busy = saveDraft.isPending || submit.isPending;
  const hasProblems = Object.keys(summary.problems).length > 0;

  const update = (studentId: number, patch: Partial<RowInput>) => {
    setMessage(null);
    setInputs((current) => ({ ...current, [studentId]: { ...current[studentId], ...patch } }));
  };

  const handleSave = () => {
    // Untouched blank rows are skipped, so those students stay "Not entered".
    const rows: DraftRow[] = editable
      .filter((student) => {
        const input = inputs[student.id];
        return input && !sameInput(input, toInput(student)) && (student.entry || input.absent || input.internal || input.external || input.extra);
      })
      .map((student) => {
        const input = inputs[student.id];
        return {
          studentId: student.id,
          internalMarks: input.absent ? null : number(input.internal),
          externalMarks: input.absent ? null : number(input.external),
          extraMarks: input.absent ? null : number(input.extra),
          isAbsent: input.absent,
        };
      });

    if (rows.length === 0) {
      setMessage({ tone: 'error', text: 'There are no changes to save.' });
      return;
    }

    saveDraft.mutate(rows, {
      onSuccess: (response) =>
        setMessage({ tone: 'success', text: `Saved ${response.data.savedCount} ${response.data.savedCount === 1 ? 'student' : 'students'} as draft.` }),
      onError: (error) => setMessage({ tone: 'error', text: error instanceof ApiError ? error.message : 'The marks could not be saved.' }),
    });
  };

  const handleSubmit = () => {
    submit.mutate(undefined, {
      onSuccess: (response) =>
        setMessage({
          tone: 'success',
          text: `Submitted ${response.data.submittedCount} ${response.data.submittedCount === 1 ? 'entry' : 'entries'} for review. They are read-only until a reviewer approves them or sends them back.`,
        }),
      onError: (error) => setMessage({ tone: 'error', text: error instanceof ApiError ? error.message : 'The marks could not be submitted.' }),
    });
  };

  const submitBlocker = summary.changed > 0
    ? 'Save your changes before submitting.'
    : summary.incomplete > 0
      ? `${summary.incomplete} ${summary.incomplete === 1 ? 'student has' : 'students have'} no marks yet. Enter both internal and external marks, or mark them absent.`
      : summary.drafts === 0
        ? null
        : !confirmed
          ? 'Confirm the declaration to submit.'
          : null;

  if (exams.isPending) return <EmptyState>Loading your exams…</EmptyState>;
  if (exams.isError) return <Notice tone="error">{exams.error instanceof ApiError ? exams.error.message : 'Your exams could not be loaded.'}</Notice>;
  if (!exams.data?.length) {
    return (
      <EmptyState>
        No exams to enter marks for. You see the exams of subjects allocated to you; ask your HOD or the academic office if a subject is missing.
      </EmptyState>
    );
  }

  return (
    <Card
      title="Enter marks"
      description="Save drafts as you go. When the whole class is entered, submit it for department review."
      action={
        <div className="flex min-w-[280px] flex-col gap-1.5">
          <label htmlFor="mark-entry-exam" className="text-sm font-semibold text-[#123a66]">Exam</label>
          <select
            id="mark-entry-exam"
            value={examId ?? ''}
            onChange={(event) => {
              setMessage(null);
              setExamId(event.target.value ? Number(event.target.value) : null);
            }}
            className={selectClass}
          >
            {groupBySemester(exams.data).map((group) => (
              <optgroup key={group.name} label={group.active ? `${group.name} (current)` : group.name}>
                {group.exams.map((item) => (
                  <option key={item.id} value={item.id}>{examLabel(item)}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      }
    >
      <div className="space-y-4">
        {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}

        {roster.isPending ? (
          <EmptyState>Loading the class list…</EmptyState>
        ) : roster.isError ? (
          <Notice tone="error">{roster.error instanceof ApiError ? roster.error.message : 'The class list could not be loaded.'}</Notice>
        ) : !scheme ? null : students.length === 0 ? (
          <EmptyState>No students are enrolled for this subject.</EmptyState>
        ) : (
          <>
            <p className="text-sm text-[#4d6d8f]">
              <span className="font-semibold text-[#0a2342]">{roster.data.subject.code} {roster.data.subject.name}</span>: internal out of{' '}
              {scheme.internalMax} (pass {scheme.internalPass}), external out of {scheme.externalMax} (pass {scheme.externalPass}), total
              pass mark {scheme.totalPass} of {scheme.totalMax}
              {scheme.extraMarksAllowed ? `. Up to ${scheme.extraMarksAllowed} extra marks allowed` : ''}.
            </p>

            <div className="overflow-x-auto rounded-[16px] border border-slate-100">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    <th className="px-3 py-3">Student</th>
                    {FIELDS.filter((field) => field.key !== 'extra' || scheme.extraMarksAllowed > 0).map((field) => (
                      <th key={field.key} className="px-3 py-3">{field.label} <span className="font-normal normal-case tracking-normal">/ {field.max(scheme)}</span></th>
                    ))}
                    <th className="px-3 py-3">Absent</th>
                    <th className="px-3 py-3 text-right">Total</th>
                    <th className="px-3 py-3">Grade</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const input = inputs[student.id] ?? toInput(student);
                    const canEdit = isEditable(student);
                    const problem = summary.problems[student.id];
                    const changed = canEdit && !sameInput(input, toInput(student));
                    const total = input.absent
                      ? null
                      : FIELDS.reduce<number | null>((sum, field) => {
                          const value = number(input[field.key]);
                          return value === null || Number.isNaN(value) ? sum : (sum ?? 0) + value;
                        }, null);
                    return (
                      <tr key={student.id} className={`border-t border-slate-100 align-top ${changed ? 'bg-[#fffbeb]' : ''}`}>
                        <td className="px-3 py-2.5">
                          <p className="font-semibold text-[#0a2342]">{student.name}</p>
                          <p className="font-mono text-xs text-slate-500">{student.registrationNumber}</p>
                          {problem ? <p className="mt-1 text-xs text-red-700" role="alert">{problem}</p> : null}
                        </td>
                        {FIELDS.filter((field) => field.key !== 'extra' || scheme.extraMarksAllowed > 0).map((field) => (
                          <td key={field.key} className="px-3 py-2.5">
                            <input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              max={field.max(scheme)}
                              step="0.5"
                              aria-label={`${field.label} marks for ${student.name}`}
                              value={input.absent ? '' : input[field.key]}
                              disabled={!canEdit || input.absent || busy}
                              onChange={(event) => update(student.id, { [field.key]: event.target.value })}
                              aria-invalid={problem ? true : undefined}
                              className={`${inputClass} w-24 tabular-nums`}
                            />
                          </td>
                        ))}
                        <td className="px-3 py-2.5">
                          <input
                            type="checkbox"
                            aria-label={`${student.name} was absent`}
                            checked={input.absent}
                            disabled={!canEdit || busy}
                            onChange={(event) => update(student.id, { absent: event.target.checked })}
                            className="mt-3 h-5 w-5 accent-[#0b4d88]"
                          />
                        </td>
                        <td className="px-3 py-2.5 pt-4 text-right tabular-nums">
                          {input.absent ? 'Absent' : total === null ? '—' : `${total} / ${scheme.totalMax}`}
                        </td>
                        <td className="px-3 py-2.5 pt-4">
                          {changed ? <span className="text-xs text-slate-500">After saving</span> : student.entry?.grade ?? '—'}
                        </td>
                        <td className="px-3 py-2.5 pt-3.5">
                          <StatusBadge status={student.entry?.status ?? 'new'} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {editable.length === 0 ? (
              <Notice>
                All marks for this exam have been submitted. They can be changed again only if a reviewer sends them back.
              </Notice>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-[#4d6d8f]">
                  {summary.changed > 0 ? `${summary.changed} unsaved ${summary.changed === 1 ? 'change' : 'changes'} · ` : ''}
                  {summary.drafts} saved as draft · {summary.incomplete} not entered yet. Grades are worked out when you save.
                </p>

                {summary.drafts > 0 && summary.changed === 0 && summary.incomplete === 0 ? (
                  <label className="flex items-start gap-2 text-sm text-[#123a66]">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(event) => setConfirmed(event.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-[#0b4d88]"
                    />
                    I confirm these marks are complete and correct. After submitting I can't change them unless a reviewer sends them back.
                  </label>
                ) : null}

                <div className="flex flex-wrap items-center justify-end gap-2">
                  {submitBlocker && summary.drafts > 0 ? <p className="mr-auto text-sm text-[#8a4b00]">{submitBlocker}</p> : null}
                  <button type="button" onClick={handleSave} disabled={busy || hasProblems || summary.changed === 0} className={secondaryButton}>
                    <Save size={16} aria-hidden="true" />
                    {saveDraft.isPending ? 'Saving…' : 'Save draft'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={busy || summary.drafts === 0 || submitBlocker !== null}
                    className={primaryButton}
                  >
                    <Send size={16} aria-hidden="true" />
                    {submit.isPending ? 'Submitting…' : 'Submit for review'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
};
