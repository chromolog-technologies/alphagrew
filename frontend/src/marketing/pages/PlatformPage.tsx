import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ButtonLink } from '../components/Button';
import { CapabilityList, RelatedLinks, StatusLegend } from '../components/Cards';
import { CtaBand } from '../components/CtaBand';
import { PageHero, Section, SectionHeader, Split, type SectionTone } from '../components/Layout';
import {
  DriveBoardMockup,
  EligibilityMockup,
  FeedbackMockup,
  ReadinessMockup,
  ResumeMockup,
} from '../components/mockups/Mockups';
import { PageMeta } from '../components/PageMeta';
import type { CapabilityId } from '../content/capabilities';
import { SITE_PAGES } from '../siteMap';

interface FeatureGroup {
  id: string;
  eyebrow: string;
  title: string;
  lede: string;
  ids: CapabilityId[];
  visual?: ReactNode;
  link?: { to: string; label: string };
}

const GROUPS: FeatureGroup[] = [
  {
    id: 'placement-operations',
    eyebrow: 'Placement operations',
    title: 'Run every drive from one list',
    lede: 'The placement cell manages companies, drives and applications in one place, with institution policies applied the same way every time.',
    ids: ['placementDrives', 'placementPolicy', 'roundsOffers'],
    visual: <DriveBoardMockup />,
    link: { to: SITE_PAGES.placementManagement.path, label: 'Explore Placement Management' },
  },
  {
    id: 'profiles-resumes',
    eyebrow: 'Student profiles and resumes',
    title: 'One profile and resume per student, kept current',
    lede: 'Students keep their own career profile and resume up to date, and get feedback on how to make them stronger.',
    ids: ['careerProfile', 'resumeUpload', 'resumeAnalysis', 'documentVerification'],
    visual: <ResumeMockup />,
    link: { to: SITE_PAGES.careerIntelligence.path, label: 'Explore Career Intelligence' },
  },
  {
    id: 'opportunities-eligibility',
    eyebrow: 'Job opportunities and eligibility',
    title: 'Show each student the roles they qualify for',
    lede: "Company criteria are checked against the student's academic record, so eligible lists are built rather than typed, and students know why they do or don't qualify.",
    ids: ['eligibilityEngine', 'jobMatching'],
    visual: <EligibilityMockup />,
  },
  {
    id: 'interview-preparation',
    eyebrow: 'Assessments and interview preparation',
    title: 'Practice that looks like the real thing',
    lede: 'AI mock interviews ask role-specific questions and follow up on weak answers. Assessments will add aptitude and technical tests.',
    ids: ['aiInterviewText', 'interviewFeedback', 'aiInterviewVoice', 'assessments'],
    visual: <FeedbackMockup />,
    link: { to: SITE_PAGES.aiInterviewer.path, label: 'Explore the AI Interviewer' },
  },
  {
    id: 'readiness-insights',
    eyebrow: 'Career readiness insights',
    title: 'See readiness for a student and for a batch',
    lede: 'Readiness is built from evidence the platform already holds, so mentors and the placement cell can act before the season starts.',
    ids: ['careerReadiness', 'batchInsights'],
    visual: <ReadinessMockup />,
    link: { to: SITE_PAGES.careerIntelligence.path, label: 'Explore Career Intelligence' },
  },
  {
    id: 'notifications-reporting',
    eyebrow: 'Notifications and reporting',
    title: 'The right notice to the right students, and numbers already counted',
    lede: 'Announcements reach a department, batch or the whole institution. Reports give leadership placement figures without rebuilding them by hand.',
    ids: ['announcements', 'notifications', 'analytics', 'auditLog'],
  },
];

const FOUNDATIONS: CapabilityId[] = [
  'rolesPermissions',
  'onboarding',
  'academicStructure',
  'academicRecords',
  'tenantIsolation',
  'bulkImport',
  'recruiterPortal',
];

const ACCESS: [string, string, string, string, string][] = [
  ['Institution settings, users and roles', 'Manage', 'None', 'None', 'None'],
  ['Departments, courses and batches', 'Manage', 'View', 'View', 'None'],
  ['Student records', 'Manage', 'View', 'Own classes', 'Own record'],
  ['Attendance, exams and marks', 'View', 'None', 'Enter', 'Own record'],
  ['Companies, drives and applications', 'View', 'Manage', 'View', 'Apply to eligible drives'],
  ['Resume analysis and AI interviews', 'Summary', 'Summary', 'Own classes', 'Take and review own'],
  ['Reports', 'All', 'Placement', 'Own classes', 'None'],
];

