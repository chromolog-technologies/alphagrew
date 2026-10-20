import React, { useEffect, useState } from 'react';
import { LockOpen, Megaphone } from 'lucide-react';
import { marksApi, publishReadiness, relationName, type PublishingLog, type PublishingStatus, type Semester } from '../../api/marksApi';
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
} from './marksUi';

interface ResultPublishingPanelProps {
  semesters: Semester[];
  semesterId: number | '';
  onSemesterChange: (semesterId: number | '') => void;
  canPublish: boolean;
}

/**
 * Step 4: publishing a semester creates the semester results, locks every entry and is logged.
 * It is refused while any entry is not approved. Unlocking needs a reason and returns entries to approved.
 */
export const ResultPublishingPanel: React.FC<ResultPublishingPanelProps> = ({ semesters, semesterId, onSemesterChange, canPublish }) => {
  const [status, setStatus] = useState<PublishingStatus | null>(null);
  const [logs, setLogs] = useState<PublishingLog[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [showUnlock, setShowUnlock] = useState(false);

  const load = async (id: number) => {
    setError('');
    try {
      const [loadedStatus, loadedLogs] = await Promise.all([marksApi.publishingStatus(id), marksApi.publishingLogs(id)]);
      setStatus(loadedStatus);
      setLogs(loadedLogs);
    } catch (loadError) {
      setError(errorText(loadError, 'Unable to load the publishing status.'));
    }
  };

  useEffect(() => {
    setStatus(null);
    setLogs([]);
    setSuccess('');
    setShowUnlock(false);
    if (semesterId) void load(semesterId);
  }, [semesterId]);

  const readiness = status ? publishReadiness(status.mark_stats) : null;
  const published = (status?.published_results_count ?? 0) > 0;

  const publish = async () => {
    if (!semesterId || !status) return;
    if (!window.confirm(`Publish results for ${status.semester.name}? Students will see them and all entries will be locked.`)) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const result = await marksApi.publish(semesterId);
      setSuccess(result.message);
      await load(semesterId);
    } catch (publishError) {
      setError(errorText(publishError, 'Unable to publish the results.'));
    } finally {
      setBusy(false);
    }
  };

  const unlock = async () => {
    if (!semesterId || !unlockReason.trim()) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await marksApi.unlock(semesterId, unlockReason.trim());
      setSuccess('Results unlocked. Entries are back to approved and hidden from students.');
      setUnlockReason('');
      setShowUnlock(false);
      await load(semesterId);
    } catch (unlockError) {
      setError(errorText(unlockError, 'Unable to unlock the results.'));
    } finally {
      setBusy(false);
    }
  };

  const stats = status?.mark_stats;
  const segments = stats && readiness
    ? ([
        ['Draft', stats.draft, 'bg-slate-300'],
        ['Submitted', stats.submitted, 'bg-[#f5b971]'],
        ['Verified', stats.verified, 'bg-[#7fb4e3]'],
        ['Approved', stats.approved, 'bg-[#4caf7d]'],
        ['Published', readiness.locked, 'bg-[#0a2342]'],
      ] as const)
    : [];

  return (
    <Card
      title="Publish results"
      description="Results go to students only when every entry for the semester is approved."
      action={<SemesterSelect id="publish-semester" semesters={semesters} value={semesterId} onChange={onSemesterChange} />}
    >
      <div className="space-y-5">
        {error ? <Notice tone="error">{error}</Notice> : null}
        {success ? <Notice tone="success">{success}</Notice> : null}

        {!semesterId ? (
          <EmptyState>Choose a semester to see whether its results are ready.</EmptyState>
        ) : !status || !stats || !readiness ? null : stats.total_entries === 0 ? (
          <EmptyState>No marks have been entered for {status.semester.name} yet.</EmptyState>
        ) : (
          <>
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-[#0a2342]">
                  {stats.total_entries} entries · {readiness.pending === 0 ? 'all reviewed' : `${readiness.pending} still in review`}
                </p>
                <p className="text-sm text-[#4d6d8f]">{published ? `Published for ${status.published_results_count} students` : 'Not published'}</p>
              </div>
              <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                {segments.map(([label, value, color]) =>
                  value > 0 ? <div key={label} className={color} style={{ width: `${(value / stats.total_entries) * 100}%` }} /> : null,
                )}
              </div>
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-[#4d6d8f]">
                {segments.map(([label, value, color]) => (
                  <li key={label} className="flex items-center gap-1.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${color}`} aria-hidden="true" />
                    {label} <span className="font-semibold tabular-nums text-[#0a2342]">{value}</span>
                  </li>
                ))}
              </ul>
            </div>

            {canPublish ? (
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={publish} disabled={busy || !readiness.canPublish} className={primaryButton}>
                  <Megaphone size={16} aria-hidden="true" />
                  Publish results
                </button>
                {published ? (
                  <button type="button" onClick={() => setShowUnlock((current) => !current)} disabled={busy} className={dangerButton}>
                    <LockOpen size={16} aria-hidden="true" />
                    Unlock results
                  </button>
                ) : null}
                {!readiness.canPublish && readiness.pending > 0 ? (
                  <p className="text-sm text-[#4d6d8f]">Approve the {readiness.pending} remaining entries to publish.</p>
                ) : null}
              </div>
            ) : (
              <Notice>Publishing needs the marks.publish permission (Exam Coordinator or Institution Admin).</Notice>
            )}

            {showUnlock ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void unlock();
                }}
                className="flex flex-wrap items-end gap-2 rounded-[16px] bg-red-50/50 p-4"
              >
                <div className="flex min-w-[280px] flex-1 flex-col gap-1.5">
                  <label htmlFor="unlock-reason" className="text-sm font-semibold text-[#123a66]">
                    Reason for unlocking (kept in the audit log)
                  </label>
                  <input id="unlock-reason" required value={unlockReason} onChange={(event) => setUnlockReason(event.target.value)} className={inputClass} />
                </div>
                <button type="submit" disabled={busy || !unlockReason.trim()} className={dangerButton}>
                  Unlock
                </button>
                <button type="button" onClick={() => setShowUnlock(false)} className={secondaryButton}>
                  Cancel
                </button>
              </form>
            ) : null}
          </>
        )}

        {logs.length > 0 ? (
          <div>
            <h4 className="text-sm font-bold text-[#0a2342]">Publishing log</h4>
            <ul className="mt-2 divide-y divide-slate-100 rounded-[14px] border border-slate-100">
              {logs.map((log) => (
                <li key={log.id} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
                  <span>
                    <span className="font-semibold capitalize text-[#0a2342]">{log.action === 'publish' ? 'Published' : 'Unlocked'}</span>
                    {log.details ? <span className="text-[#4d6d8f]"> · {log.details}</span> : null}
                  </span>
                  <span className="text-[#4d6d8f]">
                    {relationName(log.published_by) ?? 'Unknown'} · {new Date(log.published_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Card>
  );
};
