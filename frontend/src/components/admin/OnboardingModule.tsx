import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Check, Loader2, MailPlus, RefreshCw, Send, X } from 'lucide-react';
import {
  approveRegistration,
  createInvitations,
  fetchInvitations,
  fetchRegistrations,
  rejectRegistration,
  resendInvitation,
  revokeInvitation,
  type InvitableRole,
  type Invitation,
  type InvitationStatus,
  type Paginated,
  type PendingRegistration,
} from '../../api/accountApi';
import type { CampusDepartment, CampusDesignation } from '../../campusTypes';

/**
 * Onboarding (PRD §6): invite students, staff and placement officers by email, and
 * approve or reject students who registered themselves.
 */

interface OnboardingModuleProps {
  departments: CampusDepartment[];
  designations: CampusDesignation[];
}

const roleOptions: { value: InvitableRole; label: string }[] = [
  { value: 'student', label: 'Student' },
  { value: 'staff', label: 'Faculty / Staff' },
  { value: 'placement_officer', label: 'Placement Officer' },
];

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  revoked: 'bg-slate-100 text-slate-600 border-slate-200',
  expired: 'bg-rose-50 text-rose-700 border-rose-200',
  pending_approval: 'bg-amber-50 text-amber-700 border-amber-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
};

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${statusStyles[status] ?? statusStyles.revoked}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function Pager<T>({ page, onPage }: { page: Paginated<T> | null; onPage: (page: number) => void }) {
  if (!page || page.meta.last_page <= 1) return null;

  return (
    <div className="flex items-center justify-end gap-2 pt-3 text-sm">
      <button
        type="button"
        disabled={page.meta.current_page <= 1}
        onClick={() => onPage(page.meta.current_page - 1)}
        className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-50"
      >
        Previous
      </button>
      <span className="text-slate-500">
        Page {page.meta.current_page} of {page.meta.last_page}
      </span>
      <button
        type="button"
        disabled={page.meta.current_page >= page.meta.last_page}
        onClick={() => onPage(page.meta.current_page + 1)}
        className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}

function InviteForm({ departments, designations, onSent }: OnboardingModuleProps & { onSent: () => void }) {
  const [emails, setEmails] = useState('');
  const [role, setRole] = useState<InvitableRole>('student');
  const [departmentCode, setDepartmentCode] = useState(departments[0]?.code ?? '');
  const [designationId, setDesignationId] = useState<number | ''>('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ tone: 'success' | 'error'; text: string; skipped?: { email: string; reason: string }[] } | null>(null);

  const needsDesignation = role !== 'student';
  const parsedEmails = emails.split(/[\s,;]+/).map((email) => email.trim()).filter(Boolean);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const response = await createInvitations({
        emails: parsedEmails,
        role,
        departmentCode,
        designationId: needsDesignation && designationId !== '' ? designationId : null,
      });
      setResult({ tone: 'success', text: response.message, skipped: response.skipped });
      if (response.data.length > 0) {
        setEmails('');
        onSent();
      }
    } catch (caught) {
      setResult({ tone: 'error', text: caught instanceof Error ? caught.message : 'Could not send the invitations.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2">
        <MailPlus size={18} className="text-blue-600" aria-hidden="true" />
        <h3 className="font-semibold text-slate-900">Invite people</h3>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="invite-emails" className="text-xs font-bold uppercase tracking-wider text-slate-600">
          Email addresses
        </label>
        <textarea
          id="invite-emails"
          rows={4}
          value={emails}
          onChange={(event) => setEmails(event.target.value)}
          placeholder={'one@college.edu\ntwo@college.edu'}
          aria-describedby="invite-emails-hint"
          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
        />
        <p id="invite-emails-hint" className="text-xs text-slate-500">
          Separate addresses with commas or new lines. Up to 200 at a time. {parsedEmails.length > 0 ? `${parsedEmails.length} entered.` : ''}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="invite-role" className="text-xs font-bold uppercase tracking-wider text-slate-600">Role</label>
          <select
            id="invite-role"
            value={role}
            onChange={(event) => setRole(event.target.value as InvitableRole)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="invite-department" className="text-xs font-bold uppercase tracking-wider text-slate-600">Department</label>
          <select
            id="invite-department"
            value={departmentCode}
            onChange={(event) => setDepartmentCode(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
          >
            {departments.map((department) => (
              <option key={department.code} value={department.code}>{department.code} — {department.name}</option>
            ))}
          </select>
        </div>
        {needsDesignation ? (
          <div className="space-y-1.5">
            <label htmlFor="invite-designation" className="text-xs font-bold uppercase tracking-wider text-slate-600">Designation</label>
            <select
              id="invite-designation"
              value={designationId}
              onChange={(event) => setDesignationId(event.target.value ? Number(event.target.value) : '')}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="">Choose…</option>
              {designations.map((designation) => (
                <option key={designation.id} value={designation.id}>{designation.name}</option>
              ))}
            </select>
          </div>
        ) : null}
      </div>
      {result ? (
        <div
          role={result.tone === 'error' ? 'alert' : 'status'}
          className={`rounded-xl border px-3.5 py-2.5 text-sm ${result.tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}
        >
          {result.text}
          {result.skipped && result.skipped.length > 0 ? (
            <ul className="mt-1 list-disc pl-5 text-slate-700">
              {result.skipped.map((skip) => <li key={skip.email}>{skip.email}: {skip.reason}</li>)}
            </ul>
          ) : null}
        </div>
      ) : null}
      <button
        type="submit"
        disabled={busy || parsedEmails.length === 0 || !departmentCode || (needsDesignation && designationId === '')}
        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
        Send invitations
      </button>
    </form>
  );
}

function InvitationList({ reloadKey }: { reloadKey: number }) {
  const [status, setStatus] = useState<InvitationStatus | ''>('pending');
  const [search, setSearch] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [page, setPage] = useState<Paginated<Invitation> | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      setPage(await fetchInvitations({ status, search, page: pageNumber }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load invitations.');
    }
  }, [status, search, pageNumber]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  const act = async (id: number, action: (id: number) => Promise<unknown>) => {
    setBusyId(id);
    try {
      await action(id);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That did not work.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h3 className="font-semibold text-slate-900">Invitations</h3>
        <div className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="invitation-search">Search by email</label>
          <input
            id="invitation-search"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPageNumber(1); }}
            placeholder="Search email"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <label className="sr-only" htmlFor="invitation-status">Status</label>
          <select
            id="invitation-status"
            value={status}
            onChange={(event) => { setStatus(event.target.value as InvitationStatus | ''); setPageNumber(1); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="expired">Expired</option>
            <option value="revoked">Revoked</option>
          </select>
        </div>
      </div>
      {error ? <p role="alert" className="mb-3 text-sm text-rose-600">{error}</p> : null}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th scope="col" className="py-2 pr-3">Email</th>
              <th scope="col" className="py-2 pr-3">Role</th>
              <th scope="col" className="py-2 pr-3">Department</th>
              <th scope="col" className="py-2 pr-3">Status</th>
              <th scope="col" className="py-2 pr-3">Expires</th>
              <th scope="col" className="py-2"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {page?.data.map((invitation) => (
              <tr key={invitation.id}>
                <td className="py-2.5 pr-3 font-medium text-slate-800">{invitation.email}</td>
                <td className="py-2.5 pr-3 text-slate-600">{roleOptions.find((option) => option.value === invitation.role)?.label ?? invitation.role}</td>
                <td className="py-2.5 pr-3 text-slate-600">{invitation.departmentCode ?? '—'}</td>
                <td className="py-2.5 pr-3"><StatusBadge status={invitation.status} /></td>
                <td className="py-2.5 pr-3 text-slate-600">{formatDate(invitation.expiresAt)}</td>
                <td className="py-2.5 text-right whitespace-nowrap">
                  {invitation.status !== 'accepted' ? (
                    <button
                      type="button"
                      disabled={busyId === invitation.id}
                      onClick={() => void act(invitation.id, resendInvitation)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                      aria-label={`Resend invitation to ${invitation.email}`}
                    >
                      <RefreshCw size={13} aria-hidden="true" /> Resend
                    </button>
                  ) : null}
                  {invitation.status === 'pending' ? (
                    <button
                      type="button"
                      disabled={busyId === invitation.id}
                      onClick={() => void act(invitation.id, revokeInvitation)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                      aria-label={`Revoke invitation to ${invitation.email}`}
                    >
                      <X size={13} aria-hidden="true" /> Revoke
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
            {page && page.data.length === 0 ? (
              <tr><td colSpan={6} className="py-6 text-center text-slate-500">No invitations.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <Pager page={page} onPage={setPageNumber} />
    </section>
  );
}

function RegistrationQueue() {
  const [status, setStatus] = useState<'pending_approval' | 'rejected'>('pending_approval');
  const [pageNumber, setPageNumber] = useState(1);
  const [page, setPage] = useState<Paginated<PendingRegistration> | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<{ id: number; reason: string } | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      setPage(await fetchRegistrations({ status, page: pageNumber }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load registrations.');
    }
  }, [status, pageNumber]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (id: number, action: () => Promise<unknown>) => {
    setBusyId(id);
    try {
      await action();
      setRejecting(null);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That did not work.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">Student registrations</h3>
          <p className="text-sm text-slate-500">Students who registered with your institution code wait here for approval.</p>
        </div>
        <label className="sr-only" htmlFor="registration-status">Status</label>
        <select
          id="registration-status"
          value={status}
          onChange={(event) => { setStatus(event.target.value as typeof status); setPageNumber(1); }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="pending_approval">Waiting for approval</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      {error ? <p role="alert" className="mb-3 text-sm text-rose-600">{error}</p> : null}
      <ul className="divide-y divide-slate-100">
        {page?.data.map((registration) => (
          <li key={registration.id} className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-slate-800">{registration.name}</p>
                <p className="text-sm text-slate-500">
                  {registration.email} · {registration.departmentCode} · registered {formatDate(registration.registeredAt)} ·{' '}
                  {registration.emailVerified ? 'email verified' : 'email not verified yet'}
                </p>
                {registration.statusReason ? <p className="text-sm text-rose-600">Reason: {registration.statusReason}</p> : null}
              </div>
              {registration.status === 'pending_approval' ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busyId === registration.id}
                    onClick={() => void act(registration.id, () => approveRegistration(registration.id))}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Check size={13} aria-hidden="true" /> Approve
                  </button>
                  <button
                    type="button"
                    disabled={busyId === registration.id}
                    onClick={() => setRejecting({ id: registration.id, reason: '' })}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                  >
                    <X size={13} aria-hidden="true" /> Reject
                  </button>
                </div>
              ) : <StatusBadge status={registration.status} />}
            </div>
            {rejecting?.id === registration.id ? (
              <form
                className="mt-3 flex flex-wrap items-end gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void act(registration.id, () => rejectRegistration(registration.id, rejecting.reason));
                }}
              >
                <div className="flex-1 space-y-1">
                  <label htmlFor={`reject-reason-${registration.id}`} className="text-xs font-semibold text-slate-600">Reason (sent to the student)</label>
                  <input
                    id={`reject-reason-${registration.id}`}
                    value={rejecting.reason}
                    onChange={(event) => setRejecting({ id: registration.id, reason: event.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <button type="submit" disabled={rejecting.reason.trim().length < 3} className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  Reject registration
                </button>
                <button type="button" onClick={() => setRejecting(null)} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600">
                  Cancel
                </button>
              </form>
            ) : null}
          </li>
        ))}
        {page && page.data.length === 0 ? <li className="py-6 text-center text-sm text-slate-500">Nothing here.</li> : null}
      </ul>
      <Pager page={page} onPage={setPageNumber} />
    </section>
  );
}

export function OnboardingModule({ departments, designations }: OnboardingModuleProps) {
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Onboarding</h2>
        <p className="text-sm text-slate-500">Invite people by email and review self-registrations. Invitations expire after 7 days.</p>
      </div>
      <InviteForm departments={departments} designations={designations} onSent={() => setReloadKey((key) => key + 1)} />
      <RegistrationQueue />
      <InvitationList reloadKey={reloadKey} />
    </div>
  );
}
