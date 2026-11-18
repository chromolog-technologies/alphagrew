import { useState, type FormEvent } from 'react';
import { Briefcase, GraduationCap, Mail, MapPin, Phone } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { IconTile } from '../components/Cards';
import { CheckboxGroup, SelectField, TextAreaField, TextField } from '../components/Fields';
import { InlineAlert } from '../components/Feedback';
import { PageHero, Section, Split } from '../components/Layout';
import { PageMeta } from '../components/PageMeta';
import { BRAND, CONTACT, contactEmail } from '../config';
import {
  canSendDemoRequestsOnline,
  DEMO_ROLES,
  DEMO_SIZES,
  demoRequestMailto,
  REQUIRED_DEMO_FIELDS,
  sendDemoRequest,
  validateDemoRequest,
  type DemoRequest,
  type DemoRequestErrors,
} from '../demoRequest';
import { SIGN_IN_PATH } from '../navigation';
import { SITE_PAGES } from '../siteMap';

const ROLES = DEMO_ROLES;
const SIZES = DEMO_SIZES;
const INTERESTS = ['Placement Management', 'AI Interviewer', 'Career Intelligence', 'Academic records'] as const;

type Errors = DemoRequestErrors;

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

// Kept as exports of this page for existing imports.
export { demoRequestMailto, validateDemoRequest };

/** ?role=<solution id> from a role page's call to action preselects the matching role. */
const ROLE_FROM_SOLUTION: Record<string, (typeof ROLES)[number]> = {
  institutions: 'Principal or director',
  'placement-officers': 'Training and placement officer',
  faculty: 'Faculty or trainer',
  students: 'Student',
  recruiters: 'Recruiter',
};

