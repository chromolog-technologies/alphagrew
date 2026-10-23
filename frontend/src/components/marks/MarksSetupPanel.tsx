import React, { useEffect, useState, type FormEvent } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import { marksApi, type GradeRule, type MarkScheme, type Semester, type SubjectSummary } from '../../api/marksApi';
import {
  Card,
  EmptyState,
  Notice,
  SemesterSelect,
  dangerButton,
  errorText,
  inputClass,
  primaryButton,
  secondaryButton,
  selectClass,
} from './marksUi';

interface MarksSetupPanelProps {
  semesters: Semester[];
  semesterId: number | '';
  onSemesterChange: (semesterId: number | '') => void;
  canEdit: boolean;
}

const emptyScheme = { subject_id: '' as number | '', internal_marks: '40', external_marks: '60', pass_mark: '40', extra_marks_allowed: '0' };

/** Step 1: grade bands and, per semester subject, how marks split into internal and external. */
export const MarksSetupPanel: React.FC<MarksSetupPanelProps> = ({ semesters, semesterId, onSemesterChange, canEdit }) => {
  const [rules, setRules] = useState<GradeRule[]>([]);
  const [rulesError, setRulesError] = useState('');
  const [schemes, setSchemes] = useState<MarkScheme[]>([]);
  const [subjects, setSubjects] = useState<SubjectSummary[]>([]);
  const [schemeDraft, setSchemeDraft] = useState(emptyScheme);
  const [schemeError, setSchemeError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    marksApi
      .gradeRules()
      .then(setRules)
      .catch((error) => setRulesError(errorText(error, 'Unable to load grade rules.')));
  }, []);

  useEffect(() => {
    setSchemes([]);
    setSubjects([]);
    setSchemeError('');
    if (!semesterId) return;

    Promise.all([marksApi.markSchemes(semesterId), marksApi.semesterSubjects(semesterId)])
      .then(([loadedSchemes, loadedSubjects]) => {
        setSchemes(loadedSchemes);
        setSubjects(loadedSubjects);
      })
      .catch((error) => setSchemeError(errorText(error, 'Unable to load mark schemes.')));
  }, [semesterId]);

  const resetGradeRules = async () => {
    if (!window.confirm('Replace all grade rules of your institution with the defaults (A+ to F)?')) return;
    setBusy(true);
    setRulesError('');
    try {
      setRules(await marksApi.setupDefaultGradeRules());
    } catch (error) {
      setRulesError(errorText(error, 'Unable to set up the default grade rules.'));
    } finally {
      setBusy(false);
    }
  };

  const deleteRule = async (rule: GradeRule) => {
    if (!window.confirm(`Delete grade ${rule.grade} (${rule.min_score}–${rule.max_score})?`)) return;
    try {
      await marksApi.deleteGradeRule(rule.id);
      setRules((current) => current.filter((item) => item.id !== rule.id));
    } catch (error) {
      setRulesError(errorText(error, 'Unable to delete the grade rule.'));
    }
  };

  const internal = Number(schemeDraft.internal_marks) || 0;
  const external = Number(schemeDraft.external_marks) || 0;
  const subjectsWithoutScheme = subjects.filter((subject) => !schemes.some((scheme) => scheme.subject_id === subject.id));

  const createScheme = async (event: FormEvent) => {
    event.preventDefault();
    if (!semesterId || !schemeDraft.subject_id) return;
    setBusy(true);
    setSchemeError('');
    try {
      await marksApi.createMarkScheme({
        subject_id: schemeDraft.subject_id,
        semester_id: semesterId,
        internal_marks: internal,
        external_marks: external,
        // The API requires total = internal + external.
        total_marks: internal + external,
        pass_mark: Number(schemeDraft.pass_mark) || 0,
        extra_marks_allowed: Number(schemeDraft.extra_marks_allowed) || 0,
      });
      setSchemes(await marksApi.markSchemes(semesterId));
      setSchemeDraft(emptyScheme);
    } catch (error) {
      setSchemeError(errorText(error, 'Unable to save the mark scheme.'));
    } finally {
      setBusy(false);
    }
  };

  const deleteScheme = async (scheme: MarkScheme) => {
    if (!window.confirm(`Delete the mark scheme for ${scheme.subject?.name ?? 'this subject'}?`)) return;
    try {
      await marksApi.deleteMarkScheme(scheme.id);
      setSchemes((current) => current.filter((item) => item.id !== scheme.id));
    } catch (error) {
      setSchemeError(errorText(error, 'Unable to delete the mark scheme.'));
    }
  };

  const subjectName = (scheme: MarkScheme) =>
    scheme.subject?.name ?? subjects.find((subject) => subject.id === scheme.subject_id)?.name ?? `Subject ${scheme.subject_id}`;

  return (
    <div className="space-y-6">
      <Card
        title="Grade rules"
        description="Score bands (percent of total marks) that set each entry's grade and grade point."
        action={
          canEdit ? (
            <button type="button" onClick={resetGradeRules} disabled={busy} className={secondaryButton}>
              <RotateCcw size={16} aria-hidden="true" />
              Use default rules
            </button>
          ) : null
        }
      >
        {rulesError ? <Notice tone="error">{rulesError}</Notice> : null}
        {rules.length === 0 ? (
          <EmptyState>No grade rules yet. Grades can't be calculated until rules exist.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <th className="px-3 py-2">Grade</th>
                  <th className="px-3 py-2">Score band</th>
                  <th className="px-3 py-2 text-right">Grade point</th>
                  {canEdit ? <th className="px-3 py-2"><span className="sr-only">Actions</span></th> : null}
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id} className="border-t border-slate-100">
                    <td className="px-3 py-2.5 font-semibold text-[#0a2342]">{rule.grade}</td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {rule.min_score}–{rule.max_score}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{Number(rule.gpa).toFixed(1)}</td>
                    {canEdit ? (
                      <td className="px-3 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => deleteRule(rule)}
                          aria-label={`Delete grade ${rule.grade}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card
        title="Mark schemes"
        description="Each subject needs a scheme for the semester before marks can be entered."
        action={<SemesterSelect id="setup-semester" semesters={semesters} value={semesterId} onChange={onSemesterChange} />}
      >
        {schemeError ? <Notice tone="error">{schemeError}</Notice> : null}
        {!semesterId ? (
          <EmptyState>Choose a semester to see its mark schemes.</EmptyState>
        ) : (
          <div className="space-y-5">
            {schemes.length === 0 ? (
              <EmptyState>No mark schemes for this semester yet.</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      <th className="px-3 py-2">Subject</th>
                      <th className="px-3 py-2 text-right">Internal</th>
                      <th className="px-3 py-2 text-right">External</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2 text-right">Pass mark</th>
                      {canEdit ? <th className="px-3 py-2"><span className="sr-only">Actions</span></th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {schemes.map((scheme) => (
                      <tr key={scheme.id} className="border-t border-slate-100 tabular-nums">
                        <td className="px-3 py-2.5 font-semibold text-[#0a2342]">{subjectName(scheme)}</td>
                        <td className="px-3 py-2.5 text-right">{scheme.internal_marks}</td>
                        <td className="px-3 py-2.5 text-right">{scheme.external_marks}</td>
                        <td className="px-3 py-2.5 text-right">{scheme.total_marks}</td>
                        <td className="px-3 py-2.5 text-right">{scheme.pass_mark}</td>
                        {canEdit ? (
                          <td className="px-3 py-2.5 text-right">
                            <button type="button" onClick={() => deleteScheme(scheme)} className={dangerButton}>
                              Delete
                            </button>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {canEdit ? (
              subjectsWithoutScheme.length === 0 ? (
                subjects.length === 0 ? (
                  <Notice>This semester has no subjects linked to it. Link subjects to the semester first.</Notice>
                ) : null
              ) : (
                <form onSubmit={createScheme} className="grid gap-3 rounded-[16px] bg-slate-50 p-4 sm:grid-cols-6">
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label htmlFor="scheme-subject" className="text-sm font-semibold text-[#123a66]">Subject</label>
                    <select
                      id="scheme-subject"
                      required
                      value={schemeDraft.subject_id}
                      onChange={(event) =>
                        setSchemeDraft((current) => ({ ...current, subject_id: event.target.value ? Number(event.target.value) : '' }))
                      }
                      className={selectClass}
                    >
                      <option value="">Choose a subject</option>
                      {subjectsWithoutScheme.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.code} · {subject.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {(
                    [
                      ['internal_marks', 'Internal'],
                      ['external_marks', 'External'],
                      ['pass_mark', 'Pass mark'],
                    ] as const
                  ).map(([field, label]) => (
                    <div key={field} className="flex flex-col gap-1.5">
                      <label htmlFor={`scheme-${field}`} className="text-sm font-semibold text-[#123a66]">{label}</label>
                      <input
                        id={`scheme-${field}`}
                        type="number"
                        min={0}
                        required
                        value={schemeDraft[field]}
                        onChange={(event) => setSchemeDraft((current) => ({ ...current, [field]: event.target.value }))}
                        className={inputClass}
                      />
                    </div>
                  ))}
                  <div className="flex flex-col justify-end gap-1.5">
                    <span className="text-sm text-[#4d6d8f]">Total {internal + external}</span>
                    <button type="submit" disabled={busy} className={primaryButton}>
                      Add scheme
                    </button>
                  </div>
                </form>
              )
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
};
