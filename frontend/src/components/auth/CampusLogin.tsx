import { useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, LockKeyhole, Mail, ShieldCheck, Sparkles, Eye, EyeOff, GraduationCap, Briefcase, Building, Info } from 'lucide-react';
import { campusBrand } from '../../campusDemoData';
import { type CampusRole } from '../../campusTypes';
import { Link } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Input,
  Label,
  Badge,
  Alert,
  AlertDescription,
} from '@/components/ui';

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

// Demo accounts are offered only in the dev server or a build made with VITE_DEMO_MODE=true.
const showDemoAccess = import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE === 'true';

export default function CampusLogin({ error, notice, demoAccounts, onLogin, onShowSignUp }: CampusLoginProps) {
  const [email, setEmail] = useState(demoAccounts?.[0]?.email ?? (showDemoAccess ? 'admin@demo.com' : ''));
  const [password, setPassword] = useState(showDemoAccess ? 'demo123' : '');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const demoRoles = [
    { label: 'Admin', email: 'admin@demo.com', role: 'System Admin', icon: ShieldCheck },
    { label: 'Placement', email: 'placement@demo.com', role: 'Placement Officer', icon: Briefcase },
    { label: 'Faculty / HOD', email: 'hod.cse@demo.com', role: 'Department HOD', icon: Building },
    { label: 'Student', email: 'student@demo.com', role: 'Candidate', icon: GraduationCap },
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
        >
          <Card className="rounded-3xl border-slate-200/90 shadow-2xl bg-white/95 backdrop-blur-xl">
            <CardHeader className="p-6 sm:p-8 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 text-white shadow-md shadow-blue-500/20">
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
                    <Badge variant="info" className="gap-1 py-0 px-1.5 text-[9px] font-bold rounded-full">
                      <Sparkles size={9} /> CRM
                    </Badge>
                  </div>
                  <CardTitle className="truncate text-xl font-black tracking-tight text-slate-900 mt-0.5">
                    {campusBrand.campusName}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 font-medium">
                    Sign in to your enterprise workspace
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 sm:p-8 pt-0 space-y-5">
              {/* Quick Demo Role Picker (development and demo builds only) */}
              {showDemoAccess && (
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                  <span>Quick Demo Access</span>
                  <span className="text-[10px] text-slate-400 font-normal lowercase">pwd: demo123</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {demoRoles.map((demo) => {
                    const isSelected = email === demo.email;
                    const Icon = demo.icon;
                    return (
                      <Button
                        key={demo.label}
                        type="button"
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleSelectRole(demo.email)}
                        className={`h-9 justify-start gap-2 rounded-xl text-xs font-semibold px-2.5 transition ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border-slate-200'
                        }`}
                      >
                        <Icon size={14} className={isSelected ? 'text-white' : 'text-blue-600 shrink-0'} />
                        <span className="truncate">{demo.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>
              )}

              {notice ? (
                <Alert className="py-2.5 px-3.5 rounded-xl border-blue-200 bg-blue-50/70 text-blue-800">
                  <Info size={15} className="text-blue-600 inline mr-1.5 -mt-0.5" />
                  <AlertDescription className="text-xs font-medium inline">
                    {notice}
                  </AlertDescription>
                </Alert>
              ) : null}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email" required className="text-xs uppercase tracking-wider text-slate-600">
                    Email Address
                  </Label>
                  <div className="relative flex items-center">
                    <Mail size={16} className="absolute left-3.5 text-slate-400 pointer-events-none z-10" />
                    <Input
                      id="login-email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="pl-10 h-10 text-sm bg-slate-50/60 focus:bg-white"
                      placeholder="name@university.edu"
                      type="email"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password" required className="text-xs uppercase tracking-wider text-slate-600">
                      Password
                    </Label>
                    <Link to="/forgot-password" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative flex items-center">
                    <LockKeyhole size={16} className="absolute left-3.5 text-slate-400 pointer-events-none z-10" />
                    <Input
                      id="login-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="pl-10 pr-10 h-10 text-sm bg-slate-50/60 focus:bg-white"
                      placeholder="Enter password"
                      type={showPassword ? 'text' : 'password'}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-1.5 h-7 w-7 text-slate-400 hover:text-slate-600"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </Button>
                  </div>
                </div>

                {error ? (
                  <Alert variant="destructive" className="py-2.5 px-3.5 rounded-xl">
                    <AlertDescription className="text-xs font-medium">
                      {error}
                    </AlertDescription>
                  </Alert>
                ) : null}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-sm font-semibold shadow-md shadow-blue-500/20 hover:shadow-lg transition-all"
                >
                  {submitting ? (
                    <span>Signing in...</span>
                  ) : (
                    <>
                      <span>Sign In to Workspace</span>
                      <ArrowRight size={16} className="ml-1" />
                    </>
                  )}
                </Button>

                <p className="text-center text-xs text-slate-500">
                  New student?{' '}
                  {onShowSignUp ? (
                    <button type="button" onClick={onShowSignUp} className="font-semibold text-blue-600 hover:text-blue-700">
                      Register with your institution code
                    </button>
                  ) : (
                    <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700">
                      Register with your institution code
                    </Link>
                  )}
                </p>
              </form>
            </CardContent>

            {/* Security Footer */}
            <CardFooter className="px-6 sm:px-8 py-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <ShieldCheck size={13} className="text-emerald-500" />
                Tenant Protected
              </span>
              <span>Version 2.4.0</span>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
