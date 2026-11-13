import {
  BarChart3,
  Bell,
  Bot,
  Briefcase,
  Building2,
  ClipboardList,
  FileSearch,
  Filter,
  GraduationCap,
  Mic,
  Settings2,
  Sparkles,
  Trophy,
  UserPlus,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ButtonLink } from '../components/Button';
import { CapabilityBadge, FeatureCard } from '../components/Cards';
import { CtaBand } from '../components/CtaBand';
import { FaqList } from '../components/FaqList';
import { CardGrid, Container, Section, SectionHeader, Split } from '../components/Layout';
import { DashboardMockup, DriveBoardMockup, InterviewMockup, ReadinessMockup } from '../components/mockups/Mockups';
import { PageMeta } from '../components/PageMeta';
import { CAPABILITIES, type CapabilityId } from '../content/capabilities';
import { FAQ_GROUPS } from '../content/faq';
import { STAGES } from '../content/stages';
import { DEMO_PATH } from '../navigation';
import { SITE_PAGES, SOLUTION_ROLES, solutionPath } from '../siteMap';

const ROLE_ICONS = {
  institutions: Building2,
  'placement-officers': ClipboardList,
  faculty: UsersRound,
  students: GraduationCap,
  recruiters: Briefcase,
} as const;

/** One line per audience on what changes for them; the card links to the full solution. */
const ROLE_VALUE: Record<(typeof SOLUTION_ROLES)[number]['id'], string> = {
  institutions: 'One view of readiness and placement outcomes across departments and campuses.',
  'placement-officers': 'Drives, applications and student communication in one place instead of spreadsheets.',
  faculty: "See which students need help with interviews and resumes while there's still time.",
  students: 'Build your profile, practise interviews and track every application yourself.',
  recruiters: 'Candidate lists built from records the college has verified.',
};

const HIGHLIGHTS: { icon: typeof Bot; title: string; body: string; capability: CapabilityId; to: string }[] = [
  {
    icon: ClipboardList,
    title: 'Placement drives',
    body: 'Companies, drives and applications managed by the placement cell, with policies applied consistently.',
    capability: 'placementDrives',
    to: SITE_PAGES.placementManagement.path,
  },
  {
    icon: FileSearch,
    title: 'Profiles and resumes',
    body: 'A career profile and resume for every student, with AI feedback on how to improve it.',
    capability: 'careerProfile',
    to: SITE_PAGES.careerIntelligence.path,
  },
  {
    icon: Filter,
    title: 'Eligibility checks',
    body: 'Branch, batch, aggregate and backlog rules checked against student records, not typed by hand.',
    capability: 'eligibilityEngine',
    to: SITE_PAGES.placementManagement.path,
  },
  {
    icon: Bot,
    title: 'AI mock interviews',
    body: 'Role-specific practice that follows up on weak answers and explains how to answer better.',
    capability: 'aiInterviewText',
    to: SITE_PAGES.aiInterviewer.path,
  },
  {
    icon: Sparkles,
    title: 'Career readiness',
    body: 'A readiness picture for each student, and for the batch, built from real evidence.',
    capability: 'careerReadiness',
    to: SITE_PAGES.careerIntelligence.path,
  },
  {
    icon: Bell,
    title: 'Notices and reports',
    body: 'Announcements to the right students, and placement figures that are already counted.',
    capability: 'announcements',
    to: SITE_PAGES.platform.path,
  },
];

const STEPS = [
  {
    title: 'Set up and prepare',
    body: 'The institution adds its structure and students. Students build profiles and resumes and practise interviews.',
  },
  {
    title: 'Match and apply',
    body: 'The placement cell publishes drives. Students see the roles they qualify for and apply in one place.',
  },
  {
    title: 'Place and improve',
    body: 'Rounds, results and offers are tracked to the end, and reports show where the next batch needs help.',
  },
];

/** One icon per How it works stage, in STAGES order, for the serpentine path. */
const STAGE_ICONS: LucideIcon[] = [Settings2, UserPlus, FileSearch, Filter, Mic, ClipboardList, Trophy, BarChart3];

/** Roles placed around the ecosystem diagram: label, angle in degrees (0 = top), and bubble colours. */
const ORBIT: { id: (typeof SOLUTION_ROLES)[number]['id']; angle: number; bg: string; fg: string }[] = [
  { id: 'students', angle: -40, bg: '#246bfc', fg: '#ffffff' },
  { id: 'faculty', angle: 32, bg: '#0f8a7e', fg: '#ffffff' },
  { id: 'placement-officers', angle: 104, bg: '#06234b', fg: '#ffffff' },
  { id: 'recruiters', angle: 176, bg: '#f5b30d', fg: '#06234b' },
  { id: 'institutions', angle: 248, bg: '#1557e0', fg: '#ffffff' },
];

