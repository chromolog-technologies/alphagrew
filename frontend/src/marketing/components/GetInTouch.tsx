import { useState, type FormEvent } from 'react';
import { Mail, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CONTACT, contactEmail } from '../config';
import {
  canSendDemoRequestsOnline,
  demoRequestMailto,
  REQUIRED_DEMO_FIELDS,
  sendDemoRequest,
  validateDemoRequest,
  type DemoRequest,
  type DemoRequestErrors,
} from '../demoRequest';
import { DEMO_PATH } from '../navigation';
import { SITE_PAGES } from '../siteMap';
import { Button } from './Button';
import { InlineAlert } from './Feedback';
import { TextField } from './Fields';
import { Container } from './Layout';

const EMPTY: DemoRequest = { name: '', email: '', institution: '', role: 'Other', phone: '', size: '', interests: [], message: 'Sent from the home page.' };

/**
 * "Get in touch" band from the Figma home page: a short form beside the company's contact
 * details. It sends the same demo request as the Contact page (Owner Console lead + email).
 */
export function GetInTouch() {
  const to = contactEmail();
  const [request, setRequest] = useState<DemoRequest>(EMPTY);
  const [errors, setErrors] = useState<DemoRequestErrors>({});
  const [website, setWebsite] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState('');

  const set = (key: 'name' | 'email' | 'institution' | 'phone', value: string) => {
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
    if (!canSendDemoRequestsOnline()) {
      window.location.href = demoRequestMailto(to, request);
      return;
    }
    setBusy(true);
    const result = await sendDemoRequest(request, website, 'home');
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

  return (
    <section aria-labelledby="get-in-touch-title" className="mk-section mk-tone-muted">
      <Container>
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
          <div className="flex flex-col gap-5">
            <p className="mk-eyebrow">Get in touch</p>
            <h2 id="get-in-touch-title" className="mk-h2">
              Talk to the AlphaGrew team
            </h2>
            <p className="mk-lede">
              We're here to help you explore AlphaGrew, answer your questions and set up a walkthrough for your institution.
            </p>
            <address className="mt-2 flex flex-col gap-4 not-italic">
              <a href={`mailto:${to}`} className="group inline-flex items-center gap-3 text-ink-700">
                <span className="mk-icon-tile !h-10 !w-10" aria-hidden="true">
                  <Mail size={18} strokeWidth={1.8} />
                </span>
                <span className="break-all font-medium group-hover:text-iris-700">{to}</span>
              </a>
              <a href={CONTACT.phoneHref} className="group inline-flex items-center gap-3 text-ink-700">
                <span className="mk-icon-tile !h-10 !w-10" aria-hidden="true">
                  <Phone size={18} strokeWidth={1.8} />
                </span>
                <span className="font-medium group-hover:text-iris-700">{CONTACT.phone}</span>
              </a>
              <span className="inline-flex items-start gap-3 text-ink-500">
                <span className="mk-icon-tile !h-10 !w-10" aria-hidden="true">
                  <MapPin size={18} strokeWidth={1.8} />
                </span>
                <span className="pt-2">{CONTACT.addressLines.join(', ')}</span>
              </span>
            </address>
          </div>

          {sent ? (
            <div className="mk-card gap-3 p-6 sm:p-8" role="status">
              <h3 className="mk-h3">Thank you, {request.name.trim().split(/\s+/)[0]}</h3>
              <p className="text-ink-500">
                We have your details and will contact you at <span className="font-semibold text-ink-900">{request.email.trim()}</span>{' '}
                soon. Want to tell us more?{' '}
                <Link to={DEMO_PATH} className="mk-link">
                  Fill in the full demo request
                </Link>
                .
              </p>
            </div>
          ) : (
            <form noValidate onSubmit={onSubmit} className="mk-card gap-5 p-6 sm:p-8" aria-label="Get in touch">
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField label="Full name" name="name" autoComplete="name" required value={request.name} error={errors.name} onChange={(e) => set('name', e.target.value)} />
                <TextField
                  label="Institution or company"
                  name="institution"
                  autoComplete="organization"
                  required
                  value={request.institution}
                  error={errors.institution}
                  onChange={(e) => set('institution', e.target.value)}
                />
                <TextField
                  label="Email address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  value={request.email}
                  error={errors.email}
                  onChange={(e) => set('email', e.target.value)}
                />
                <TextField label="Phone number" name="phone" type="tel" autoComplete="tel" placeholder="+91" value={request.phone} onChange={(e) => set('phone', e.target.value)} />
              </div>
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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button type="submit" arrow busy={busy}>
                  Send
                </Button>
                <p className="text-sm text-ink-500">
                  We use these details only to contact you.{' '}
                  <Link to={SITE_PAGES.privacy.path} className="mk-link">
                    Privacy Policy
                  </Link>
                </p>
              </div>
            </form>
          )}
        </div>
      </Container>
    </section>
  );
}
