import { useState, type FormEvent } from 'react';
import { Briefcase, CheckCircle2, GraduationCap } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, ButtonLink } from '../components/Button';
import { IconTile } from '../components/Cards';
import { ContactDetails, contactRows } from '../components/ContactDetails';
import { CheckboxGroup, Honeypot, SelectField, TextAreaField, TextField } from '../components/Fields';
import { InlineAlert } from '../components/Feedback';
import { PageHero, Section, Split } from '../components/Layout';
import { PageMeta } from '../components/PageMeta';
import { BRAND, contactEmail } from '../config';
import { canSubmitOnline, describeSubmitError, submitDemoRequest } from '../demoRequest';
import { SIGN_IN_PATH } from '../navigation';
import { SITE_PAGES } from '../siteMap';

const ROLES = ['Principal or director', 'Training and placement officer', 'Head of department', 'Faculty or trainer', 'Recruiter', 'Student', 'Other'] as const;
const SIZES = ['Under 500', '500 to 2,000', '2,000 to 5,000', 'Over 5,000'] as const;
const INTERESTS = ['Placement Management', 'AI Interviewer', 'Career Intelligence', 'Academic records'] as const;

interface DemoRequest {
  name: string;
  email: string;
  institution: string;
  role: string;
  phone: string;
  size: string;
  interests: string[];
  message: string;
}

type Errors = Partial<Record<keyof DemoRequest, string>>;

const EMPTY: DemoRequest = {
  name: '',
  email: '',
  institution: '',
  role: ROLES[1],
  phone: '',
  size: SIZES[1],
  interests: [],
  message: '',
};

const FIELD_ORDER = ['name', 'institution', 'email', 'phone', 'message'] as const;

export function validateDemoRequest(request: DemoRequest): Errors {
  const errors: Errors = {};
  if (!request.name.trim()) errors.name = 'Enter your name.';
  if (!request.institution.trim()) errors.institution = 'Enter your institution or company.';
  if (!request.email.trim()) errors.email = 'Enter your email address.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.email.trim())) errors.email = 'Enter an email address like name@college.edu.in.';
  return errors;
}

/** Builds a mailto: link so the request is sent from the visitor's own email app. */
export function demoRequestMailto(to: string, request: DemoRequest) {
  const lines = [
    `Name: ${request.name}`,
    `Email: ${request.email}`,
    `Institution or company: ${request.institution}`,
    `Role: ${request.role}`,
    request.phone && `Phone: ${request.phone}`,
    `Final and pre-final year students: ${request.size}`,
    request.interests.length > 0 && `Interested in: ${request.interests.join(', ')}`,
    request.message && `\n${request.message}`,
  ].filter(Boolean);
  const subject = `${BRAND} demo request: ${request.institution}`;
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
}

/** ?role=<solution id> from a role page's call to action preselects the matching role. */
const ROLE_FROM_SOLUTION: Record<string, (typeof ROLES)[number]> = {
  institutions: 'Principal or director',
  'placement-officers': 'Training and placement officer',
  faculty: 'Faculty or trainer',
  students: 'Student',
  recruiters: 'Recruiter',
};

/**
 * Online: saved straight into the Owner Console's sales pipeline as a new lead.
 * Email: no API in this build (offline demo), so it opens a pre-filled email instead.
 */
