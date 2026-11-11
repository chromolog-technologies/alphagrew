/** Account banners shown around the signed-in app: dismissible notices and the verify-email reminder. */
import { useState } from 'react';
import { resendVerificationEmail } from '../api/accountApi';

export function AccountNotice({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  if (!message) return null;

  return (
    <div role="status" className="fixed bottom-4 right-4 z-50 flex max-w-sm items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-lg">
      <span className="flex-1">{message}</span>
      <button type="button" onClick={onDismiss} className="font-semibold text-blue-600 hover:text-blue-700">
        Dismiss
      </button>
    </div>
  );
}

/** Shown until the signed-in user verifies their email address; applying to drives needs it. */
export function VerifyEmailReminder({ email }: { email: string }) {
  const [message, setMessage] = useState('');
  const [hidden, setHidden] = useState(false);
  const [sending, setSending] = useState(false);

  if (hidden) return null;

  const resend = async () => {
    setSending(true);
    try {
      setMessage((await resendVerificationEmail()).message);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Could not send the email. Try again later.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div role="status" className="fixed bottom-4 left-4 z-50 max-w-sm rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-lg">
      <p className="font-semibold">Verify your email address</p>
      <p className="mt-1">
        {message || `We sent a link to ${email}. You need a verified address to apply to placement drives.`}
      </p>
      <div className="mt-3 flex gap-3">
        <button type="button" disabled={sending} onClick={() => void resend()} className="font-semibold text-amber-900 underline disabled:opacity-60">
          {sending ? 'Sending…' : 'Resend link'}
        </button>
        <button type="button" onClick={() => setHidden(true)} className="font-semibold text-amber-800">
          Later
        </button>
      </div>
    </div>
  );
}
