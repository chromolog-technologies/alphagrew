import { useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Info,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@/components/ui';

export interface OwnerLoginProps {
  error: string;
  notice?: string;
  errorCode?: string;
  mfaChallengeToken?: string | null;
  onLogin: (credentials: { email: string; password: string }) => Promise<void> | void;
  onVerifyMfa: (challengeToken: string, code: string) => Promise<void> | void;
  onCancelMfa: () => void;
}

const showDemoAccess = import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE === 'true';
const OWNER_DEMO_EMAIL = 'owner@demo.com';

export default function OwnerLogin({
  error,
  notice,
  errorCode,
  mfaChallengeToken,
  onLogin,
  onVerifyMfa,
  onCancelMfa,
}: OwnerLoginProps) {
  const [email, setEmail] = useState(showDemoAccess ? OWNER_DEMO_EMAIL : '');
  const [password, setPassword] = useState(showDemoAccess ? 'demo123' : '');
  const [mfaCode, setMfaCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleCredentialsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onLogin({ email, password });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMfaSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!mfaChallengeToken) return;
    setSubmitting(true);
    try {
      await onVerifyMfa(mfaChallengeToken, mfaCode.trim());
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectDemo = () => {
    setEmail(OWNER_DEMO_EMAIL);
    setPassword('demo123');
  };

  const isMfaStep = Boolean(mfaChallengeToken);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.22),_transparent_45%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.14),_transparent_40%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:28px_28px]" />

      <div className="relative mx-auto w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          <Card className="rounded-3xl border-slate-800 bg-slate-900/95 text-slate-100 shadow-2xl backdrop-blur-xl">
            <CardHeader className="p-6 pb-4 sm:p-8 sm:pb-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 p-2 text-white shadow-md shadow-indigo-500/25">
                  <img src="/alpha-logo.png" alt="Alpha Grew logo" className="h-8 w-8 rounded-xl object-contain" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                      Chromolog Platform
                    </span>
                    <Badge className="gap-1 rounded-full bg-indigo-500/20 px-1.5 py-0 text-[9px] font-bold text-indigo-300 border-indigo-400/30">
                      OWNER
                    </Badge>
                  </div>
                  <CardTitle className="mt-0.5 truncate text-xl font-black tracking-tight text-white">
                    Owner Console
                  </CardTitle>
                  <CardDescription className="text-xs font-medium text-slate-400">
                    {isMfaStep
                      ? 'Enter the 6-digit code from your authenticator app'
                      : 'Sign in with your Chromolog operator credentials'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 p-6 pt-0 sm:p-8 sm:pt-0">
              {!isMfaStep && showDemoAccess ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <span>Demo Owner Account</span>
                    <span className="font-normal lowercase text-slate-500">pwd: demo123</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectDemo}
                    className={`h-9 w-full justify-between rounded-xl px-3 text-xs font-semibold transition ${
                      email === OWNER_DEMO_EMAIL
                        ? 'border-indigo-500 bg-indigo-600 text-white hover:bg-indigo-600 hover:text-white'
                        : 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <ShieldCheck size={14} className={email === OWNER_DEMO_EMAIL ? 'shrink-0 text-white' : 'shrink-0 text-indigo-400'} />
                      Platform Owner
                    </span>
                    <span className={email === OWNER_DEMO_EMAIL ? 'text-indigo-100' : 'text-slate-400'}>
                      {OWNER_DEMO_EMAIL}
                    </span>
                  </Button>
                </div>
              ) : null}

              {notice ? (
                <Alert className="rounded-xl border-indigo-500/30 bg-indigo-950/60 px-3.5 py-2.5 text-indigo-200">
                  <Info size={15} className="mr-1.5 -mt-0.5 inline text-indigo-400" />
                  <AlertDescription className="inline text-xs font-medium">{notice}</AlertDescription>
                </Alert>
              ) : null}

              {isMfaStep ? (
                <form onSubmit={handleMfaSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="owner-mfa-code" required className="text-xs uppercase tracking-wider text-slate-300">
                      Verification Code
                    </Label>
                    <div className="relative flex items-center">
                      <KeyRound size={16} className="pointer-events-none absolute left-3.5 z-10 text-slate-400" />
                      <Input
                        id="owner-mfa-code"
                        value={mfaCode}
                        onChange={(event) => setMfaCode(event.target.value)}
                        className="h-10 border-slate-700 bg-slate-950/70 pl-10 text-sm tracking-widest text-white placeholder:text-slate-500 focus:border-indigo-500 focus:bg-slate-950"
                        placeholder="123456"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        autoFocus
                        required
                      />
                    </div>
                  </div>

                  {error ? (
                    <Alert variant="destructive" className="rounded-xl border-rose-500/40 bg-rose-950/60 px-3.5 py-2.5 text-rose-200">
                      <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
                    </Alert>
                  ) : null}

                  <Button
                    type="submit"
                    disabled={submitting || mfaCode.trim().length < 6}
                    className="h-11 w-full rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-500"
                  >
                    {submitting ? <span>Verifying...</span> : <span>Verify &amp; Sign In</span>}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setMfaCode('');
                      onCancelMfa();
                    }}
                    className="h-9 w-full text-xs text-slate-400 hover:bg-slate-800 hover:text-white"
                  >
                    <ArrowLeft size={14} className="mr-1.5" />
                    Use a different operator account
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="owner-login-email" required className="text-xs uppercase tracking-wider text-slate-300">
                      Operator Email
                    </Label>
                    <div className="relative flex items-center">
                      <Mail size={16} className="pointer-events-none absolute left-3.5 z-10 text-slate-400" />
                      <Input
                        id="owner-login-email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="h-10 border-slate-700 bg-slate-950/70 pl-10 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:bg-slate-950"
                        placeholder="operator@chromolog.io"
                        type="email"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="owner-login-password" required className="text-xs uppercase tracking-wider text-slate-300">
                        Password
                      </Label>
                      <Link to="/forgot-password" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative flex items-center">
                      <LockKeyhole size={16} className="pointer-events-none absolute left-3.5 z-10 text-slate-400" />
                      <Input
                        id="owner-login-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="h-10 border-slate-700 bg-slate-950/70 pl-10 pr-10 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:bg-slate-950"
                        placeholder="Enter password"
                        type={showPassword ? 'text' : 'password'}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-1.5 h-7 w-7 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </Button>
                    </div>
                  </div>

                  {error ? (
                    <Alert variant="destructive" className="rounded-xl border-rose-500/40 bg-rose-950/60 px-3.5 py-2.5 text-rose-200">
                      <AlertDescription className="space-y-1.5 text-xs font-medium">
                        <p>{error}</p>
                        {errorCode === 'use_campus_login' ? (
                          <Link to="/login" className="inline-flex items-center gap-1 font-semibold text-indigo-300 underline hover:text-white">
                            Open Campus Workspace Sign-In <ArrowRight size={12} />
                          </Link>
                        ) : null}
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="h-11 w-full rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-500"
                  >
                    {submitting ? (
                      <span>Signing in...</span>
                    ) : (
                      <>
                        <span>Sign In to Owner Console</span>
                        <ArrowRight size={16} className="ml-1" />
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>

            <CardFooter className="flex items-center justify-between border-t border-slate-800 px-6 py-4 text-[11px] font-medium text-slate-400 sm:px-8">
              <span className="flex items-center gap-1">
                <ShieldCheck size={13} className="text-emerald-400" />
                Platform Operators Only
              </span>
              <Link to="/login" className="font-semibold text-indigo-400 hover:text-indigo-300">
                Campus sign-in &rarr;
              </Link>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

