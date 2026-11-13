import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, X } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LOGIN_BASE_PATH } from '../../routes';
import {
  acceptInvitation,
  ApiError,
  fetchInvitation,
  forgotPassword,
  registerStudent,
  resetPassword,
  type InvitationPreview,
} from '../../api/accountApi';
import type { AuthResponse } from '../../api/campusApi';

/**
 * Public account pages, opened by path (see App): /forgot-password, /reset-password,
 * /register and /invitations/accept. Links in emails point to these paths.
 */

const roleLabels: Record<string, string> = {
  student: 'Student',
  staff: 'Faculty / Staff',
  placement_officer: 'Placement Officer',
};

function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <img src="/alpha-logo.png" alt="" className="h-9 w-9 rounded-xl object-contain" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">{title}</h1>
            {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
          </div>
        </div>
        {children}
        <Link to={LOGIN_BASE_PATH} className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700">
          <ArrowLeft size={14} aria-hidden="true" /> Back to sign in
        </Link>
      </div>
    </main>
  );
}

function Field({
  id,
  label,
  type = 'text',
  value,
  onChange,
  error,
  autoComplete,
  readOnly,
  hint,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange?: (value: string) => void;
  error?: string;
  autoComplete?: string;
  readOnly?: boolean;
  hint?: string;
}) {
  const isPassword = type === 'password';
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wider text-slate-600">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword ? (showPassword ? 'text' : 'password') : type}
          value={value}
          readOnly={readOnly}
          autoComplete={autoComplete}
          onChange={(event) => onChange?.(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-blue-500/30 ${
            isPassword ? 'pr-10' : ''
          } ${readOnly ? 'bg-slate-100 text-slate-600' : 'bg-white'} ${
            error ? 'border-rose-400' : 'border-slate-200 focus:border-blue-500'
          }`}
        />
        {isPassword && !readOnly ? (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? `Hide ${label}` : `Show ${label}`}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600 focus:outline-none"
          >
            {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          </button>
        ) : null}
      </div>
      {hint && !error ? <p id={`${id}-hint`} className="text-xs text-slate-500">{hint}</p> : null}
      {error ? <p id={`${id}-error`} className="text-xs font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}

function PasswordRequirements({ password, confirmation }: { password: string; confirmation?: string }) {
  const rules = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter (a-z)', met: /[a-z]/.test(password) },
    { label: 'One number (0-9)', met: /[0-9]/.test(password) },
    { label: 'One special character (!@#$%...)', met: /[^A-Za-z0-9]/.test(password) },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2 text-xs">
      <p className="font-semibold text-slate-700">Password requirements:</p>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {rules.map((rule) => (
          <div
            key={rule.label}
            className={`flex items-center gap-1.5 transition-colors ${
              rule.met ? 'text-emerald-700 font-medium' : 'text-slate-500'
            }`}
          >
            {rule.met ? (
              <CheckCircle2 size={13} className="text-emerald-600 shrink-0" aria-hidden="true" />
            ) : (
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-300 ml-1 mr-0.5 shrink-0" aria-hidden="true" />
            )}
            <span>{rule.label}</span>
          </div>
        ))}
      </div>
      {confirmation !== undefined && confirmation.length > 0 ? (
        <div
          className={`pt-1.5 border-t border-slate-200/70 flex items-center gap-1.5 ${
            password === confirmation ? 'text-emerald-700 font-medium' : 'text-rose-600 font-medium'
          }`}
        >
          {password === confirmation ? (
            <CheckCircle2 size={13} className="text-emerald-600 shrink-0" aria-hidden="true" />
          ) : (
            <X size={13} className="text-rose-500 shrink-0" aria-hidden="true" />
          )}
          <span>{password === confirmation ? 'Passwords match' : 'Passwords do not match'}</span>
        </div>
      ) : null}
    </div>
  );
}

function Alert({ tone, children }: { tone: 'error' | 'success'; children: ReactNode }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`mb-4 rounded-xl border px-3.5 py-2.5 text-sm ${
        tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
      }`}
    >
      {children}
    </div>
  );
}

function SubmitButton({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
    >
      {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

/** Runs a form submission, splitting API errors into a message and field errors. */
function useSubmit() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    setFieldErrors({});
    try {
      await action();
    } catch (caught) {
      if (caught instanceof ApiError && Object.keys(caught.fieldErrors).length > 0) {
        setFieldErrors(Object.fromEntries(Object.entries(caught.fieldErrors).map(([key, messages]) => [key, messages[0]])));
      } else {
        setError(caught instanceof Error ? caught.message : 'Something went wrong. Try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return { busy, error, fieldErrors, run };
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState('');
  const { busy, error, fieldErrors, run } = useSubmit();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => setSent((await forgotPassword(email)).message));
  };

  return (
    <AuthShell title="Forgot password" subtitle="We'll email you a link to set a new password.">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {sent ? (
        <Alert tone="success">{sent}</Alert>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field id="email" label="Email address" type="email" value={email} onChange={setEmail} error={fieldErrors.email} autoComplete="email" />
          <SubmitButton busy={busy}>Send reset link</SubmitButton>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const mode = params.get('mode');
  const isVerify = mode === 'verify' || params.get('welcome') != null;
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [done, setDone] = useState('');
  const [clientError, setClientError] = useState<string | null>(null);
  const { busy, error, fieldErrors, run } = useSubmit();

  const isLengthValid = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmation;
  const allCriteriaMet = isLengthValid && hasUppercase && hasLowercase && hasNumber && hasSpecial && passwordsMatch;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setClientError(null);
    if (!isLengthValid || !hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      setClientError('Please ensure your password satisfies all security requirements.');
      return;
    }
    if (!passwordsMatch) {
      setClientError('Passwords do not match.');
      return;
    }
    void run(async () => {
      setDone((await resetPassword({ token, email, password, password_confirmation: confirmation })).message);
    });
  };

  const activeError = clientError || error;

  return (
    <AuthShell
      title={isVerify ? 'Verify your account & set password' : 'Set a new password'}
      subtitle={isVerify ? 'Complete your account setup by creating a secure password.' : undefined}
    >
      {!token ? (
        <Alert tone="error">
          {isVerify
            ? 'This verification link is incomplete. Please request a new one from your administrator.'
            : 'This reset link is incomplete. Request a new one from the sign-in page.'}
        </Alert>
      ) : null}
      {activeError ? <Alert tone="error">{activeError}</Alert> : null}
      {done ? (
        <Alert tone="success">{isVerify ? 'Account verified successfully! You can now sign in with your new password.' : done}</Alert>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field id="email" label="Email address" type="email" value={email} onChange={setEmail} error={fieldErrors.email} autoComplete="email" readOnly={Boolean(email)} />
          <Field
            id="password"
            label={isVerify ? 'Choose password' : 'New password'}
            type="password"
            value={password}
            onChange={(val) => {
              setPassword(val);
              if (clientError) setClientError(null);
            }}
            error={fieldErrors.password}
            autoComplete="new-password"
          />
          <Field
            id="password_confirmation"
            label={isVerify ? 'Confirm password' : 'Confirm new password'}
            type="password"
            value={confirmation}
            onChange={(val) => {
              setConfirmation(val);
              if (clientError) setClientError(null);
            }}
            autoComplete="new-password"
          />

          <PasswordRequirements password={password} confirmation={confirmation} />

          <SubmitButton busy={busy || !token || !allCriteriaMet}>{isVerify ? 'Verify Account' : 'Reset password'}</SubmitButton>
        </form>
      )}
    </AuthShell>
  );
}

export function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', institutionCode: '', departmentCode: '' });
  const [done, setDone] = useState('');
  const { busy, error, fieldErrors, run } = useSubmit();
  const set = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => setDone((await registerStudent(form)).message));
  };

  return (
    <AuthShell title="Student registration" subtitle="Your institution approves new registrations.">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {done ? (
        <Alert tone="success">
          <span className="flex items-start gap-2">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            {done}
          </span>
        </Alert>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field id="name" label="Full name" value={form.name} onChange={set('name')} error={fieldErrors.name} autoComplete="name" />
          <Field id="email" label="Email address" type="email" value={form.email} onChange={set('email')} error={fieldErrors.email} autoComplete="email" />
          <Field
            id="password"
            label="Password"
            type="password"
            value={form.password}
            onChange={set('password')}
            error={fieldErrors.password}
            autoComplete="new-password"
            hint="At least 8 characters."
          />
          <Field
            id="institutionCode"
            label="Institution code"
            value={form.institutionCode}
            onChange={set('institutionCode')}
            error={fieldErrors.institutionCode}
            hint="The code your institution gave you."
          />
          <Field id="departmentCode" label="Department code" value={form.departmentCode} onChange={set('departmentCode')} error={fieldErrors.departmentCode} hint="For example CSE." />
          <SubmitButton busy={busy}>Register</SubmitButton>
        </form>
      )}
    </AuthShell>
  );
}

export function AcceptInvitationPage({ onSignedIn }: { onSignedIn: (response: AuthResponse) => void }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';
  const [invitation, setInvitation] = useState<InvitationPreview | null>(null);
  const [loadError, setLoadError] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const { busy, error, fieldErrors, run } = useSubmit();

  useEffect(() => {
    if (!token) {
      setLoadError('This invitation link is incomplete. Open the link from your email again.');
      return;
    }
    fetchInvitation(token)
      .then((response) => setInvitation(response.data))
      .catch((caught) =>
        setLoadError(caught instanceof ApiError && caught.status === 404 ? 'This invitation link is not valid. Ask your institution for a new one.' : String(caught?.message ?? caught)),
      );
  }, [token]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      const response = await acceptInvitation(token, { name, password, password_confirmation: confirmation });
      navigate(LOGIN_BASE_PATH, { replace: true });
      onSignedIn(response);
    });
  };

  const usable = invitation?.status === 'pending';

  return (
    <AuthShell
      title="Accept invitation"
      subtitle={invitation?.institutionName ? `Join ${invitation.institutionName}` : undefined}
    >
      {loadError ? <Alert tone="error">{loadError}</Alert> : null}
      {invitation && !usable ? <Alert tone="error">This invitation is {invitation.status}. Ask your institution for a new one.</Alert> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      {!invitation && !loadError ? (
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Loading invitation…
        </p>
      ) : null}
      {invitation && usable ? (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <p className="text-sm text-slate-600">
            You're invited as <strong>{roleLabels[invitation.role] ?? invitation.role}</strong>
            {invitation.departmentCode ? <> in <strong>{invitation.departmentCode}</strong></> : null}.
          </p>
          <Field id="email" label="Email address" value={invitation.email} readOnly />
          <Field id="name" label="Full name" value={name} onChange={setName} error={fieldErrors.name} autoComplete="name" />
          <Field
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            error={fieldErrors.password}
            autoComplete="new-password"
            hint="At least 8 characters."
          />
          <Field id="password_confirmation" label="Confirm password" type="password" value={confirmation} onChange={setConfirmation} autoComplete="new-password" />
          <SubmitButton busy={busy}>Create account</SubmitButton>
        </form>
      ) : null}
    </AuthShell>
  );
}
