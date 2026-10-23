import React, { useEffect, useState } from 'react';
import { Check, CheckCheck, ChevronLeft, ChevronRight, Undo2 } from 'lucide-react';
import { marksApi, relationName, type MarkEntryStatus, type ReviewEntry, type ReviewQueue } from '../../api/marksApi';
import {
  Card,
  EmptyState,
  Notice,
  StatusBadge,
  dangerButton,
  errorText,
  inputClass,
  primaryButton,
  secondaryButton,
  statusLabels,
} from './marksUi';

interface MarksReviewPanelProps {
  canReview: boolean;
}

type Filter = MarkEntryStatus | 'all';

const filters: Filter[] = ['submitted', 'verified', 'approved', 'locked', 'all'];

/**
 * Step 3: reviewers (HOD, exam coordinator, institution admin) verify submitted entries, then approve
 * them. Rejecting returns an entry to draft with the reason saved as its remarks.
 */
export const MarksReviewPanel: React.FC<MarksReviewPanelProps> = ({ canReview }) => {
  const [filter, setFilter] = useState<Filter>('submitted');
  const [page, setPage] = useState(1);
  const [queue, setQueue] = useState<ReviewQueue | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<{ id: number; reason: string } | null>(null);

  const load = async (nextFilter = filter, nextPage = page) => {
    setError('');
    try {
      setQueue(await marksApi.reviewQueue(nextFilter, nextPage));
    } catch (loadError) {
      setError(errorText(loadError, 'Unable to load entries for review.'));
    }
  };

  useEffect(() => {
    void load(filter, page);
  }, [filter, page]);

  const act = async (entry: ReviewEntry, action: () => Promise<unknown>) => {
    setBusyId(entry.id);
    setError('');
    try {
      await action();
      setRejecting(null);
      await load();
    } catch (actionError) {
      setError(errorText(actionError, 'The action could not be completed.'));
    } finally {
      setBusyId(null);
    }
  };

  const entries = queue?.entries.data ?? [];
  const stats = queue?.stats;

  return (
    <Card
      title="Review marks"
      description="Verify submitted marks, then approve them. Send an entry back with a reason if it needs correcting."
    >
      <div className="space-y-4">
        {stats ? (
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                ['Waiting to verify', stats.submitted],
                ['Waiting to approve', stats.verified],
                ['Approved', stats.approved],
                ['In this list', queue?.entries.total ?? 0],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-[14px] bg-slate-50 px-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums text-[#0a2342]">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <div role="tablist" aria-label="Filter by status" className="flex flex-wrap gap-2">
          {filters.map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={filter === option}
              onClick={() => {
                setFilter(option);
                setPage(1);
              }}
              className={`h-10 rounded-full px-4 text-sm font-semibold transition ${
                filter === option ? 'bg-[#0b4d88] text-white' : 'border border-slate-200 bg-white text-[#123a66] hover:bg-slate-50'
              }`}
            >
              {option === 'all' ? 'All' : statusLabels[option]}
            </button>
          ))}
        </div>

        {error ? <Notice tone="error">{error}</Notice> : null}
        {!canReview ? <Notice>You can see the review queue. Verifying and approving needs the marks.approve permission.</Notice> : null}

        {queue && entries.length === 0 ? (
          <EmptyState>Nothing here. Entries appear once faculty submit marks.</EmptyState>
        ) : (
          <div className="overflow-x-auto rounded-[16px] border border-slate-100">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <th className="px-3 py-3">Student</th>
                  <th className="px-3 py-3">Subject · Exam</th>
                  <th className="px-3 py-3 text-right">Int / Ext / Extra</th>
                  <th className="px-3 py-3 text-right">Total · Grade</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Entered by</th>
                  {canReview ? <th className="px-3 py-3 text-right">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const busy = busyId === entry.id;
                  const isRejecting = rejecting?.id === entry.id;
                  return (
                    <React.Fragment key={entry.id}>
                      <tr className="border-t border-slate-100">
                        <td className="px-3 py-3">
                          <p className="font-semibold text-[#0a2342]">{entry.student?.name ?? `Student ${entry.id}`}</p>
                          <p className="font-mono text-xs text-slate-500">{entry.student?.registration_number}</p>
                        </td>
                        <td className="px-3 py-3">
                          <p>{entry.subject?.name}</p>
                          <p className="text-xs text-slate-500">{entry.exam?.name}</p>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          {entry.is_absent ? 'Absent' : `${entry.internal_marks ?? '—'} / ${entry.external_marks ?? '—'} / ${entry.extra_marks ?? 0}`}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          {entry.total_marks ?? '—'}
                          {entry.grade ? ` · ${entry.grade}` : ''}
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge status={entry.status} />
                        </td>
                        <td className="px-3 py-3 text-slate-600">{relationName(entry.entered_by) ?? '—'}</td>
                        {canReview ? (
                          <td className="px-3 py-3">
                            <div className="flex justify-end gap-2">
                              {entry.status === 'submitted' ? (
                                <button type="button" disabled={busy} onClick={() => act(entry, () => marksApi.verify(entry.id))} className={secondaryButton}>
                                  <Check size={15} aria-hidden="true" />
                                  Verify
                                </button>
                              ) : null}
                              {entry.status === 'verified' ? (
                                <button type="button" disabled={busy} onClick={() => act(entry, () => marksApi.approve(entry.id))} className={primaryButton}>
                                  <CheckCheck size={15} aria-hidden="true" />
                                  Approve
                                </button>
                              ) : null}
                              {entry.status === 'submitted' || entry.status === 'verified' ? (
                                <button type="button" disabled={busy} onClick={() => setRejecting({ id: entry.id, reason: '' })} className={dangerButton}>
                                  <Undo2 size={15} aria-hidden="true" />
                                  Send back
                                </button>
                              ) : null}
                            </div>
                          </td>
                        ) : null}
                      </tr>
                      {isRejecting && rejecting ? (
                        <tr className="bg-red-50/40">
                          <td colSpan={canReview ? 7 : 6} className="px-3 py-3">
                            <form
                              onSubmit={(event) => {
                                event.preventDefault();
                                if (rejecting.reason.trim()) void act(entry, () => marksApi.reject(entry.id, rejecting.reason.trim()));
                              }}
                              className="flex flex-wrap items-end gap-2"
                            >
                              <div className="flex min-w-[280px] flex-1 flex-col gap-1.5">
                                <label htmlFor={`reject-${entry.id}`} className="text-sm font-semibold text-[#123a66]">
                                  Reason for sending back (saved as the entry's remarks)
                                </label>
                                <input
                                  id={`reject-${entry.id}`}
                                  autoFocus
                                  required
                                  value={rejecting.reason}
                                  onChange={(event) => setRejecting({ id: entry.id, reason: event.target.value })}
                                  className={inputClass}
                                />
                              </div>
                              <button type="submit" disabled={busy || !rejecting.reason.trim()} className={dangerButton}>
                                Send back to draft
                              </button>
                              <button type="button" onClick={() => setRejecting(null)} className={secondaryButton}>
                                Cancel
                              </button>
                            </form>
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {queue && queue.entries.last_page > 1 ? (
          <nav aria-label="Review pages" className="flex items-center justify-end gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className={secondaryButton}>
              <ChevronLeft size={16} aria-hidden="true" />
              Previous
            </button>
            <span className="text-sm text-[#4d6d8f]">
              Page {queue.entries.current_page} of {queue.entries.last_page}
            </span>
            <button type="button" disabled={page >= queue.entries.last_page} onClick={() => setPage(page + 1)} className={secondaryButton}>
              Next
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </nav>
        ) : null}
      </div>
    </Card>
  );
};
