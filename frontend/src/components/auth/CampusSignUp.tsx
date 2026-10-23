import { useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { isApiError } from '../../api/apiError';

export interface SignUpPayload {
  name: string;
  email: string;
  password: string;
  institutionCode: string;
  departmentCode: string;
}

interface CampusSignUpProps {
  onRegister: (payload: SignUpPayload) => Promise<void>;
  onShowLogin: () => void;
}

type FieldName = keyof SignUpPayload;

const fields: { name: FieldName; label: string; type: string; autoComplete: string; hint?: string; code?: boolean }[] = [
  { name: 'name', label: 'Full name', type: 'text', autoComplete: 'name' },
  { name: 'email', label: 'Email address', type: 'email', autoComplete: 'email' },
  {
    name: 'institutionCode',
    label: 'Institution code',
    type: 'text',
    autoComplete: 'off',
    hint: 'The code your placement office or admin gave you.',
    code: true,
  },
  {
    name: 'departmentCode',
    label: 'Department code',
    type: 'text',
    autoComplete: 'off',
    hint: 'For example CSE, ECE, ME or MBA.',
    code: true,
  },
  { name: 'password', label: 'Password', type: 'password', autoComplete: 'new-password', hint: 'At least 6 characters.' },
];

const emptyForm: SignUpPayload = { name: '', email: '', password: '', institutionCode: '', departmentCode: '' };

/**
 * Student self-registration (POST /auth/register). The backend refuses an unknown institution
 * code or a department that institution doesn't have, and returns a message per field.
 */
export default function CampusSignUp({ onRegister, onShowLogin }: CampusSignUpProps) {
  const [form, setForm] = useState<SignUpPayload>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setFormError('');

    try {
      await onRegister({
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        institutionCode: form.institutionCode.trim().toUpperCase(),
        departmentCode: form.departmentCode.trim().toUpperCase(),
      });
    } catch (registerError) {
      if (isApiError(registerError) && registerError.status === 422) {
        const nextErrors: Partial<Record<FieldName, string>> = {};
        fields.forEach((field) => {
          const message = registerError.fieldError(field.name);
          if (message) nextErrors[field.name] = message;
        });
        setFieldErrors(nextErrors);
        setFormError(Object.keys(nextErrors).length ? 'Fix the highlighted fields to continue.' : registerError.message);
      } else {
        setFormError(registerError instanceof Error ? registerError.message : 'Unable to create your account.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#edf6ff_100%)] px-4 py-8 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(11,77,136,0.11),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.16),_transparent_26%)]" />
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center justify-center">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[520px] rounded-[30px] border border-white/90 bg-white/94 p-5 shadow-[0_36px_84px_-44px_rgba(10,35,66,0.28)] backdrop-blur sm:p-7"
        >
          <button
            type="button"
            onClick={onShowLogin}
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[#0b5c9e] hover:text-[#08467a]"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back to sign in
          </button>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#0a2342]">Create your student account</h1>
          <p className="mt-1.5 text-[15px] leading-relaxed text-[#4d6d8f]">
            Use the institution code your placement office or admin gave you. You can only join one institution.
          </p>

          {formError ? (
            <div role="alert" className="mt-5 rounded-[14px] border border-[#f5c2bd] bg-[#fef3f2] px-4 py-3 text-sm text-[#8a1c12]">
              {formError}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} noValidate className="mt-6 grid gap-4 sm:grid-cols-2">
            {fields.map((field) => {
              const message = fieldErrors[field.name];
              const describedBy = message ? `signup-${field.name}-error` : field.hint ? `signup-${field.name}-hint` : undefined;
              const wide = !field.code;

              return (
                <div key={field.name} className={`flex flex-col gap-1.5 ${wide ? 'sm:col-span-2' : ''}`}>
                  <label htmlFor={`signup-${field.name}`} className="text-sm font-semibold text-[#123a66]">
                    {field.label}
                  </label>
                  <input
                    id={`signup-${field.name}`}
                    type={field.type}
                    autoComplete={field.autoComplete}
                    required
                    value={form[field.name]}
                    onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))}
                    aria-invalid={message ? true : undefined}
                    aria-describedby={describedBy}
                    className={`h-12 rounded-[12px] px-3.5 text-base text-[#0a2342] outline-none transition focus:ring-4 focus:ring-[#dff2fd] ${
                      field.code ? 'uppercase tracking-[0.08em]' : ''
                    } ${message ? 'border-2 border-[#b42318] bg-white' : 'border border-[#b9d0e6] bg-[#f8fbff] focus:border-[#67bee9] focus:bg-white'}`}
                  />
                  {message ? (
                    <span id={`signup-${field.name}-error`} className="text-[13px] leading-snug text-[#b42318]">
                      {message}
                    </span>
                  ) : field.hint ? (
                    <span id={`signup-${field.name}-hint`} className="text-[13px] leading-snug text-[#4d6d8f]">
                      {field.hint}
                    </span>
                  ) : null}
                </div>
              );
            })}

            <button
              type="submit"
              disabled={submitting}
              className="flex h-12 items-center justify-center gap-2 rounded-[12px] bg-[#0b4d88] text-base font-semibold text-white transition hover:bg-[#08467a] disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
            >
              {submitting ? 'Creating account...' : 'Create account'}
              {!submitting ? <ArrowRight size={18} aria-hidden="true" /> : null}
            </button>
          </form>
        </motion.section>
      </div>
    </div>
  );
}
