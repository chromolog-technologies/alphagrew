import { BarChart3, Bell, Building, CalendarClock, CheckSquare, Filter, Layers, Megaphone, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ButtonLink } from '../components/Button';
import { CapabilityBadge, RelatedLinks, StatusBadge } from '../components/Cards';
import { CtaBand } from '../components/CtaBand';
import { FaqList } from '../components/FaqList';
import { PageHero, Section, SectionHeader, Split } from '../components/Layout';
import { EligibilityMockup } from '../components/mockups/Mockups';
import { PlacementDashboardMockup } from '../components/mockups/ProductMockups';
import { PageMeta } from '../components/PageMeta';
import { BenefitList, BuildNote, FeatureDetails, UseCases, type Benefit, type ProductFeature, type UseCase } from '../components/ProductSections';
import { CAPABILITIES, type CapabilityId } from '../content/capabilities';
import type { FaqItem } from '../content/faq';
import { DEMO_PATH } from '../navigation';
import { SITE_PAGES, solutionPath } from '../siteMap';

const BENEFITS: Benefit[] = [
  { title: 'One record per drive', body: 'Company, job, dates and who may apply live in one place the whole placement cell can see.' },
  { title: 'Rules from records', body: 'Eligibility is meant to be read from academic records, not retyped into a spreadsheet for every company.' },
  { title: 'Students apply themselves', body: 'Students see open drives and apply in one step, and can follow their own applications.' },
  { title: 'Reports already counted', body: 'Placement figures by drive and batch come from the same records, not a separate tally.' },
];

/** The placement season, stage by stage. */
const PROCESS: { title: string; actor: string; body: string; capability: CapabilityId }[] = [
  {
    title: 'Company and job details',
    actor: 'Placement officer',
    body: 'Company, role, package, drive date and the departments the drive is open to.',
    capability: 'placementDrives',
  },
  {
    title: 'Eligibility rules',
    actor: 'Placement officer',
    body: 'CGPA, backlogs, attendance, department, batch, school scores, skills and profile completion, combined for each job.',
    capability: 'eligibilityEngine',
  },
  {
    title: 'Eligible student list',
    actor: 'Alphagrew',
    body: 'The students who meet every rule, built from live records, with the reason for each rule that fails.',
    capability: 'eligibilityEngine',
  },
  {
    title: 'Applications',
    actor: 'Student',
    body: 'Students apply to open jobs. Rules, deadlines and the placement policy are checked when they apply.',
    capability: 'placementDrives',
  },
  {
    title: 'Drive schedule',
    actor: 'Placement officer',
    body: 'Each round has its own date, and students are notified when it is scheduled.',
    capability: 'placementDrives',
  },
  {
    title: 'Notices and notifications',
    actor: 'Placement officer',
    body: 'Announcements to departments or batches, plus in-app and email notifications for jobs, rounds and offers. SMS is planned.',
    capability: 'notifications',
  },
  {
    title: 'Interview stages',
    actor: 'Placement officer',
    body: 'Aptitude, group discussion, technical and HR rounds, with shortlists per round.',
    capability: 'roundsOffers',
  },
  {
    title: 'Outcomes',
    actor: 'Placement officer',
    body: 'Results for each round, offers with deadlines and final placement records.',
    capability: 'roundsOffers',
  },
  {
    title: 'Reports',
    actor: 'Institution',
    body: 'Drive statistics and results by batch are in development. Downloadable report files are not built yet.',
    capability: 'analytics',
  },
];

const RULES: { criterion: string; example: string; source: string; capability: CapabilityId }[] = [
  { criterion: 'Department', example: 'CSE, IT and ECE only', source: "Student's department", capability: 'departmentEligibility' },
  { criterion: 'Graduating batch', example: 'Graduating in 2027', source: 'Academic year', capability: 'eligibilityEngine' },
  { criterion: 'CGPA or aggregate', example: '6.5 CGPA or 65% and above', source: 'Semester results', capability: 'eligibilityEngine' },
  { criterion: 'Active backlogs', example: 'None', source: 'Exam results', capability: 'eligibilityEngine' },
  { criterion: 'Offer policy', example: 'Students holding an offer above 6 LPA may not apply', source: 'Institution placement policy', capability: 'placementPolicy' },
];

