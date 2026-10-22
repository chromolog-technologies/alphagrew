import { useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, LockKeyhole, Mail, ShieldCheck, Sparkles, Eye, EyeOff, UserCheck, GraduationCap, Briefcase, Building } from 'lucide-react';
import { campusBrand } from '../../campusDemoData';
import { goTo } from './AuthPages';

interface CampusLoginProps {
  error: string;
  onLogin: (credentials: { email: string; password: string }) => Promise<void> | void;
}

// Demo accounts are offered only in the dev server or a build made with VITE_DEMO_MODE=true.
const showDemoAccess = import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE === 'true';

export default function CampusLogin({ error, onLogin }: CampusLoginProps) {
  const [email, setEmail] = useState(showDemoAccess ? 'admin@demo.com' : '');
  const [password, setPassword] = useState(showDemoAccess ? 'demo123' : '');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const demoRoles = [
    { label: 'Admin', email: 'admin@demo.com', role: 'System Admin', icon: ShieldCheck, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { label: 'Placement', email: 'placement@demo.com', role: 'Placement Officer', icon: Briefcase, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { label: 'Faculty / HOD', email: 'hod.cse@demo.com', role: 'Department HOD', icon: Building, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { label: 'Student', email: 'student@demo.com', role: 'Candidate', icon: GraduationCap, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  ];

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onLogin({ email, password });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectRole = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('demo123');
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      {/* Background radial effects */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,111,238,0.08),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(99,102,241,0.08),_transparent_35%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="relative mx-auto w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="heroui-card p-6 sm:p-8 rounded-3xl bg-white/95 backdrop-blur-xl border border-zinc-200/90 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center gap-3.5 mb-6">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 text-white shadow-md shadow-blue-500/20">
              <img
                src="/alpha-logo.png"
                alt="Alpha Grew logo"
                className="h-8 w-8 rounded-xl object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                  {campusBrand.companyName}
                </span>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 border border-blue-100">
                  <Sparkles size={10} /> CRM
                </span>
              </div>
              <h1 className="truncate text-xl font-black tracking-tight text-zinc-900 mt-0.5">
                {campusBrand.campusName}
              </h1>
              <p className="text-xs text-zinc-500 font-medium">
                Sign in to your enterprise workspace
              </p>
            </div>
          </div>

          {/* Quick Demo Role Picker (development and demo builds only) */}
          {showDemoAccess && (
          <div className="mb-5 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center justify-between">
              <span>Quick Demo Access</span>
              <span className="text-[10px] text-zinc-400 font-normal lowercase">pwd: demo123</span>
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {demoRoles.map((demo) => {
                const isSelected = email === demo.email;
                const Icon = demo.icon;
                return (
                  <button
                    key={demo.label}
                    type="button"
                    onClick={() => handleSelectRole(demo.email)}
                    className={`flex items-center gap-2 rounded-xl p-2 text-left text-xs font-semibold transition border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-zinc-700 border-zinc-200/80 hover:bg-zinc-100'
                    }`}
                  >
                    <Icon size={14} className={isSelected ? 'text-white' : 'text-blue-600'} />
                    <span className="truncate">{demo.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail size={16} className="absolute left-3.5 text-zinc-400 pointer-events-none" />
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 pl-10 pr-4 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  placeholder="name@university.edu"
                  type="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                  Password
                </label>
                <a
                  href="/forgot-password"
                  onClick={(event) => { event.preventDefault(); goTo('/forgot-password'); }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative flex items-center">
                <LockKeyhole size={16} className="absolute left-3.5 text-zinc-400 pointer-events-none" />
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 pl-10 pr-10 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  placeholder="Enter password"
                  type={showPassword ? 'text' : 'password'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-zinc-400 hover:text-zinc-600"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In to Workspace</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <p className="text-center text-xs text-zinc-500">
              New student?{' '}
              <a
                href="/register"
                onClick={(event) => { event.preventDefault(); goTo('/register'); }}
                className="font-semibold text-blue-600 hover:text-blue-700"
              >
                Register with your institution code
              </a>
            </p>
          </form>

          {/* Security Footer */}
          <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400 font-medium">
            <span className="flex items-center gap-1">
              <ShieldCheck size={13} className="text-emerald-500" />
              Tenant Protected
            </span>
            <span>Version 2.4.0</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
