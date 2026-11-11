import { useDeferredValue, useId, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CtaBand } from '../components/CtaBand';
import { FaqList } from '../components/FaqList';
import { PageHero, Section } from '../components/Layout';
import { PageMeta } from '../components/PageMeta';
import { FAQ_GROUPS } from '../content/faq';
import { SITE_PAGES } from '../siteMap';

export default function FaqPage() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const searchId = useId();

  const groups = useMemo(() => {
    if (!deferredQuery) return FAQ_GROUPS;
    return FAQ_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => `${item.question} ${item.text}`.toLowerCase().includes(deferredQuery)),
    })).filter((group) => group.items.length > 0);
  }, [deferredQuery]);

  const matchCount = groups.reduce((total, group) => total + group.items.length, 0);

  return (
    <>
      <PageMeta page="faq" />
      <PageHero
        page="faq"
        eyebrow="FAQs"
        title="Questions institutions ask us most."
        lede={
          <>
            Can't find what you need?{' '}
            <Link to={SITE_PAGES.contact.path} className="mk-link">
              Ask us directly
            </Link>
            .
          </>
        }
      />

      <Section labelledBy="faq-title">
        <h2 id="faq-title" className="sr-only">
          Frequently asked questions
        </h2>
        <div className="grid gap-10 lg:grid-cols-[14rem_1fr] lg:gap-16">
          <nav aria-label="FAQ sections" className="hidden lg:block">
            <ul className="sticky top-28 flex flex-col gap-1">
              {FAQ_GROUPS.map((group) => (
                <li key={group.id}>
                  <Link to={{ hash: group.id }} className="block rounded-lg px-3 py-2 text-sm font-medium text-ink-500 hover:bg-mist-50 hover:text-ink-900">
                    {group.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex min-w-0 flex-col gap-10">
            <div className="mk-field max-w-xl">
              <label htmlFor={searchId} className="mk-label">
                Search the FAQs
              </label>
              <div className="relative">
                <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" />
                <input
                  id={searchId}
                  type="search"
                  className="mk-input !pl-10"
                  placeholder="Try “recruiters”, “DPDP” or “phone”"
                  autoComplete="off"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <p role="status" className="mk-hint">
                {deferredQuery ? `${matchCount} ${matchCount === 1 ? 'question matches' : 'questions match'}` : ''}
              </p>
            </div>

            {groups.length === 0 && (
              <p className="text-ink-500">
                No questions match that.{' '}
                <Link to={SITE_PAGES.contact.path} className="mk-link">
                  Ask us instead
                </Link>
                .
              </p>
            )}

            {groups.map((group) => (
              <section key={group.id} id={group.id} aria-labelledby={`${group.id}-title`}>
                <h3 id={`${group.id}-title`} className="mk-h3 mb-2 text-xl">
                  {group.title}
                </h3>
                <FaqList items={group.items} open={Boolean(deferredQuery)} />
              </section>
            ))}
          </div>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