const ACCESS: { role: string; can: string; capability: CapabilityId }[] = [
  { role: 'Institution admin', can: 'Sets roles, departments and placement policy; sees institution-wide reports.', capability: 'rolesPermissions' },
  { role: 'Placement officer', can: 'Creates and updates companies and drives, sees applications and drive statistics.', capability: 'placementDrives' },
  { role: 'Faculty', can: "Sees students' preparation only as the institution allows. A dedicated faculty view is planned.", capability: 'facultyInsights' },
  { role: 'Student', can: 'Sees drives open to them, applies, and follows their own applications.', capability: 'placementDrives' },
  { role: 'Recruiter', can: 'No direct access today. A portal for shared candidates is planned.', capability: 'recruiterPortal' },
];

const FEATURES: ProductFeature[] = [
  {
    icon: Building,
    title: 'Companies and drives',
    body: <p>Each company visit as a drive with role, package, date, status and the departments it is open to.</p>,
    capability: 'placementDrives',
    benefits: ['placement-officers', 'institutions'],
    why: "One shared record replaces each officer's own spreadsheet.",
  },
  {
    icon: Filter,
    title: 'Department limits',
    body: <p>Limit a drive to chosen departments. A student outside them cannot apply, and is told why.</p>,
    capability: 'departmentEligibility',
    benefits: ['placement-officers', 'students'],
    why: 'Fewer ineligible applications to remove by hand.',
  },
  {
    icon: Layers,
    title: 'Full eligibility rules',
    body: <p>Batch, CGPA or aggregate, backlogs and other criteria the institution configures, checked against live records.</p>,
    capability: 'eligibilityEngine',
    benefits: ['placement-officers', 'recruiters'],
    why: "Companies' criteria applied the same way for every student.",
  },
  {
    icon: CheckSquare,
    title: 'Applications',
    body: <p>Students apply in one step. Applying twice to the same drive does not create a second application.</p>,
    capability: 'placementDrives',
    benefits: ['students', 'placement-officers'],
    why: 'One place to see who applied to which drive.',
  },
  {
    icon: ShieldCheck,
    title: 'Placement policy',
    body: <p>Set one-offer, dream-offer, offer-deadline and application limits for the institution. They are checked automatically every time a student applies.</p>,
    capability: 'placementPolicy',
    benefits: ['institutions', 'placement-officers'],
    why: 'The policy is applied the same way for every student, without manual checks.',
  },
  {
    icon: Megaphone,
    title: 'Announcements',
    body: <p>Post notices to a department, a batch or the whole institution.</p>,
    capability: 'announcements',
    benefits: ['placement-officers', 'students'],
    why: 'Students get drive news in the place they already check.',
  },
  {
    icon: Bell,
    title: 'Notifications',
    body: <p>In-app and email alerts for new jobs, rounds, application updates and offers, which each person can tune. SMS is planned.</p>,
    capability: 'notifications',
    benefits: ['students'],
    why: 'Deadlines are harder to miss.',
  },
  {
    icon: CalendarClock,
    title: 'Rounds, shortlists and offers',
    body: <p>Interview stages with schedules, results per round, offers and placement records.</p>,
    capability: 'roundsOffers',
    benefits: ['placement-officers', 'recruiters'],
    why: 'Every candidate’s stage is visible without a phone call.',
  },
  {
    icon: BarChart3,
    title: 'Placement reports',
    body: <p>Drive statistics and results by batch, with exports for annual reports and accreditation planned.</p>,
    capability: 'analytics',
    benefits: ['institutions'],
    why: 'Leadership gets figures without a separate count.',
  },
];

const USE_CASES: UseCase[] = [
  {
    audience: 'placement-officers',
    title: 'Opening a drive in an afternoon',
    body: (
      <p>
        An officer records the company, role, package and date, limits it to CSE, IT and ECE, and posts an announcement to those
        departments.
      </p>
    ),
  },
  {
    audience: 'students',
    title: 'Applying without a form',
    body: <p>A final-year student sees the drives open to their department, applies in one step and follows the application.</p>,
  },
  {
    audience: 'institutions',
    title: 'Reviewing the season',
    body: (
      <p>
        Leadership looks at applications and results by batch to see which departments need more companies next year. Exported
        report files are still to come.
      </p>
    ),
  },
];