/** The ecosystem diagram: the institution at the centre, each role around it. Decorative; the role cards below carry the links. */
function Ecosystem() {
  return (
    <div className="mk-orbit" aria-hidden="true">
      <span className="mk-orbit-ring inset-[6%]" />
      <span className="mk-orbit-ring inset-[18%] !border-solid !border-iris-100" />
      <div className="mk-orbit-core">
        <img src="/brand/alphagrew-mark.png" alt="" width={40} height={40} className="h-10 w-10" />
        <span className="font-display text-sm font-bold text-ink-900">Alphagrew</span>
        <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-iris-700">One record</span>
      </div>
      {ORBIT.map((item) => {
        const radians = (item.angle * Math.PI) / 180;
        const role = SOLUTION_ROLES.find((entry) => entry.id === item.id);
        return (
          <span
            key={item.id}
            className="mk-orbit-bubble"
            style={{
              left: `${50 + 40 * Math.sin(radians)}%`,
              top: `${50 - 40 * Math.cos(radians)}%`,
              background: item.bg,
              color: item.fg,
            }}
          >
            {role?.label}
          </span>
        );
      })}
    </div>
  );
}

const FAQ_PREVIEW = [
  'Is Alphagrew available today?',
  'Does the AI decide who gets placed?',
  'Can another institution see our data?',
  'How do students get access?',
];

const faqPreview = FAQ_PREVIEW.map((question) =>
  FAQ_GROUPS.flatMap((group) => group.items).find((item) => item.question === question),
).filter((item) => item !== undefined);

