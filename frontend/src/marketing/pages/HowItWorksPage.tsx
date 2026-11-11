import { Link } from 'react-router-dom';
import { RelatedLinks, StatusBadge, Step } from '../components/Cards';
import { CtaBand } from '../components/CtaBand';
import { InlineAlert } from '../components/Feedback';
import { PageHero, Section, SectionHeader } from '../components/Layout';
import { PageMeta } from '../components/PageMeta';
import { CAPABILITIES } from '../content/capabilities';
import { STAGES } from '../content/stages';
import { SITE_PAGES } from '../siteMap';


const PILOT = [
  ['Kick-off', 'Agree scope, departments and the batches in the pilot, and the features to switch on.', 'Principal or director, placement officer'],
  ['Data setup', 'Set up the academic structure and bring in students and faculty, then check the data together.', 'Office staff, heads of department'],
  ['Training', 'Short sessions for admins, the placement cell, faculty and student coordinators.', 'All roles'],
  ['First drive', 'Run a real or practice drive end to end on Alphagrew.', 'Placement officer, students'],
  ['Review', 'Look at usage and outcomes together and decide the next phase.', 'Leadership, placement officer'],
];

export default function HowItWorksPage() {
  return (
    <>
      <PageMeta page="howItWorks" />
      <PageHero
        page="howItWorks"
        eyebrow="How it works"
        title="From institution setup to placement outcomes, in eight stages."
        lede="Alphagrew follows the order a placement season actually runs in. Each stage builds on data the previous one captured, so nobody types the same thing twice."
      />

      <Section labelledBy="stages-title">
        <SectionHeader id="stages-title" eyebrow="End to end" title="The placement season on Alphagrew" />
        <div className="grid gap-10 lg:grid-cols-[15rem_1fr] lg:gap-16">
          <nav aria-label="Stages" className="hidden lg:block">
            <ol className="sticky top-28 m-0 flex list-none flex-col gap-1 p-0">
              {STAGES.map((stage, index) => (
                <li key={stage.id}>
                  <Link
                    to={{ hash: stage.id }}
                    className="flex gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-500 hover:bg-mist-50 hover:text-ink-900"
                  >
                    <span className="font-mono text-xs leading-5 text-iris-700">{String(index + 1).padStart(2, '0')}</span>
                    {stage.title}
                  </Link>
                </li>
              ))}
            </ol>
          </nav>

          <div className="flex min-w-0 flex-col gap-10">
            <InlineAlert tone="info" title="Your flow depends on your setup">
              The stages below describe the full product. Which steps you see depends on the features switched on for your
              institution and how it is configured, and some features are still in development or planned, as marked.
            </InlineAlert>

            <ol className="m-0 list-none p-0">
              {STAGES.map((stage, index) => (
                <Step key={stage.id} id={stage.id} index={index + 1} role={stage.role} title={stage.title}>
                  <div className="flex flex-col gap-4">
                    <p>{stage.body}</p>
                    <ul className="flex flex-wrap gap-2" aria-label={`Features used in ${stage.title}`}>
                      {stage.uses.map((id) => (
                        <li
                          key={id}
                          className="inline-flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-3 pr-1 text-sm text-ink-700"
                        >
                          {CAPABILITIES[id].name}
                          <StatusBadge status={CAPABILITIES[id].status} />
                        </li>
                      ))}
                    </ul>
                    {stage.link && (
                      <Link to={stage.link.to} className="mk-link self-start text-sm">
                        More about {stage.link.label}
                      </Link>
                    )}
                  </div>
                </Step>
              ))}
            </ol>
          </div>
        </div>
      </Section>

      <Section tone="muted" labelledBy="pilot-title">
        <SectionHeader
          id="pilot-title"
          eyebrow="Getting started"
          title="What a pilot looks like"
          lede="A proposed rollout. Timings depend on your data and academic calendar, and are agreed at kick-off."
        />
        <ol className="m-0 grid list-none gap-4 p-0 md:grid-cols-2 lg:grid-cols-5">
          {PILOT.map(([phase, what, who], index) => (
            <li key={phase} className="mk-card">
              <p className="font-mono text-xs font-semibold text-iris-700">Phase {index + 1}</p>
              <h3 className="mk-h3">{phase}</h3>
              <p className="text-sm text-ink-500">{what}</p>
              <p className="mt-auto text-xs font-medium text-ink-700">With: {who}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section tight>
        <RelatedLinks
          links={[
            { to: SITE_PAGES.platform.path, label: 'Platform and features', description: 'Every feature used above, with its build status.' },
            { to: SITE_PAGES.solutions.path, label: 'Solutions by role', description: 'What each stage means for your role.' },
            { to: SITE_PAGES.faq.path, label: 'FAQs', description: 'Setup effort, access, AI use and data protection.' },
          ]}
        />
      </Section>

      <CtaBand
        title="Plan your first season on Alphagrew"
        lede="Book a walkthrough and we will map these stages to your departments, batches and placement calendar."
        secondary={{ to: SITE_PAGES.platform.path, label: 'Explore the platform' }}
      />
    </>
  );
}