function DemoForm({ mode, to }: { mode: 'online' | 'email'; to: string }) {
  const [searchParams] = useSearchParams();
  const [request, setRequest] = useState<DemoRequest>(() => ({
    ...EMPTY,
    role: ROLE_FROM_SOLUTION[searchParams.get('role') ?? ''] ?? EMPTY.role,
  }));
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'handed-off'>('idle');
  const [failure, setFailure] = useState<string | null>(null);

  const set = <K extends keyof DemoRequest>(key: K, value: DemoRequest[K]) => {
    setRequest((current) => ({ ...current, [key]: value }));
    if (key in errors) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const focusFirst = (form: HTMLFormElement, found: Errors) => {
    const first = FIELD_ORDER.find((key) => found[key]);
    if (first) form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
    return Boolean(first);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const found = validateDemoRequest(request);
    setErrors(found);
    setFailure(null);
    if (focusFirst(form, found)) return;

    if (mode === 'email') {
      window.location.href = demoRequestMailto(to, request);
      setStatus('handed-off');
      return;
    }

    setStatus('sending');
    try {
      await submitDemoRequest({ ...request, form: 'demo', website: honeypot });
      setStatus('sent');
    } catch (error) {
      const { fields, message } = describeSubmitError(error);
      setErrors(fields as Errors);
      setFailure(message ?? null);
      setStatus('idle');
      focusFirst(form, fields as Errors);
    }
  };

  if (status === 'sent') {
    return (
      <div className="mk-card gap-4 p-6 sm:p-8" role="status">
        <CheckCircle2 size={32} aria-hidden="true" className="text-emerald-700" />
        <h2 id="demo-form-title" className="mk-h3 text-2xl">
          Thank you, {request.name.trim().split(/\s+/)[0]}
        </h2>
        <p className="text-ink-500">We have your request and will email {request.email.trim()} to arrange a time for your demo.</p>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={(e) => void onSubmit(e)} className="mk-card relative gap-6 p-6 sm:p-8" aria-labelledby="demo-form-title">
      <div className="flex flex-col gap-1">
        <h2 id="demo-form-title" className="mk-h3 text-2xl">
          Request a demo
        </h2>
        <p className="text-sm text-ink-500">
          Fields marked <span aria-hidden="true">*</span>
          <span className="sr-only">with an asterisk</span> are required.
        </p>
      </div>

      {mode === 'online' && <Honeypot value={honeypot} onChange={setHoneypot} />}

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Full name" name="name" autoComplete="name" required value={request.name} error={errors.name} onChange={(e) => set('name', e.target.value)} />
        <SelectField label="Your role" name="role" options={ROLES} value={request.role} onChange={(e) => set('role', e.target.value)} />
      </div>
      <TextField
        label="Institution or company"
        name="institution"
        autoComplete="organization"
        required
        value={request.institution}
        error={errors.institution}
        onChange={(e) => set('institution', e.target.value)}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Work email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={request.email}
          error={errors.email}
          onChange={(e) => set('email', e.target.value)}
        />
        <TextField
          label="Phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="+91"
          value={request.phone}
          error={errors.phone}
          onChange={(e) => set('phone', e.target.value)}
        />
      </div>
      <SelectField label="Final and pre-final year students" name="size" options={SIZES} value={request.size} onChange={(e) => set('size', e.target.value)} />
      <CheckboxGroup legend="Interested in" name="interests" options={INTERESTS} values={request.interests} onChange={(values) => set('interests', values)} />
      <TextAreaField
        label="Anything we should know?"
        name="message"
        placeholder="For example: we run around 40 drives a season across 6 departments"
        value={request.message}
        error={errors.message}
        onChange={(e) => set('message', e.target.value)}
      />

      {failure && (
        <InlineAlert tone="error" title="Your request was not sent">
          {failure} {contactRows().length > 0 ? 'You can also reach us directly:' : 'Please try again.'}
          <ContactDetails className="mt-2" />
        </InlineAlert>
      )}

      <div className="flex flex-col gap-3">
        <div>
          <Button type="submit" size="lg" arrow disabled={status === 'sending'}>
            {mode === 'email' ? 'Continue in your email app' : status === 'sending' ? 'Sending…' : 'Book a demo'}
          </Button>
        </div>
        <p className="text-sm text-ink-500">
          {mode === 'email' ? `This opens a pre-filled email to ${to} that you send yourself. ` : ''}
          We use these details only to arrange your demo. See our{' '}
          <Link to={SITE_PAGES.privacy.path} className="mk-link">
            Privacy Policy
          </Link>
          .
        </p>
      </div>

      {status === 'handed-off' && (
        <InlineAlert tone="success" title="Your email app should now be open">
          Send the pre-filled message from there. If nothing opened, email{' '}
          <a className="mk-link" href={`mailto:${to}`}>
            {to}
          </a>{' '}
          directly.
        </InlineAlert>
      )}
    </form>
  );
}

export default function ContactPage() {
  const to = contactEmail();
  const mode = canSubmitOnline() ? 'online' : to ? 'email' : null;
  const hasDetails = contactRows().length > 0;

  return (
    <>
      <PageMeta page="contact" />
      <PageHero
        page="contact"
        eyebrow="Contact us · Book a demo"
        title={`See ${BRAND} with your own departments and batches.`}
        lede="Tell us a little about your institution. We will set up a walkthrough and a sample drive that uses your eligibility rules."
      />

      <Section labelledBy="demo-form-title">
        <Split align="start" className="lg:grid-cols-[1.4fr_1fr]">
          {mode ? (
            <DemoForm mode={mode} to={to} />
          ) : (
            <div className="mk-card gap-4 p-6 sm:p-8">
              <h2 id="demo-form-title" className="mk-h3 text-2xl">
                Request a demo
              </h2>
              {hasDetails ? (
                <>
                  <p className="text-ink-500">Email or call us and we will set up a walkthrough for your institution.</p>
                  <ContactDetails />
                </>
              ) : (
                <InlineAlert tone="info" title="Online demo requests open soon">
                  The demo request form is not connected yet. If you already use {BRAND} at your institution, you can sign in below.
                </InlineAlert>
              )}
              <div>
                <ButtonLink to={SIGN_IN_PATH} variant="secondary">
                  Sign in
                </ButtonLink>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-8">
            {mode && hasDetails && (
              <div className="flex flex-col gap-3">
                <h2 className="mk-h3 text-base">Reach us directly</h2>
                <ContactDetails />
              </div>
            )}
            <div className="flex gap-4">
              <IconTile icon={Briefcase} />
              <div className="flex flex-col gap-1">
                <h2 className="mk-h3 text-base">Recruiters</h2>
                <p className="text-ink-500">Want to hire from campuses on {BRAND}? Choose "Recruiter" as your role and tell us the roles you hire for.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <IconTile icon={GraduationCap} />
              <div className="flex flex-col gap-1">
                <h2 className="mk-h3 text-base">Students</h2>
                <p className="text-ink-500">
                  Access comes through your institution. Ask your placement cell for an invitation, or{' '}
                  <Link to={SIGN_IN_PATH} className="mk-link">
                    sign in
                  </Link>{' '}
                  if you already have an account.
                </p>
              </div>
            </div>
          </div>
        </Split>
      </Section>
    </>
  );
}
