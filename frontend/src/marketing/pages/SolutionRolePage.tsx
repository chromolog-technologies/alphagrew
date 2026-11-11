import { LockKeyhole } from 'lucide-react';
import { ButtonLink } from '../components/Button';
import { CapabilityList, FeatureCard, RelatedLinks } from '../components/Cards';
import { CtaBand } from '../components/CtaBand';
import { FaqList } from '../components/FaqList';
import { InlineAlert } from '../components/Feedback';
import { CardGrid, Container, PageHero, Section, SectionHeader, Split } from '../components/Layout';
import { PageMeta } from '../components/PageMeta';
import { SolutionNav } from '../components/SolutionNav';
import { ROLE_SOLUTIONS } from '../content/solutions';
import { SITE_PAGES, solutionRole, type SolutionRoleId } from '../siteMap';

/** One audience's landing page. All five share this template; content lives in content/solutions.tsx. */
export default function SolutionRolePage({ role }: { role: SolutionRoleId }) {
  const { page, label } = solutionRole(role);
  const solution = ROLE_SOLUTIONS[role];

  return (
    <>
      <PageMeta page={page} />
      <PageHero
        page={page}
        eyebrow={solution.eyebrow}
        title={solution.title}
        lede={solution.lede}
        actions={
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-3">
              <ButtonLink to={solution.cta.to} size="lg" arrow>
                {solution.cta.label}
              </ButtonLink>
              <ButtonLink to={{ hash: 'capabilities' }} variant="secondary" size="lg">
                See what's included
              </ButtonLink>
            </div>
            {solution.cta.note && <p className="text-sm text-ink-500">{solution.cta.note}</p>}
          </div>
        }
        aside={solution.preview}
      />

      <div className="border-b border-line bg-white py-4">
        <Container>
          <SolutionNav />
        </Container>
      </div>

      <Section labelledBy="pains-title">
        <SectionHeader id="pains-title" eyebrow="What gets in the way" title={`Challenges for ${label.toLowerCase()}`} />
        <CardGrid cols={3}>
          {solution.pains.map((pain) => (
            <FeatureCard key={pain.title} icon={pain.icon} title={pain.title}>
              <p>{pain.body}</p>
            </FeatureCard>
          ))}
        </CardGrid>
      </Section>

      <Section tone="muted" id="capabilities" labelledBy="capabilities-title">
        <Split align="start">
          <div className="flex flex-col gap-5">
            <p className="mk-eyebrow">Capabilities</p>
            <h2 id="capabilities-title" className="mk-h2">
              What Alphagrew provides
            </h2>
            <p className="mk-lede">{solution.capabilities.intro}</p>
            {solution.capabilities.note && <InlineAlert tone="info">{solution.capabilities.note}</InlineAlert>}
          </div>
          <div className="mk-card">
            <CapabilityList ids={solution.capabilities.ids} summaries={solution.capabilities.summaries} />
          </div>
        </Split>
      </Section>

      <Section labelledBy="workflow-title">
        <SectionHeader id="workflow-title" eyebrow="Workflow" title="How it works for you" />
        <ol className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-flow-col lg:auto-cols-fr lg:grid-cols-none">
          {solution.workflow.map((step, index) => (
            <li key={step.title} className="mk-card">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-iris-600 font-display text-sm font-bold text-white">
                {index + 1}
              </span>
              <h3 className="mk-h3">{step.title}</h3>
              <p className="text-sm text-ink-500">{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="dark" labelledBy="benefits-title">
        <SectionHeader id="benefits-title" eyebrow="Benefits" title={`What changes for ${label.toLowerCase()}`} />
        <CardGrid cols={3}>
          {solution.benefits.map((benefit) => (
            <div key={benefit.title} className="mk-card">
              <h3 className="mk-h3">{benefit.title}</h3>
              <p className="text-ink-200">{benefit.body}</p>
            </div>
          ))}
        </CardGrid>
      </Section>

      <Section labelledBy="faq-title">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.5fr] lg:gap-16">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <p className="mk-eyebrow">Questions</p>
              <h2 id="faq-title" className="mk-h2">
                Common questions
              </h2>
            </div>
            <div className="flex gap-3 rounded-2xl border border-line bg-mist-50 p-5">
              <LockKeyhole size={20} className="mt-0.5 shrink-0 text-iris-700" aria-hidden="true" />
              <div className="flex flex-col gap-1">
                <h3 className="mk-h3 text-base">Access and privacy</h3>
                <p className="text-sm text-ink-500">{solution.access}</p>
              </div>
            </div>
          </div>
          <FaqList items={solution.faqs} />
        </div>
      </Section>

      <Section tone="muted" tight>
        <RelatedLinks title="Related features" links={solution.related} />
      </Section>

      <CtaBand
        title={solution.closing.title}
        lede={solution.closing.lede}
        primary={{ to: solution.cta.to, label: solution.cta.label }}
        secondary={{ to: SITE_PAGES.solutions.path, label: 'See all solutions' }}
      />
    </>
  );
}
