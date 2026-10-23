import React, { useEffect, useState } from 'react';
import { marksApi, type SemesterResultDetail, type StudentResults } from '../../api/marksApi';
import { Card, EmptyState, Notice, errorText } from './marksUi';

/** The end of the marks workflow: a student's published semester results (GET /student/results). */
export const StudentResultsView: React.FC<{ apiConfigured: boolean }> = ({ apiConfigured }) => {
  const [results, setResults] = useState<StudentResults | null>(null);
  const [detail, setDetail] = useState<SemesterResultDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!apiConfigured) return;
    marksApi
      .myResults()
      .then(setResults)
      .catch((loadError) => setError(errorText(loadError, 'Unable to load your results.')));
  }, [apiConfigured]);

  const openSemester = async (semesterId: number) => {
    setError('');
    try {
      setDetail(await marksApi.mySemesterResult(semesterId));
    } catch (loadError) {
      setError(errorText(loadError, 'Unable to load this semester.'));
    }
  };

  if (!apiConfigured) {
    return <Notice>Published results come from the Laravel API. Set VITE_API_BASE_URL to see them.</Notice>;
  }

  return (
    <div className="space-y-6">
      {error ? <Notice tone="error">{error}</Notice> : null}

      <Card
        title="My results"
        description="Semesters appear here once the exam coordinator publishes them."
      >
        {!results ? null : results.semesters.length === 0 ? (
          <EmptyState>No results have been published for you yet.</EmptyState>
        ) : (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  ['Cumulative GPA', results.cumulative.cumulative_gpa.toFixed(2)],
                  ['Semesters', results.cumulative.total_semesters],
                  ['Subjects passed', results.cumulative.total_subjects_passed],
                  ['Subjects failed', results.cumulative.total_subjects_failed],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="rounded-[14px] bg-slate-50 px-4 py-3">
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</dt>
                  <dd className="mt-1 text-2xl font-bold tabular-nums text-[#0a2342]">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    <th className="px-3 py-2">Semester</th>
                    <th className="px-3 py-2 text-right">Percentage</th>
                    <th className="px-3 py-2 text-right">GPA</th>
                    <th className="px-3 py-2">Grade</th>
                    <th className="px-3 py-2">Result</th>
                    <th className="px-3 py-2"><span className="sr-only">Details</span></th>
                  </tr>
                </thead>
                <tbody>
                  {results.semesters.map((semester) => (
                    <tr key={semester.semester_id} className="border-t border-slate-100 tabular-nums">
                      <td className="px-3 py-2.5 font-semibold text-[#0a2342]">{semester.semester_name}</td>
                      <td className="px-3 py-2.5 text-right">{Number(semester.percentage).toFixed(1)}%</td>
                      <td className="px-3 py-2.5 text-right">{Number(semester.gpa).toFixed(2)}</td>
                      <td className="px-3 py-2.5">{semester.overall_grade ?? '—'}</td>
                      <td className="px-3 py-2.5">
                        <span className={semester.result === 'PASS' ? 'font-semibold text-[#05603a]' : 'font-semibold text-red-700'}>
                          {semester.result === 'PASS' ? 'Pass' : semester.result === 'FAIL' ? 'Fail' : semester.result}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => openSemester(semester.semester_id)}
                          className="h-10 rounded-[10px] border border-slate-200 px-3 text-sm font-semibold text-[#123a66] hover:bg-slate-50"
                        >
                          View marks
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      {detail ? (
        <Card title={detail.semester.name} description={`Published ${new Date(detail.published_at).toLocaleDateString()}`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <th className="px-3 py-2">Subject</th>
                  <th className="px-3 py-2 text-right">Internal</th>
                  <th className="px-3 py-2 text-right">External</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2">Grade</th>
                  <th className="px-3 py-2">Result</th>
                </tr>
              </thead>
              <tbody>
                {detail.marks.map((mark) => (
                  <tr key={mark.subject_id} className="border-t border-slate-100 tabular-nums">
                    <td className="px-3 py-2.5">
                      <span className="font-semibold text-[#0a2342]">{mark.subject_name}</span>{' '}
                      <span className="text-xs text-slate-500">{mark.subject_code}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right">{mark.is_absent ? 'Absent' : mark.internal_marks ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right">{mark.is_absent ? '' : mark.external_marks ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right">{mark.total_marks ?? '—'}</td>
                    <td className="px-3 py-2.5">{mark.grade ?? '—'}</td>
                    <td className="px-3 py-2.5">{mark.result === 'PASS' ? 'Pass' : mark.result === 'FAIL' ? 'Fail' : mark.result ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
};
