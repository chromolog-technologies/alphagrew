import { useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Info, LockKeyhole, Mail } from 'lucide-react';
import { campusBrand } from '../../campusDemoData';
import { campusRoleLabels, type CampusRole } from '../../campusTypes';

const DEMO_PASSWORD = 'demo123';
// Set VITE_HIDE_DEMO_ACCOUNTS=true in a build that real users sign in to.
const showDemoAccounts = import.meta.env.VITE_HIDE_DEMO_ACCOUNTS !== 'true';

export interface DemoAccount {
  email: string;
  role: CampusRole;
  label: string;
}

interface CampusLoginProps {
  error: string;
  /** Information rather than a failure: expired session, recruiter portal not open, inactive institution. */
  notice?: string;
  demoAccounts?: DemoAccount[];
  onLogin: (credentials: { email: string; password: string }) => Promise<void> | void;
  onShowSignUp?: () => void;
}

function initialsOf(label: string) {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

export default function CampusLogin({ error, notice, demoAccounts = [], onLogin, onShowSignUp }: CampusLoginProps) {
  const [email, setEmail] = useState(demoAccounts[0]?.email ?? '');
  const [password, setPassword] = useState(demoAccounts.length ? DEMO_PASSWORD : '');
  const [submitting, setSubmitting] = useState(false);
  const pickerVisible = showDemoAccounts && demoAccounts.length > 0;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onLogin({ email, password });
    } finally {
      setSubmitting(false);
    }
  };

  const pickDemoAccount = (account: DemoAccount) => {
    setEmail(account.email);
    setPassword(DEMO_PASSWORD);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#edf6ff_100%)] px-4 py-8 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(11,77,136,0.11),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.16),_transparent_26%),radial-gradient(circle_at_bottom_left,_rgba(8,41,75,0.08),_transparent_24%)]" />
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex w-full flex-wrap items-stretch justify-center gap-5"
        >
          <section className="w-full max-w-[430px] flex-[1_1_380px] rounded-[30px] border border-white/90 bg-white/94 p-5 shadow-[0_36px_84px_-44px_rgba(10,35,66,0.28)] backdrop-blur sm:p-6">
            <div className="mb-5 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[linear-gradient(145deg,#082c56,#1da9ea)] p-2 shadow-[0_24px_48px_-28px_rgba(8,44,86,0.42)]">
                <div className="flex h-full w-full items-center justify-center rounded-[18px] bg-white">
                  <img
                    src="/alpha-logo.png"
                    alt="Alpha Grew logo"
                    className="h-9 w-9 rounded-xl object-contain"
                  />
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#4d6d8f]">
                  {campusBrand.companyName}
                </p>
                <h1 className="mt-1 truncate text-2xl font-bold tracking-tight text-[#0a2342]">
                  {campusBrand.campusName}
                </h1>
                <p className="mt-1 text-sm text-[#4d6d8f]">
                  Sign in to continue
                </p>
              </div>
            </div>

            {notice ? (
              <div role="status" className="mt-5 flex gap-3 rounded-[18px] border border-[#c7def3] bg-[#eef6ff] px-4 py-3 text-sm leading-relaxed text-[#123a66]">
                <Info size={18} className="mt-0.5 flex-shrink-0 text-[#0b5c9e]" aria-hidden="true" />
                <span>{notice}</span>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div className="space-y-2.5">
                <label htmlFor="login-email" className="text-sm font-semibold text-[#173a61]">Email Address</label>
                <div className="flex items-center gap-3 rounded-[18px] border border-[#d5e4f2] bg-[#f8fbff] px-4 py-3.5 transition focus-within:border-[#67bee9] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#dff2fd]">
                  <Mail size={20} className="text-[#7a9abb]" aria-hidden="true" />
                  <input
                    id="login-email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full border-none bg-transparent text-base text-[#0a2342] outline-none placeholder:text-[#7b94ae]"
                    placeholder="name@university.edu"
                    type="email"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <label htmlFor="login-password" className="text-sm font-semibold text-[#173a61]">Password</label>
                <div className="flex items-center gap-3 rounded-[18px] border border-[#d5e4f2] bg-[#f8fbff] px-4 py-3.5 transition focus-within:border-[#67bee9] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#dff2fd]">
                  <LockKeyhole size={20} className="text-[#7a9abb]" aria-hidden="true" />
                  <input
                    id="login-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full border-none bg-transparent text-base text-[#0a2342] outline-none placeholder:text-[#7b94ae]"
                    placeholder="Enter password"
                    type="password"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {error ? (
                <div role="alert" className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,#082c56,#1ba8e9)] px-4 py-3.5 text-base font-semibold text-white shadow-[0_24px_45px_-28px_rgba(8,44,86,0.55)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Signing in...' : 'Sign In'}
                {!submitting ? <ArrowRight size={18} /> : null}
              </button>
            </form>

            {onShowSignUp ? (
              <p className="mt-5 text-center text-sm text-[#4d6d8f]">
                New student?{' '}
                <button type="button" onClick={onShowSignUp} className="font-semibold text-[#0b5c9e] hover:text-[#08467a] hover:underline">
                  Create an account with your institution code
                </button>
              </p>
            ) : null}
          </section>

          {pickerVisible ? (
            <aside className="w-full max-w-[430px] flex-[1_1_320px] rounded-[30px] border border-white/90 bg-white/94 p-5 shadow-[0_36px_84px_-44px_rgba(10,35,66,0.28)] backdrop-blur sm:p-6">
              <h2 className="text-lg font-bold text-[#0a2342]">Demo accounts</h2>
              <p className="mt-1 text-sm text-[#4d6d8f]">
                Pick a role to fill the form. Password for all: <span className="font-semibold">{DEMO_PASSWORD}</span>
              </p>
              <div className="mt-4 space-y-2.5">
                {demoAccounts.map((account) => {
                  const selected = account.email === email;
                  return (
                    <button
                      key={account.email}
                      type="button"
                      onClick={() => pickDemoAccount(account)}
                      aria-pressed={selected}
                      className={`flex min-h-[60px] w-full items-center gap-3 rounded-[16px] px-3 py-2.5 text-left transition ${
                        selected ? 'border-2 border-[#0b4d88] bg-[#f2f8fe]' : 'border border-[#d5e4f2] bg-white hover:bg-[#f8fbff]'
                      }`}
                    >
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px] bg-[#e6f1fb] text-sm font-bold text-[#0b4d88]">
                        {initialsOf(campusRoleLabels[account.role])}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[15px] font-semibold text-[#0a2342]">{campusRoleLabels[account.role]}</span>
                        <span className="block truncate text-[13px] text-[#4d6d8f]">
                          {account.email}
                          {account.label !== campusRoleLabels[account.role] ? ` · ${account.label}` : ''}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-4 text-[13px] leading-relaxed text-[#4d6d8f]">
                Super Admin has no demo login. Create one with{' '}
                <code className="rounded-md bg-[#eef4fa] px-1.5 py-0.5 text-xs">php artisan alphagrew:super-admin</code>.
              </p>
            </aside>
          ) : null}
        </motion.div>
      </div>
    </div>
  );
}
