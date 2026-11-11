import { Link } from 'react-router-dom';
import { BRAND, COMPANY } from '../config';
import { FOOTER_NAV } from '../navigation';
import { Container } from './Layout';
import { Logo } from './Logo';

export function SiteFooter({ inert }: { inert?: boolean }) {
  return (
    <footer className="mk-tone-dark !bg-navy-900 pt-16 pb-10" inert={inert}>
      <Container>
        <div className="grid gap-12 lg:grid-cols-[1.2fr_2fr]">
          <div className="flex max-w-sm flex-col gap-4">
            <Logo onDark />
            <p className="text-sm leading-relaxed text-ink-200">
              An AI-first campus placement and career intelligence platform for institutions, placement officers, faculty,
              students and recruiters.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {FOOTER_NAV.map((column) => (
              <nav key={column.heading} aria-label={`${column.heading} links`}>
                <h2 className="mb-4 font-body text-sm font-semibold tracking-normal text-white">{column.heading}</h2>
                <ul className="flex flex-col gap-2.5">
                  {column.links.map((link) => (
                    <li key={link.to}>
                      <Link to={link.to} className="text-sm text-ink-200 transition-colors hover:text-white">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>
        <div className="mt-14 flex flex-col gap-3 border-t border-white/10 pt-8 text-sm text-ink-300 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {COMPANY}. All rights reserved.
          </p>
          <p>
            {BRAND} is a product of {COMPANY}.
          </p>
        </div>
      </Container>
    </footer>
  );
}