function DemoForm({ to }: { to: string }) {
  const [searchParams] = useSearchParams();
  const [request, setRequest] = useState<DemoRequest>(() => ({
    ...EMPTY,
    role: ROLE_FROM_SOLUTION[searchParams.get('role') ?? ''] ?? EMPTY.role,
  }));
  const [errors, setErrors] = useState<Errors>({});
  const [handedOff, setHandedOff] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState('');
  // Hidden from people; bots that fill every field are ignored by the API.
  const [website, setWebsite] = useState('');
  const sendsOnline = canSendDemoRequestsOnline();

  const set = <K extends keyof DemoRequest>(key: K, value: DemoRequest[K]) => {
    setRequest((current) => ({ ...current, [key]: value }));
    if (key in errors) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const found = validateDemoRequest(request);
    setErrors(found);
    setSendError('');
    const firstInvalid = REQUIRED_DEMO_FIELDS.find((key) => found[key]);
    if (firstInvalid) {
      form.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
      return;
    }

    // A site built without the API (static preview) falls back to the visitor's email app.
    if (!sendsOnline) {
      window.location.href = demoRequestMailto(to, request);
      setHandedOff(true);
      return;
    }

    setBusy(true);
    const result = await sendDemoRequest(request, website);
    setBusy(false);
    if (result.ok) {
      setSent(true);
      return;
    }
    setErrors(result.fieldErrors);
    const invalid = REQUIRED_DEMO_FIELDS.find((key) => result.fieldErrors[key]);
    if (invalid) form.querySelector<HTMLElement>(`[name="${invalid}"]`)?.focus();
    else setSendError(result.message);
  };

  if (sent) {
    return (
      <div className="mk-card gap-4 p-6 sm:p-8" role="status">
        <h2 id="demo-form-title" className="mk-h3 text-2xl">
          Thank you, {request.name.trim().split(/\s+/)[0]}
        </h2>
        <p className="text-ink-500">
          We have received your demo request for {request.institution.trim()}. Our team will contact you at{' '}
          <span className="font-semibold text-ink-900">{request.email.trim()}</span> to arrange a time.
        </p>
        <p className="text-sm text-ink-500">
          Need us sooner? Call{' '}
          <a className="mk-link" href={CONTACT.phoneHref}>
            {CONTACT.phone}
          </a>{' '}
          or email{' '}
          <a className="mk-link" href={`mailto:${to}`}>
            {to}
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} className="mk-card gap-6 p-6 sm:p-8" aria-labelledby="demo-form-title">
      <div className="flex flex-col gap-1">
        <h2 id="demo-form-title" className="mk-h3 text-2xl">
          Request a demo
        </h2>
        <p className="text-sm text-ink-500">
          Fields marked <span aria-hidden="true">*</span>
          <span className="sr-only">with an asterisk</span> are required.
        </p>
      </div>

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
        <TextField label="Phone" name="phone" type="tel" autoComplete="tel" placeholder="+91" value={request.phone} onChange={(e) => set('phone', e.target.value)} />
      </div>
      <SelectField label="Final and pre-final year students" name="size" options={SIZES} value={request.size} onChange={(e) => set('size', e.target.value)} />
      <CheckboxGroup legend="Interested in" name="interests" options={INTERESTS} values={request.interests} onChange={(values) => set('interests', values)} />
      <TextAreaField
        label="Anything we should know?"
        name="message"
        placeholder="For example: we run around 40 drives a season across 6 departments"
        value={request.message}
        onChange={(e) => set('message', e.target.value)}
      />

      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Leave this field empty
          <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>

      {sendError && (
        <InlineAlert tone="error" title={sendError}>
          Please try again, or email{' '}
          <a className="mk-link" href={`mailto:${to}`}>
            {to}
          </a>{' '}
          or call{' '}
          <a className="mk-link" href={CONTACT.phoneHref}>
            {CONTACT.phone}
          </a>
          .
        </InlineAlert>
      )}

      <div className="flex flex-col gap-3">
        <div>
          <Button type="submit" size="lg" arrow busy={busy}>
            {sendsOnline ? 'Request a demo' : 'Continue in your email app'}
          </Button>
        </div>
        <p className="text-sm text-ink-500">
          {sendsOnline ? 'We' : `This opens a pre-filled email to ${to} that you send yourself. We`} use these details only to arrange your demo. See our{' '}
          <Link to={SITE_PAGES.privacy.path} className="mk-link">
            Privacy Policy
          </Link>
          .
        </p>
      </div>

      {handedOff && (
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

  return (
    <>
      <PageMeta page="contact" />
      <PageHero
        page="contact"
        eyebrow="Contact us · Book a demo"
        title="See AlphaGrew with your own departments and batches."
        lede="Tell us a little about your institution. We will set up a walkthrough of the current build and a sample drive that uses your eligibility rules."
      />

      <Section labelledBy="demo-form-title">
        <Split align="start" className="lg:grid-cols-[1.4fr_1fr]">
          <DemoForm to={to} />

          <div className="flex flex-col gap-8">
            <div className="flex gap-4">
              <IconTile icon={Mail} />
              <div className="flex flex-col gap-1">
                <h2 className="mk-h3 text-base">Email</h2>
                <a className="mk-link break-all" href={`mailto:${to}`}>
                  {to}
                </a>
              </div>
            </div>
            <div className="flex gap-4">
              <IconTile icon={Phone} />
              <div className="flex flex-col gap-1">
                <h2 className="mk-h3 text-base">Phone</h2>
                <a className="mk-link" href={CONTACT.phoneHref}>
                  {CONTACT.phone}
                </a>
              </div>
            </div>
            <div className="flex gap-4">
              <IconTile icon={MapPin} />
              <div className="flex flex-col gap-1">
                <h2 className="mk-h3 text-base">Office</h2>
                <address className="not-italic text-ink-500">
                  {CONTACT.addressLines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </address>
                <a className="mk-link text-sm" href={CONTACT.mapsUrl} target="_blank" rel="noopener noreferrer">
                  Open in Google Maps<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </div>
            </div>
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