const FAQS: FaqItem[] = [
  {
    question: 'Can we set our own eligibility rules?',
    text: 'Yes. Each job can combine rules on CGPA, backlogs, attendance, department, batch, school scores, skills and profile completion. They are checked against student records rather than typed in.',
    answer: (
      <p>
        Yes. Each job can combine rules on CGPA, backlogs, attendance, department, batch, school scores, skills and profile
        completion. They are checked against student records rather than typed in, and students see which rule they missed.
      </p>
    ),
  },
  {
    question: 'Does Alphagrew email or text students automatically?',
    text: 'Email, yes: students get in-app and email notifications for new jobs, rounds, application updates and offers, and can choose which they receive. SMS is planned, not built.',
    answer: (
      <p>
        Email, yes: students get in-app and email notifications for new jobs, rounds, application updates and offers, and can choose
        which they receive. SMS is planned, not built.
      </p>
    ),
  },
  {
    question: 'Can a student apply twice by mistake?',
    text: 'Applying again to the same drive does not create a second application. We have not load-tested simultaneous requests, so we do not make guarantees about them.',
    answer: (
      <p>
        Applying again to the same drive does not create a second application. We have not load-tested simultaneous requests, so we
        do not make guarantees about them.
      </p>
    ),
  },
  {
    question: 'Does it connect to job portals, ATS or our ERP?',
    text: 'Not today. There are no integrations with job portals, applicant tracking systems or ERPs. Bulk import from spreadsheets is planned.',
    answer: (
      <p>
        Not today. There are no integrations with job portals, applicant tracking systems or ERPs. Bulk import from spreadsheets is
        planned.
      </p>
    ),
  },
  {
    question: 'Can recruiters log in?',
    text: 'Not yet. Recruiters work through the placement cell. A recruiter portal and shared candidate profiles are planned.',
    answer: (
      <p>
        Not yet. Recruiters work through the placement cell. A recruiter portal and shared candidate profiles are planned. See{' '}
        <Link to={solutionPath('recruiters')} className="mk-link">
          For recruiters
        </Link>
        .
      </p>
    ),
  },
  {
    question: 'Does a readiness score affect eligibility?',
    text: 'No. Eligibility comes only from the criteria a company and the institution set. Readiness and interview scores are for preparation.',
    answer: <p>No. Eligibility comes only from the criteria a company and the institution set. Readiness and interview scores are for preparation.</p>,
  },
];

