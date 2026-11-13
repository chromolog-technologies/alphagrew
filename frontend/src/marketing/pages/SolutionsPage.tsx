import { useEffect } from 'react';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { IconTile, RelatedLinks } from '../components/Cards';
import { CtaBand } from '../components/CtaBand';
import { PageHero, Section, SectionHeader, Split } from '../components/Layout';
import { PageMeta } from '../components/PageMeta';
import { SolutionNav } from '../components/SolutionNav';
import { ROLE_SOLUTIONS } from '../content/solutions';
import { SITE_PAGES, SOLUTION_ROLES, solutionPath, type SolutionRoleId } from '../siteMap';

/** What each role contributes to the shared student record. */
const CONTRIBUTION: Record<SolutionRoleId, string> = {
  institutions: 'Sets up departments, roles and placement policies.',
  'placement-officers': 'Brings in companies and runs each drive.',
  faculty: 'Keeps academic records current and supports preparation.',
  students: 'Builds a profile, practises and applies.',
  recruiters: 'Shares criteria and hires through the placement cell.',
};

/** Solutions hub: routes each audience to its own page. */
export default function SolutionsPage() {
  const { hash } = useLocation();
  const navigate = useNavigate();

  // Older links used /solutions#<role>; send them to the role's own page.
  useEffect(() => {
    const role = SOLUTION_ROLES.find((item) => `#${item.id}` === hash);
    if (role) navigate(solutionPath(role.id), { replace: true });
  }, [hash, navigate]);

  return (
    <>
      <PageMeta page="solutions" />
      <PageHero
        page="solutions"
        eyebrow="Solutions"
        title="One platform, five very different days at work."
        lede="Placement involves leadership, the placement cell, faculty, students and the companies that hire them. Choose your role to see what Alphagrew does for you."
        actions={<SolutionNav />}
      />

      <Section labelledBy="audiences-title">
        <h2 id="audiences-title" className="sr-only">
          Choose your role
        </h2>
        <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {SOLUTION_ROLES.map((role) => {
            const solution = ROLE_SOLUTIONS[role.id];
            return (
              <li key={role.id} className="mk-card mk-card-interactive">
                <IconTile icon={solution.icon} />
                <h3 className="mk-h3">
                  <Link to={solutionPath(role.id)} className="mk-card-link focus-visible:outline-none">
                    {role.label}
                  </Link>
                </h3>
                <p className="text-ink-500">{solution.lede}</p>
                <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-iris-700" aria-hidden="true">
                  {solution.cta.label}
                  <ArrowRight size={15} />
                </span>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section tone="muted" labelledBy="connect-title">
        <SectionHeader
          id="connect-title"
          eyebrow="Working together"
          title="Every role adds to the same student record"
          lede="What one role records is what the next one relies on, so nobody has to ask for the same information twice."
        />
        <ol className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-5">
          {SOLUTION_ROLES.map((role, index) => (
            <li key={role.id} className="mk-card gap-2 p-5">
              <p className="font-mono text-xs font-semibold text-iris-700">{String(index + 1).padStart(2, '0')}</p>
              <h3 className="mk-h3 text-lg">{role.label}</h3>
              <p className="text-sm text-ink-500">{CONTRIBUTION[role.id]}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section labelledBy="access-title">
        <Split align="start">
          <div className="flex flex-col gap-4">
            <IconTile icon={LockKeyhole} />
            <p className="mk-eyebrow">Access and privacy</p>
            <h2 id="access-title" className="mk-h2">
              Each role sees only what it needs
            </h2>
          </div>
          <ul className="mk-ticks text-ink-700">
            <li>Each institution's records are kept to that institution.</li>
            <li>Administrators decide what placement officers and faculty can see and change.</li>
            <li>Students see their own scores and feedback. Mock interview scores are not shared with recruiters.</li>
            <li>Recruiters will see only candidates for their own drives, and only the profile sections students chose to share.</li>
          </ul>
        </Split>
      </Section>

      <Section tone="muted" tight>
        <RelatedLinks
          links={[
            { to: SITE_PAGES.platform.path, label: 'Platform and features', description: 'Every feature area and its build status.' },
            { to: SITE_PAGES.howItWorks.path, label: 'How it works', description: 'The season, stage by stage.' },
            { to: SITE_PAGES.faq.path, label: 'FAQs', description: 'Availability, AI use, data and access.' },
          ]}
        />
      </Section>

      <CtaBand />
    </>
  );
}
