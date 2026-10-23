import React, { useEffect, useMemo, useState } from 'react';
import { Save, Send } from 'lucide-react';
import { marksApi, type EntrySheet, type EntryStudent, type Exam, type Semester } from '../../api/marksApi';
import {
  Card,
  EmptyState,
  Notice,
  SemesterSelect,
  StatusBadge,
  errorText,
  inputClass,
  primaryButton,
  secondaryButton,
  selectClass,
  toNumberOrNull,
} from './marksUi';

interface MarksEntryPanelProps {
  semesters: Semester[];
  semesterId: number | '';
  onSemesterChange: (semesterId: number | '') => void;
}

type RowDraft = { internal: string; external: string; extra: string; absent: boolean };

const editableStatuses = new Set(['new', 'draft']);

function toDraft(student: EntryStudent): RowDraft {
  return {
    internal: student.internal_marks?.toString() ?? '',
    external: student.external_marks?.toString() ?? '',
    extra: student.extra_marks ? student.extra_marks.toString() : '',
    absent: student.is_absent,
  };
}

/**
 * Step 2: faculty enter marks for one exam. Saving keeps entries as drafts; submitting sends every
 * draft of the exam and subject to review. Submitted entries are read-only until a reviewer rejects them.
 */
export const MarksEntryPanel: React.FC<MarksEntryPanelProps> = ({ semesters, semesterId, onSemesterChange }) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [examId, setExamId] = useState<number | ''>('');
  const [sheet, setSheet] = useState<EntrySheet | null>(null);
  const [drafts, setDrafts] = useState<Record<number, RowDraft>>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setExams([]);
    setExamId('');
    setSheet(null);
    if (!semesterId) return;
    marksApi
      .exams(semesterId)
      .then(setExams)
      .catch((loadError) => setError(errorText(loadError, 'Unable to load exams.')));
  }, [semesterId]);

  const exam = exams.find((item) => item.id === examId) ?? null;

  const loadSheet = async (selected: Exam) => {
    setError('');
    setSuccess('');
    try {
      const loaded = await marksApi.entrySheet(selected.id, selected.subject_id);
      setSheet(loaded);
      setDrafts(Object.fromEntries(loaded.students.map((student) => [student.id, toDraft(student)])));
    } catch (loadError) {
      // 422 here means the subject has no mark scheme for this semester yet.
      setSheet(null);
      setError(errorText(loadError, 'Unable to load students for this exam.'));
    }
  };

  useEffect(() => {
    setSheet(null);
    if (exam) void loadSheet(exam);
  }, [examId]);

  const scheme = sheet?.mark_scheme;
  const rowErrors = useMemo(() => {
    const errors: Record<number, string> = {};
    if (!scheme) return errors;
    Object.entries(drafts).forEach(([id, draft]) => {
      if (draft.absent) return;
      const internal = toNumberOrNull(draft.internal);
      const external = toNumberOrNull(draft.external);
      const extra = toNumberOrNull(draft.extra);
      if (internal !== null && internal > scheme.internal_marks) errors[Number(id)] = `Internal is out of ${scheme.internal_marks}`;
      else if (external !== null && external > scheme.external_marks) errors[Number(id)] = `External is out of ${scheme.external_marks}`;
      else if (extra !== null && extra > scheme.extra_marks_allowed) errors[Number(id)] = `Extra marks allowed: ${scheme.extra_marks_allowed}`;
    });
    return errors;
  }, [drafts, scheme]);

  const editableStudents = sheet?.students.filter((student) => editableStatuses.has(student.status)) ?? [];
  const draftCount = sheet?.students.filter((student) => student.status === 'draft').length ?? 0;
  const hasRowErrors = Object.keys(rowErrors).length > 0;

  const updateDraft = (studentId: number, patch: Partial<RowDraft>) =>
    setDrafts((current) => ({ ...current, [studentId]: { ...current[studentId], ...patch } }));

  const saveDraft = async () => {
    if (!sheet || !exam || !scheme) return;
    // Only rows with something entered are saved, so untouched students stay "Not entered".
    const marks = editableStudents
      .map((student) => ({ student, draft: drafts[student.id] }))
      .filter(({ draft }) => draft.absent || draft.internal !== '' || draft.external !== '' || draft.extra !== '')
      .map(({ student, draft }) => ({
        student_id: student.id,
        exam_id: exam.id,
        subject_id: exam.subject_id,
        mark_scheme_id: scheme.id,
        internal_marks: draft.absent ? null : toNumberOrNull(draft.internal),
        external_marks: draft.absent ? null : toNumberOrNull(draft.external),
        extra_marks: draft.absent ? null : toNumberOrNull(draft.extra),
        is_absent: draft.absent,
      }));

    if (marks.length === 0) {
      setError('Enter marks for at least one student, or mark them absent.');
      return;
    }

    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await marksApi.saveDraft(marks);
      await loadSheet(exam);
      setSuccess(`Saved ${marks.length} ${marks.length === 1 ? 'entry' : 'entries'} as draft.`);
    } catch (saveError) {
      setError(errorText(saveError, 'Unable to save the marks.'));
    } finally {
      setBusy(false);
    }
  };

  const submitForReview = async () => {
    if (!exam) return;
    if (!window.confirm(`Submit ${draftCount} draft ${draftCount === 1 ? 'entry' : 'entries'} for review? You can't edit them after this unless a reviewer sends them back.`)) {
      return;
    }
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const result = await marksApi.submit(exam.id, exam.subject_id);
      await loadSheet(exam);
      setSuccess(`Submitted ${result.submitted_count} ${result.submitted_count === 1 ? 'entry' : 'entries'} for review.`);
    } catch (submitError) {
      setError(errorText(submitError, 'Unable to submit the marks.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title="Enter marks"
      description="Save as you go. Submit when the whole class is entered; reviewers can send entries back with a reason."
      action={
        <div className="flex flex-wrap items-end gap-3">
          <SemesterSelect id="entry-semester" semesters={semesters} value={semesterId} onChange={onSemesterChange} />
          <div className="flex min-w-[220px] flex-col gap-1.5">
            <label htmlFor="entry-exam" className="text-sm font-semibold text-[#123a66]">Exam</label>
            <select
              id="entry-exam"
              value={examId}
              disabled={!semesterId}
              onChange={(event) => setExamId(event.target.value ? Number(event.target.value) : '')}
              className={selectClass}
            >
              <option value="">{semesterId && exams.length === 0 ? 'No exams scheduled' : 'Choose an exam'}</option>
              {exams.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.subject?.code ? `${item.subject.code} · ` : ''}
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {error ? <Notice tone="error">{error}</Notice> : null}
        {success ? <Notice tone="success">{success}</Notice> : null}

        {!semesterId ? (
          <EmptyState>Choose a semester and an exam to start entering marks.</EmptyState>
        ) : exams.length === 0 ? (
          <EmptyState>No exams are scheduled for this semester yet. The exam coordinator schedules exams.</EmptyState>
        ) : !sheet || !scheme ? (
          error ? null : <EmptyState>Choose an exam to load its students.</EmptyState>
        ) : (
          <>
            <p className="text-sm text-[#4d6d8f]">
              {sheet.exam.subject?.name ?? 'Subject'}: internal out of {scheme.internal_marks}, external out of{' '}
              {scheme.external_marks}
              {scheme.extra_marks_allowed ? `, up to ${scheme.extra_marks_allowed} extra` : ''}. Pass mark {scheme.pass_mark}.
            </p>
            <div className="overflow-x-auto rounded-[16px] border border-slate-100">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    <th className="px-3 py-3">Student</th>
                    <th className="px-3 py-3">Internal</th>
                    <th className="px-3 py-3">External</th>
                    <th className="px-3 py-3">Extra</th>
                    <th className="px-3 py-3">Absent</th>
                    <th className="px-3 py-3 text-right">Total · Grade</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sheet.students.map((student) => {
                    const draft = drafts[student.id] ?? toDraft(student);
                    const editable = editableStatuses.has(student.status);
                    const rowError = rowErrors[student.id];
                    return (
                      <tr key={student.id} className="border-t border-slate-100 align-top">
                        <td className="px-3 py-2.5">
                          <p className="font-semibold text-[#0a2342]">{student.name}</p>
                          <p className="font-mono text-xs text-slate-500">{student.registration_number}</p>
                          {rowError ? <p className="mt-1 text-xs text-red-700">{rowError}</p> : null}
                        </td>
                        {(['internal', 'external', 'extra'] as const).map((field) => (
                          <td key={field} className="px-3 py-2.5">
                            <input
                              type="number"
                              min={0}
                              step="0.5"
                              aria-label={`${field} marks for ${student.name}`}
                              value={draft.absent ? '' : draft[field]}
                              disabled={!editable || draft.absent}
                              onChange={(event) => updateDraft(student.id, { [field]: event.target.value })}
                              aria-invalid={rowError ? true : undefined}
                              className={`${inputClass} w-24 tabular-nums`}
                            />
                          </td>
                        ))}
                        <td className="px-3 py-2.5">
                          <input
                            type="checkbox"
                            aria-label={`${student.name} was absent`}
                            checked={draft.absent}
                            disabled={!editable}
                            onChange={(event) => updateDraft(student.id, { absent: event.target.checked })}
                            className="mt-3 h-5 w-5 accent-[#0b4d88]"
                          />
                        </td>
                        <td className="px-3 py-2.5 pt-4 text-right tabular-nums">
                          {student.total_marks ?? '—'}
                          {student.grade ? ` · ${student.grade}` : ''}
                        </td>
                        <td className="px-3 py-2.5 pt-3.5">
                          <StatusBadge status={student.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[#4d6d8f]">
                {editableStudents.length} editable · {draftCount} saved as draft · totals and grades update after saving
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={saveDraft} disabled={busy || hasRowErrors || editableStudents.length === 0} className={secondaryButton}>
                  <Save size={16} aria-hidden="true" />
                  Save draft
                </button>
                <button type="button" onClick={submitForReview} disabled={busy || hasRowErrors || draftCount === 0} className={primaryButton}>
                  <Send size={16} aria-hidden="true" />
                  Submit for review
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
};
