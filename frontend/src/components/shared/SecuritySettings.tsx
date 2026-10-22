import { useCallback, useEffect, useState } from 'react';
import { Laptop, LogOut, MailCheck } from 'lucide-react';
import { fetchSessions, resendVerificationEmail, revokeOtherSessions, revokeSession, type SessionInfo } from '../../api/accountApi';
import type { CampusSession } from '../../campusTypes';

/**
 * Sign-in & security for every role: email verification status and the devices
 * signed in to the account, each of which can be signed out.
 */
export function SecuritySettings({ user }: { user: CampusSession }) {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setSessions((await fetchSessions()).data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load your sessions.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (action: () => Promise<{ message: string }>) => {
    setBusy(true);
    setError('');
    try {
      setMessage((await action()).message);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That did not work.');
    } finally {
      setBusy(false);
    }
  };

  const formatTime = (value: string | null) => (value ? new Date(value).toLocaleString() : 'never');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Sign-in &amp; security</h2>
        <p className="text-sm text-slate-500">Change your password from your profile. Changing it signs out your other devices.</p>
      </div>
      {message ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{error}</p> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <MailCheck size={20} className={user.emailVerified === false ? 'text-amber-600' : 'text-emerald-600'} aria-hidden="true" />
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900">Email address</h3>
            <p className="text-sm text-slate-600">
              {user.email} — {user.emailVerified === false ? 'not verified yet' : 'verified'}
            </p>
          </div>
          {user.emailVerified === false ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(resendVerificationEmail)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Resend verification link
            </button>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold text-slate-900">Signed-in devices</h3>
          {sessions.length > 1 ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(revokeOtherSessions)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
            >
              <LogOut size={14} aria-hidden="true" /> Sign out all other devices
            </button>
          ) : null}
        </div>
        <ul className="divide-y divide-slate-100">
          {sessions.map((session) => (
            <li key={session.id} className="flex flex-wrap items-center gap-3 py-3">
              <Laptop size={18} className="text-slate-400" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">
                  {session.device}
                  {session.current ? <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">This device</span> : null}
                </p>
                <p className="text-xs text-slate-500">
                  Signed in {formatTime(session.createdAt)} · last active {formatTime(session.lastUsedAt)}
                  {session.expiresAt ? ` · expires ${formatTime(session.expiresAt)}` : ''}
                </p>
              </div>
              {!session.current ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run(() => revokeSession(session.id))}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                >
                  Sign out
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
