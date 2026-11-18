import { Mail, MapPin, Phone } from 'lucide-react';
import { cn } from '../../lib/utils';
import { contactAddress, contactEmail, contactPhone, telHref } from '../config';

/** Rows that are configured (VITE_CONTACT_EMAIL / _PHONE / _ADDRESS); empty ones are left out. */
export function contactRows() {
  const email = contactEmail();
  const phone = contactPhone();
  const address = contactAddress();
  return [
    email && { key: 'email', label: 'Email', icon: Mail, text: email, href: `mailto:${email}` },
    phone && { key: 'phone', label: 'Phone', icon: Phone, text: phone, href: telHref(phone) },
    address && { key: 'address', label: 'Address', icon: MapPin, text: address, href: undefined },
  ].filter((row): row is Exclude<typeof row, '' | false> => Boolean(row));
}

/** Email, phone and address as a compact list (footer, form fallbacks). */
export function ContactDetails({ onDark, className }: { onDark?: boolean; className?: string }) {
  const rows = contactRows();
  if (rows.length === 0) return null;

  return (
    <ul className={cn('flex flex-col gap-2.5 text-sm', onDark ? 'text-ink-200' : 'text-ink-700', className)}>
      {rows.map(({ key, label, icon: Icon, text, href }) => (
        <li key={key} className="flex items-start gap-2.5">
          <Icon size={16} aria-hidden="true" className={cn('mt-0.5 shrink-0', onDark ? 'text-ink-300' : 'text-iris-700')} />
          <span className="sr-only">{label}: </span>
          {href ? (
            <a href={href} className={cn('break-all transition-colors', onDark ? 'hover:text-white' : 'mk-link')}>
              {text}
            </a>
          ) : (
            <span>{text}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
