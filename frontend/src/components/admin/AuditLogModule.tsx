import { useCallback, useEffect, useState } from 'react';
import { fetchAuditLogs, type AuditLogEntry, type Paginated } from '../../api/accountApi';

/**
 * Read-only audit log of the institution: sign-ins, account changes, onboarding and
 * administrative actions. Entries can't be edited or deleted.
 */

const actionGroups = [
  { value: '', label: 'All actions' },
  { value: 'auth.', label: 'Sign-in & security' },
  { value: 'invitation.', label: 'Invitations' },
  { value: 'registration.', label: 'Registrations' },
  { value: 'staff.', label: 'Staff accounts' },
  { value: 'student.', label: 'Students' },
  { value: 'results.', label: 'Results publishing' },
  { value: 'placement.', label: 'Placement' },
];

const describe = (values: Record<string, unknown> | null) =>
  values
    ? Object.entries(values)
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)}`)
        .join(' · ')
    : '';

export function AuditLogModule() {
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [page, setPage] = useState<Paginated<AuditLogEntry> | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setPage(await fetchAuditLogs({ action, from, to, page: pageNumber }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load the audit log.');
    }
  }, [action, from, to, pageNumber]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Audit log</h2>
        <p className="text-sm text-slate-500">Who did what, and when. Entries can't be changed or deleted.</p>
      </div>
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="space-y-1">
          <label htmlFor="audit-action" className="text-xs font-bold uppercase tracking-wider text-slate-600">Action</label>
          <select
            id="audit-action"
            value={action}
            onChange={(event) => { setAction(event.target.value); setPageNumber(1); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            {actionGroups.map((group) => <option key={group.value} value={group.value}>{group.label}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="audit-from" className="text-xs font-bold uppercase tracking-wider text-slate-600">From</label>
          <input id="audit-from" type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPageNumber(1); }} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1">
          <label htmlFor="audit-to" className="text-xs font-bold uppercase tracking-wider text-slate-600">To</label>
          <input id="audit-to" type="date" value={to} onChange={(event) => { setTo(event.target.value); setPageNumber(1); }} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        </div>
      </div>
      {error ? <p role="alert" className="text-sm text-rose-600">{error}</p> : null}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-2.5">When</th>
              <th scope="col" className="px-4 py-2.5">Action</th>
              <th scope="col" className="px-4 py-2.5">By</th>
              <th scope="col" className="px-4 py-2.5">Record</th>
              <th scope="col" className="px-4 py-2.5">Details</th>
              <th scope="col" className="px-4 py-2.5">IP address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {page?.data.map((entry) => (
              <tr key={entry.id} className="align-top">
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{new Date(entry.createdAt).toLocaleString()}</td>
                <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-slate-800">{entry.action}</td>
                <td className="px-4 py-2.5 text-slate-700">{entry.actorName ?? '—'}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{entry.subjectType ? `${entry.subjectType} #${entry.subjectId}` : '—'}</td>
                <td className="max-w-md px-4 py-2.5 text-xs text-slate-600">
                  {entry.oldValues ? <div><span className="font-semibold">Before:</span> {describe(entry.oldValues)}</div> : null}
                  {entry.newValues ? <div><span className="font-semibold">{entry.oldValues ? 'After:' : ''}</span> {describe(entry.newValues)}</div> : null}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">{entry.ipAddress ?? '—'}</td>
              </tr>
            ))}
            {page && page.data.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">No entries.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {page && page.meta.last_page > 1 ? (
        <div className="flex items-center justify-end gap-2 text-sm">
          <button type="button" disabled={pageNumber <= 1} onClick={() => setPageNumber(pageNumber - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-50">Previous</button>
          <span className="text-slate-500">Page {page.meta.current_page} of {page.meta.last_page}</span>
          <button type="button" disabled={pageNumber >= page.meta.last_page} onClick={() => setPageNumber(pageNumber + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-50">Next</button>
        </div>
      ) : null}
    </div>
  );
}