export default function PlacementManagementPage() {
  return (
    <>
      <PageMeta page="placementManagement" />
      <PageHero
        page="placementManagement"
        eyebrow={
          <>
            Placement Management <CapabilityBadge id="placementDrives" />
          </>
        }
        title="Run the placement season from one shared record."
        lede="Companies, jobs, eligibility, applications, schedules, notices, rounds, outcomes and reports, in the order a placement cell works through them. Each institution sets its own rules, and each role sees only its part."
        actions={
          <>
            <ButtonLink to={DEMO_PATH} size="lg" arrow>
              Book a demo
            </ButtonLink>
            <ButtonLink to={{ hash: 'process' }} variant="secondary" size="lg">
              See the process
            </ButtonLink>
          </>
        }
        aside={<PlacementDashboardMockup />}
      />

      <Section tight labelledBy="benefits-title">
        <SectionHeader id="benefits-title" eyebrow="Why it helps" title="Less copying between spreadsheets, more time with students" />
        <BenefitList items={BENEFITS} />
        <BuildNote
          title="What's real today"
          items={[
            <>Jobs, eligibility rules, applications, rounds, offers, placement policy checks, announcements and email notifications are in the current build.</>,
            <>Placement reports are in development; downloadable report files are not built yet.</>,
            <>There is no SMS, and no integration with job portals, applicant tracking systems or ERPs.</>,
          ]}
        />
      </Section>

      <Section tone="muted" id="process" labelledBy="process-title">
        <SectionHeader
          id="process-title"
          eyebrow="The process"
          title="Nine stages from first contact to final report"
          lede="Each stage shows who does it and how far it is built. Your institution's set-up decides which stages you use."
        />
        <ol className="mk-flow" aria-label="Placement process stages">
          {PROCESS.map((stage) => (
            <li key={stage.title} className="mk-card gap-3 p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="mk-flow-index flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-iris-600 font-mono text-xs font-bold text-white" aria-hidden="true" />
                <StatusBadge status={CAPABILITIES[stage.capability].status} />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-iris-700">{stage.actor}</p>
                <h3 className="mk-h3 text-lg">{stage.title}</h3>
              </div>
              <p className="text-sm text-ink-500">{stage.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section labelledBy="rules-title">
        <SectionHeader
          id="rules-title"
          eyebrow="Eligibility"
          title="Rules the way companies write them"
          lede="Each criterion is meant to be read from a record Alphagrew already holds. Only department limits work today."
        />
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-start [&>*]:min-w-0">
          <div className="overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full min-w-[38rem] text-left text-sm">
              <caption className="sr-only">Example eligibility rules, where each is read from, and build status</caption>
              <thead className="bg-mist-50 text-ink-700">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Criterion</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Example</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Read from</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {RULES.map((rule) => (
                  <tr key={rule.criterion} className="border-t border-line">
                    <th scope="row" className="px-4 py-3 font-medium text-ink-900">{rule.criterion}</th>
                    <td className="px-4 py-3 text-ink-700">{rule.example}</td>
                    <td className="px-4 py-3 text-ink-500">{rule.source}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={CAPABILITIES[rule.capability].status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mk-tone-dark rounded-[1.75rem] p-4 sm:p-8">
            <EligibilityMockup />
          </div>
        </div>
      </Section>

      <Section tone="dark" labelledBy="access-title">
        <Split align="start">
          <div className="flex flex-col gap-5">
            <p className="mk-eyebrow">
              Roles and access <CapabilityBadge id="rolesPermissions" />
            </p>
            <h2 id="access-title" className="mk-h2">
              Each role sees its own part of a drive
            </h2>
            <p className="mk-lede">
              Permissions come from the role an institution gives each person. Records belong to one institution, and data isolation
              is being completed and tested.
            </p>
          </div>
          <ul className="flex flex-col gap-3">
            {ACCESS.map((row) => (
              <li key={row.role} className="mk-card gap-2 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="mk-h3 text-lg">{row.role}</h3>
                  <StatusBadge status={CAPABILITIES[row.capability].status} />
                </div>
                <p className="text-ink-200">{row.can}</p>
              </li>
            ))}
          </ul>
        </Split>
      </Section>

      <Section labelledBy="features-title">
        <SectionHeader id="features-title" eyebrow="Features" title="What Placement Management includes" lede="Who each feature helps, and how far along it is." />
        <FeatureDetails features={FEATURES} />
      </Section>

      <Section tone="muted" labelledBy="uses-title">
        <SectionHeader id="uses-title" eyebrow="Use cases" title="A few days in the placement cell" />
        <UseCases items={USE_CASES} />
      </Section>

      <Section labelledBy="limits-title">
        <Split align="start">
          <div className="flex flex-col gap-4">
            <p className="mk-eyebrow">Plain limits</p>
            <h2 id="limits-title" className="mk-h2">
              What we do not promise yet
            </h2>
          </div>
          <ul className="mk-ticks text-ink-700">
            <li>
              <strong className="text-ink-900">No automated messaging.</strong> Nothing is emailed or texted to students today.
            </li>
            <li>
              <strong className="text-ink-900">No third-party integrations.</strong> No job portal, applicant tracking or ERP
              connections.
            </li>
            <li>
              <strong className="text-ink-900">No concurrency guarantees.</strong> Repeat applications are ignored, but behaviour under
              heavy simultaneous use has not been load-tested.
            </li>
            <li>
              <strong className="text-ink-900">No automatic selection.</strong> Shortlists and offers are decided by people at the
              institution and the company.
            </li>
          </ul>
        </Split>
      </Section>

      <Section tone="muted" labelledBy="faq-title">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.5fr] lg:gap-16">
          <div className="flex flex-col gap-4">
            <p className="mk-eyebrow">Questions</p>
            <h2 id="faq-title" className="mk-h2">
              About Placement Management
            </h2>
            <p className="text-ink-500">
              More in the{' '}
              <Link to={SITE_PAGES.faq.path} className="mk-link">
                full FAQs
              </Link>
              .
            </p>
          </div>
          <FaqList items={FAQS} />
        </div>
      </Section>

      <Section tight>
        <RelatedLinks
          title="Who it's for, and what connects to it"
          links={[
            { to: solutionPath('placement-officers'), label: 'For placement officers', description: 'Drives and applications without the spreadsheets.' },
            { to: solutionPath('institutions'), label: 'For institutions', description: 'Policies, roles and season-wide reports.' },
            { to: solutionPath('recruiters'), label: 'For recruiters', description: 'Campus hiring through the placement cell.' },
            { to: SITE_PAGES.careerIntelligence.path, label: 'Career Intelligence', description: 'How ready students are for the drives you post.' },
            { to: SITE_PAGES.howItWorks.path, label: 'How it works', description: 'The whole season, including set-up.' },
          ]}
        />
      </Section>

      <CtaBand
        title="Walk through a drive with your own rules"
        lede="Book a demo and bring a recent drive notice. We will set it up in the current build and show you what works today and what is planned."
        secondary={{ to: solutionPath('placement-officers'), label: 'For placement officers' }}
      />
    </>
  );
}