function GroupSection({ group, tone }: { group: FeatureGroup; tone: SectionTone }) {
  const headingId = `${group.id}-title`;
  const text = (
    <div className="flex flex-col gap-5">
      <p className="mk-eyebrow">{group.eyebrow}</p>
      <h2 id={headingId} className="mk-h2">
        {group.title}
      </h2>
      <p className="mk-lede">{group.lede}</p>
      <div className="mk-card">
        <CapabilityList ids={group.ids} />
      </div>
      {group.link && (
        <div>
          <ButtonLink to={group.link.to} variant="secondary" size="sm" arrow>
            {group.link.label}
          </ButtonLink>
        </div>
      )}
    </div>
  );

  return (
    <Section id={group.id} tone={tone} labelledBy={headingId}>
      {group.visual ? (
        <Split reverse={tone === 'muted'}>
          {text}
          <div className="mk-tone-dark rounded-[1.75rem] p-4 sm:p-8">{group.visual}</div>
        </Split>
      ) : (
        <Split align="start">
          <div className="flex flex-col gap-5">
            <p className="mk-eyebrow">{group.eyebrow}</p>
            <h2 id={headingId} className="mk-h2">
              {group.title}
            </h2>
            <p className="mk-lede">{group.lede}</p>
          </div>
          <div className="mk-card">
            <CapabilityList ids={group.ids} />
          </div>
        </Split>
      )}
    </Section>
  );
}

export default function PlatformPage() {
  return (
    <>
      <PageMeta page="platform" />
      <PageHero
        page="platform"
        eyebrow="Platform and features"
        title="Everything a placement season needs, on one student record."
        lede="Six feature areas that share the same data, so each step uses what the previous one learned. Every feature is labelled with where it stands today."
        actions={
          <nav aria-label="Feature areas" className="flex flex-wrap gap-2">
            {GROUPS.map((group) => (
              <Link
                key={group.id}
                to={{ hash: group.id }}
                className="rounded-full border border-iris-200 bg-white px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:border-iris-400 hover:text-iris-700"
              >
                {group.eyebrow}
              </Link>
            ))}
          </nav>
        }
      />

      <Section tight tone="muted" labelledBy="legend-title">
        <h2 id="legend-title" className="mk-h3 mb-5">
          How to read this page
        </h2>
        <StatusLegend />
      </Section>

      {GROUPS.map((group, index) => (
        <GroupSection key={group.id} group={group} tone={index % 2 ? 'muted' : 'light'} />
      ))}

      <Section tone="dark" labelledBy="foundations-title">
        <Split align="start">
          <div className="flex flex-col gap-5">
            <p className="mk-eyebrow">Platform foundations</p>
            <h2 id="foundations-title" className="mk-h2">
              Built for institutions, from the ground up
            </h2>
            <p className="mk-lede">
              Roles, records and data separation sit under every feature. Recruiters will get their own portal; today they
              work through the placement cell.
            </p>
          </div>
          <div className="mk-card bg-white text-ink-900">
            <CapabilityList ids={FOUNDATIONS} />
          </div>
        </Split>
      </Section>

      <Section labelledBy="access-title">
        <SectionHeader
          id="access-title"
          eyebrow="Who can do what"
          title="Access by role"
          lede="The intended default for each role. Institution admins can adjust roles for their campus."
        />
        <div className="overflow-x-auto rounded-2xl border border-line" tabIndex={0} role="region" aria-label="Access by role table (scrolls sideways on small screens)">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <caption className="sr-only">Default access for each role</caption>
            <thead className="bg-mist-50 text-ink-700">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Area</th>
                <th scope="col" className="px-4 py-3 font-semibold">Institution admin</th>
                <th scope="col" className="px-4 py-3 font-semibold">Placement officer</th>
                <th scope="col" className="px-4 py-3 font-semibold">Faculty</th>
                <th scope="col" className="px-4 py-3 font-semibold">Student</th>
              </tr>
            </thead>
            <tbody>
              {ACCESS.map(([area, ...cells]) => (
                <tr key={area} className="border-t border-line">
                  <th scope="row" className="px-4 py-3 font-medium text-ink-900">{area}</th>
                  {cells.map((cell, index) => (
                    <td key={index} className={cell === 'None' ? 'px-4 py-3 text-ink-500' : 'px-4 py-3 text-ink-700'}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section tone="muted" tight>
        <RelatedLinks
          links={[
            { to: SITE_PAGES.howItWorks.path, label: 'How it works', description: 'How these features fit together across a season.' },
            { to: SITE_PAGES.solutions.path, label: 'Solutions by role', description: 'What each audience gets from the platform.' },
            { to: SITE_PAGES.faq.path, label: 'FAQs', description: 'Availability, AI use, data protection and access.' },
          ]}
        />
      </Section>

      <CtaBand title="See the current build for yourself" lede="Book a walkthrough and we will show you what is in the current build and what is coming next." />
    </>
  );
}
