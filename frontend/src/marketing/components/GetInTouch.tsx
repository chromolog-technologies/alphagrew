import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { canSubmitOnline, describeSubmitError, submitDemoRequest } from '../demoRequest';
import { SITE_PAGES } from '../siteMap';
import { Button } from './Button';
import { ContactDetails } from './ContactDetails';
import { Honeypot, TextField } from './Fields';
import { InlineAlert } from './Feedback';
import { Section } from './Layout';

type Field = 'name' | 'email' | 'phone';

/**
 * Short "Get in touch" form near the end of the home page, for visitors who don't go on to
 * the Contact page. Saved as a website lead like the full demo form. Hidden when this build
 * has no API to save it to.
 */
export function GetInTouch() {
  const [values, setValues] = useState<Record<Field, string>>({ name: '', email: '', phone: '' });
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [failure, setFailure] = useState<string | null>(null);

  if (!canSubmitOnline()) return null;

  const set = (key: Field, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const found: Partial<Record<Field, string>> = {};
    if (!values.name.trim()) found.name = 'Enter your name.';
    if (!values.email.trim()) found.email = 'Enter your email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) found.email = 'Enter an email address like name@college.edu.in.';
    setErrors(found);
    setFailure(null);
    const first = (['name', 'email', 'phone'] as const).find((key) => found[key]);
    if (first) {
      form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }

    setStatus('sending');
    try {
      await submitDemoRequest({ ...values, form: 'get_in_touch', website: honeypot });
      setStatus('sent');
    } catch (error) {
      const { fields, message } = describeSubmitError(error);
      setErrors(fields);
      setFailure(message ?? null);
      setStatus('idle');
    }
  };

  return (
    <Section labelledBy="get-in-touch-title">
      <div className="mk-card relative grid gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_1.4fr] lg:items-center">
        <div className="flex flex-col gap-3">
          <p className="mk-eyebrow">Get in touch</p>
          <h2 id="get-in-touch-title" className="mk-h2 !text-[clamp(1.5rem,1.25rem+1vw,2.1rem)]">
            Leave your details and we will get back to you
          </h2>
          <p className="text-ink-500">
            Prefer the full form?{' '}
            <Link to={SITE_PAGES.contact.path} className="mk-link">
              Book a demo
            </Link>{' '}
            instead.
          </p>
          <ContactDetails className="mt-2" />
        </div>

        {status === 'sent' ? (
          <InlineAlert tone="success" title="Thank you">
            We have your details and will be in touch soon.
          </InlineAlert>
        ) : (
          <form noValidate onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-5" aria-labelledby="get-in-touch-title">
            <Honeypot value={honeypot} onChange={setHoneypot} />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label="Name" name="name" autoComplete="name" required value={values.name} error={errors.name} onChange={(e) => set('name', e.target.value)} />
              <TextField
                label="Email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={values.email}
                error={errors.email}
                onChange={(e) => set('email', e.target.value)}
              />
            </div>
            <TextField label="Phone" name="phone" type="tel" autoComplete="tel" placeholder="+91" value={values.phone} error={errors.phone} onChange={(e) => set('phone', e.target.value)} />
            {failure && (
              <InlineAlert tone="error" title="Your details were not sent">
                {failure} Please try again.
              </InlineAlert>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button type="submit" size="lg" arrow disabled={status === 'sending'}>
                {status === 'sending' ? 'Sending…' : 'Get in touch'}
              </Button>
              <p className="text-sm text-ink-500">
                Used only to contact you.{' '}
                <Link to={SITE_PAGES.privacy.path} className="mk-link">
                  Privacy Policy
                </Link>
              </p>
            </div>
          </form>
        )}
      </div>
    </Section>
  );
}
