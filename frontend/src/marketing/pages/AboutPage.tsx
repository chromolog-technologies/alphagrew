import {
  Briefcase,
  ClipboardList,
  Compass,
  Eye,
  FileSpreadsheet,
  GraduationCap,
  LockKeyhole,
  MessageSquareWarning,
  Scale,
  School,
  ShieldCheck,
  Target,
  UsersRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { FeatureCard, IconTile, RelatedLinks } from '../components/Cards';
import { CtaBand } from '../components/CtaBand';
import { CardGrid, PageHero, Section, SectionHeader, Split } from '../components/Layout';
import { PageMeta } from '../components/PageMeta';
import { BRAND, COMPANY } from '../config';
import { SITE_PAGES } from '../siteMap';

const FRAGMENTS = [
  {
    icon: FileSpreadsheet,
    title: 'Records live in separate spreadsheets',
    body: 'Marks, backlogs and student details sit with different departments, so every eligibility list is rebuilt by hand.',
  },
  {
    icon: MessageSquareWarning,
    title: 'Notices travel through message groups',
    body: 'Drive announcements, forms and deadlines are scattered, and students miss what applies to them.',
  },
  {
    icon: UsersRound,
    title: 'Preparation reaches only a few',
    body: 'A small training team cannot give hundreds of final-year students the interview practice they need.',
  },
  {
    icon: Briefcase,
    title: 'Recruiters get lists, not context',
    body: 'Companies receive spreadsheets of names, with little that shows who meets the criteria or who is prepared.',
  },
];

const PILLARS = [
  {
    icon: GraduationCap,
    title: 'Student preparation',
    body: 'Profiles, resumes and AI interview practice that build readiness long before the first drive.',
  },
  {
    icon: ClipboardList,
    title: 'Institutional coordination',
    body: 'Academic records, eligibility and drive management for the placement cell, faculty and leadership.',
  },
  {
    icon: Briefcase,
    title: 'Recruitment opportunities',
    body: 'Drives and candidate lists built from records the institution has verified.',
  },
];

const PRINCIPLES = [
  {
    icon: GraduationCap,
    title: 'Students come first',
    body: 'Every feature should leave a student better prepared or better informed. Students see their own data and feedback.',
  },
  {
    icon: Scale,
    title: 'AI assists, people decide',
    body: 'AI helps students practise and helps staff prioritise. It never makes a hiring, admission or academic decision.',
  },
  {
    icon: LockKeyhole,
    title: 'The institution owns its data',
    body: "Each institution's data is kept separate and processed only to provide the service.",
  },
  {
    icon: ShieldCheck,
    title: 'Honest about what exists',
    body: 'We label every feature as in the current build, in development or planned, and never present a mockup as a live product.',
  },
  {
    icon: School,
    title: 'Built for how campuses work',
    body: 'Semesters, departments, cut-offs, backlogs and offer policies are part of the product, not afterthoughts.',
  },
  {
    icon: Target,
    title: 'Evidence over impressions',
    body: 'Readiness comes from what students have actually done: their profile, resume and practice, not self-ratings alone.',
  },
];

export default function AboutPage() {
  return (
    <>
      <PageMeta page="about" />
      <PageHero
        page="about"
        eyebrow="About us"
        title="Connecting how students prepare, how institutions coordinate and how recruiters hire."
        lede={`${BRAND} is a campus placement and career intelligence platform developed by ${COMPANY}. We are building it so that preparation, and the placement process around it, reaches the whole batch.`}
      />

      <Section labelledBy="problem-title">
        <SectionHeader
          id="problem-title"
          eyebrow="The problem"
          title="Placement work is split across too many places"
          lede="In many institutions, the information a placement season depends on is scattered. Each piece works on its own, but nothing connects them."
        />
        <CardGrid cols={4}>
          {FRAGMENTS.map((item) => (
            <FeatureCard key={item.title} icon={item.icon} title={item.title}>
              <p>{item.body}</p>
            </FeatureCard>
          ))}
        </CardGrid>
      </Section>

      <Section tone="dark" labelledBy="connect-title">
        <SectionHeader
          id="connect-title"
          eyebrow="Our approach"
          title="One student record that connects three kinds of work"
          lede={`${BRAND} links preparation, coordination and opportunity, so each step uses what the previous one already captured.`}
        />
        <div className="relative">
          <span aria-hidden="true" className="absolute left-[16%] right-[16%] top-[2.9rem] hidden h-px bg-gradient-to-r from-iris-400/0 via-aqua-300/60 to-iris-400/0 lg:block" />
          <ol className="relative m-0 grid list-none gap-5 p-0 lg:grid-cols-3">
          {PILLARS.map((pillar) => (
            <li key={pillar.title} className="mk-card relative items-center text-center">
              <IconTile icon={pillar.icon} />
              <h3 className="mk-h3">{pillar.title}</h3>
              <p className="text-ink-200">{pillar.body}</p>
            </li>
          ))}
          </ol>
        </div>
      </Section>

      <Section labelledBy="mission-title">
        <h2 id="mission-title" className="sr-only">
          Mission and vision
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="mk-card gap-4 p-8">
            <IconTile icon={Compass} />
            <p className="mk-eyebrow">Mission</p>
            <p className="font-display text-2xl font-semibold leading-snug text-ink-900">
              Give every student structured preparation and a fair shot at opportunity, and give institutions one connected
              system to run placements.
            </p>
          </div>
          <div className="mk-card gap-4 p-8">
            <IconTile icon={Eye} />
            <p className="mk-eyebrow">Vision</p>
            <p className="font-display text-2xl font-semibold leading-snug text-ink-900">
              Institutions that move from simply managing students to continuously measuring, developing and improving their
              career readiness.
            </p>
          </div>
        </div>
      </Section>

      <Section tone="muted" labelledBy="principles-title">
        <SectionHeader id="principles-title" eyebrow="What we believe" title="Product principles" />
        <CardGrid cols={3}>
          {PRINCIPLES.map((item) => (
            <FeatureCard key={item.title} icon={item.icon} title={item.title}>
              <p>{item.body}</p>
            </FeatureCard>
          ))}
        </CardGrid>
      </Section>

      <Section labelledBy="company-title">
        <Split align="start">
          <div className="flex flex-col gap-4">
            <p className="mk-eyebrow">Who builds it</p>
            <h2 id="company-title" className="mk-h2">
              {BRAND} and {COMPANY}
            </h2>
          </div>
          <div className="flex flex-col gap-4 text-lg leading-relaxed text-ink-700">
            <p>
              {BRAND} is a product developed by {COMPANY}. {COMPANY} designs, builds and maintains the platform; {BRAND} is the
              name institutions, placement teams, students and recruiters see and use.
            </p>
            <p>
              Registered company details, and the terms under which institutions use {BRAND}, will be published in the{' '}
              <Link to={SITE_PAGES.privacy.path} className="mk-link">
                Privacy Policy
              </Link>{' '}
              and{' '}
              <Link to={SITE_PAGES.terms.path} className="mk-link">
                Terms
              </Link>{' '}
              before launch.
            </p>
          </div>
        </Split>
      </Section>

      <Section tone="muted" tight>
        <RelatedLinks
          links={[
            { to: SITE_PAGES.platform.path, label: 'Platform and features', description: 'Every feature area and its build status.' },
            { to: SITE_PAGES.howItWorks.path, label: 'How it works', description: 'The placement season, stage by stage.' },
            { to: SITE_PAGES.solutions.path, label: 'Solutions by role', description: 'What changes for each of the five audiences.' },
          ]}
        />
      </Section>

      <CtaBand title="Shape Alphagrew with us" lede="We are looking for institutions that want to help shape the product. Book a walkthrough of the current build." />
    </>
  );
}