export default function HomePage() {
  return (
    <>
      <PageMeta page="home" />

      <section className="mk-tone-hero relative overflow-hidden pb-16 pt-12 sm:pb-24 sm:pt-16">
        <Container>
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
            <div className="flex flex-col gap-6">
              <p className="mk-eyebrow mk-rise">AI-powered campus placement and career intelligence</p>
              <h1 className="mk-display mk-rise mk-rise-1 text-ink-900">
                From campus learning to <span className="mk-gradient-text">career readiness.</span>
              </h1>
              <p className="mk-lede mk-rise mk-rise-2 max-w-xl">
                Alphagrew connects what students learn, how they prepare and how the placement cell runs each drive, so
                institutions, placement teams, students and recruiters work from the same record.
              </p>
              <div className="mk-rise mk-rise-3 flex flex-wrap gap-3 pt-1">
                <ButtonLink to={DEMO_PATH} size="lg" arrow>
                  Book a demo
                </ButtonLink>
                <ButtonLink to={SITE_PAGES.howItWorks.path} variant="secondary" size="lg">
                  See how it works
                </ButtonLink>
              </div>
              <p className="mk-rise mk-rise-3 max-w-xl text-sm text-ink-500">
                Alphagrew is in active development. Features are marked{' '}
                <strong className="font-semibold text-ink-900">In current build</strong>,{' '}
                <strong className="font-semibold text-ink-900">In development</strong> or{' '}
                <strong className="font-semibold text-ink-900">Planned</strong>.{' '}
                <Link to={SITE_PAGES.platform.path} className="mk-link">
                  See what each means
                </Link>
                .
              </p>
            </div>
            <DashboardMockup className="mk-rise mk-rise-2" />
          </div>
        </Container>
      </section>

      <Section labelledBy="steps-title">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_minmax(0,22rem)_1fr] lg:gap-10">
          <div className="flex flex-col gap-4">
            <p className="mk-eyebrow">How it works</p>
            <h2 id="steps-title" className="mk-h2">
              Three steps from first record to final offer
            </h2>
            <p>
              <Link to={SITE_PAGES.howItWorks.path} className="mk-link">
                See the full eight-stage flow
              </Link>
            </p>
          </div>
          <Ecosystem />
          <ol className="m-0 flex list-none flex-col gap-6 p-0">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-4 border-b border-line pb-6 last:border-0 last:pb-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mist-50 font-display text-sm font-bold text-iris-600 ring-1 ring-iris-100">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="font-display text-base font-bold text-ink-900">{step.title}</h3>
                  <p className="text-sm text-ink-500">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <Section tone="muted" labelledBy="audiences-title">
        <SectionHeader
          id="audiences-title"
          eyebrow="Who it's for"
          title="Everyone in the placement season, on one platform"
          lede="Each role gets the view it needs, from the same student record."
          align="center"
        />
        <div className="flex flex-wrap justify-center gap-5 lg:gap-6">
          {SOLUTION_ROLES.map((role) => (
            <div key={role.id} className="w-full md:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)] [&>*]:h-full">
              <FeatureCard icon={ROLE_ICONS[role.id]} title={role.label} to={solutionPath(role.id)} linkLabel="See the solution">
                <p>{ROLE_VALUE[role.id]}</p>
              </FeatureCard>
            </div>
          ))}
        </div>
      </Section>

      <Section labelledBy="season-title">
        <SectionHeader
          id="season-title"
          eyebrow="Step by step"
          title="The placement season on Alphagrew"
          lede="Alphagrew follows the order a placement season actually runs in. Each stage builds on data the previous one captured, so nobody types the same thing twice."
        />
        <ol className="mk-snake">
          {STAGES.map((stage, index) => {
            const Icon = STAGE_ICONS[index] ?? Sparkles;
            return (
              <li key={stage.id}>
                <span className="mk-snake-node">
                  <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-iris-700">{stage.role}</p>
                  <h3 className="font-display text-base font-bold leading-snug text-ink-900">{stage.title}</h3>
                  <p className="text-sm text-ink-500">{stage.body}</p>
                </div>
              </li>
            );
          })}
        </ol>
        <p className="mt-10 text-center">
          <ButtonLink to={SITE_PAGES.howItWorks.path} variant="secondary" arrow>
            See how it works
          </ButtonLink>
        </p>
      </Section>

      <Section tone="muted" labelledBy="ai-title">
        <Split>
          <div className="flex flex-col gap-5">
            <p className="mk-eyebrow">
              AI Interviewer <CapabilityBadge id="aiInterviewText" />
            </p>
            <h2 id="ai-title" className="mk-h2">
              A mock interview for every student, not just the top twenty
            </h2>
            <p className="mk-lede">
              Students practise for the role they want. The interviewer asks what a real panel would ask, follows up when an
              answer is vague and explains what a stronger answer includes.
            </p>
            <ul className="mk-ticks text-ink-700">
              <li>Questions shaped by the role and the student's branch</li>
              <li>Feedback on technical depth, problem solving and communication</li>
              <li>A practice tool only. Hiring decisions stay with people.</li>
            </ul>
            <div>
              <ButtonLink to={SITE_PAGES.aiInterviewer.path} variant="secondary" arrow>
                Explore the AI Interviewer
              </ButtonLink>
            </div>
          </div>
          <div className="mk-tone-dark rounded-[1.75rem] p-4 sm:p-8">
            <InterviewMockup />
          </div>
        </Split>
      </Section>

      <Section labelledBy="ci-title">
        <Split reverse>
          <div className="flex flex-col gap-5">
            <p className="mk-eyebrow">
              Career Intelligence <CapabilityBadge id="careerReadiness" />
            </p>
            <h2 id="ci-title" className="mk-h2">
              Know where every student stands before the first company arrives
            </h2>
            <p className="mk-lede">
              Profile, resume and interview evidence come together in one readiness picture, so training goes where the batch
              needs it most.
            </p>
            <div>
              <ButtonLink to={SITE_PAGES.careerIntelligence.path} variant="secondary" arrow>
                Explore Career Intelligence
              </ButtonLink>
            </div>
          </div>
          <div className="mk-tone-dark rounded-[1.75rem] p-4 sm:p-8">
            <ReadinessMockup />
          </div>
        </Split>
      </Section>

      <Section tone="muted" labelledBy="pm-title">
        <Split>
          <div className="flex flex-col gap-5">
            <p className="mk-eyebrow">
              Placement Management <CapabilityBadge id="placementDrives" />
            </p>
            <h2 id="pm-title" className="mk-h2">
              Every drive, round and offer in one list
            </h2>
            <p className="mk-lede">
              From the company's first email to the final offer list: who is eligible, who applied and where each student is
              in the process.
            </p>
            <ul className="mk-ticks text-ink-700">
              <li>Company and drive records the whole placement cell can see</li>
              <li>Applications in one place, with placement policies applied consistently</li>
              <li>Rounds, shortlists and offers, with every status change recorded</li>
            </ul>
            <div>
              <ButtonLink to={SITE_PAGES.placementManagement.path} variant="secondary" arrow>
                Explore Placement Management
              </ButtonLink>
            </div>
          </div>
          <div className="mk-tone-dark rounded-[1.75rem] p-4 sm:p-8">
            <DriveBoardMockup />
          </div>
        </Split>
      </Section>

      <Section labelledBy="features-title">
        <SectionHeader
          id="features-title"
          eyebrow="What's inside"
          title="The tools a placement season needs"
          lede="Every feature carries its build status, so you know what exists today and what is on the way."
          align="center"
        >
          <div>
            <ButtonLink to={SITE_PAGES.platform.path} variant="secondary" size="sm" arrow>
              All features and their status
            </ButtonLink>
          </div>
        </SectionHeader>
        <CardGrid cols={3}>
          {HIGHLIGHTS.map((item) => (
            <FeatureCard
              key={item.title}
              icon={item.icon}
              title={item.title}
              to={item.to}
              linkLabel="Explore features"
              status={CAPABILITIES[item.capability].status}
            >
              <p>{item.body}</p>
            </FeatureCard>
          ))}
        </CardGrid>
      </Section>

      <Section tone="muted" labelledBy="faq-preview-title">
        <Container narrow className="!px-0">
          <SectionHeader
            id="faq-preview-title"
            eyebrow="FAQs"
            title="Questions institutions ask first"
            lede="About availability, AI, data and access."
            align="center"
            className="!mb-8"
          />
          <div className="mk-card !gap-0 !py-2">
            <FaqList items={faqPreview} />
          </div>
          <p className="mt-8 text-center">
            <ButtonLink to={SITE_PAGES.faq.path} variant="secondary" arrow>
              Read all FAQs
            </ButtonLink>
          </p>
        </Container>
      </Section>

      <CtaBand
        title="See Alphagrew with your own departments and batches"
        lede="Book a walkthrough of the current build. We will show you how a placement season could run on Alphagrew, using your eligibility rules."
      />
    </>
  );
}
