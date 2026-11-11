import { BookOpenCheck, Compass, FileSearch, GraduationCap, LineChart, ListChecks, Presentation, Scale, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ButtonLink } from '../components/Button';
import { CapabilityBadge, RelatedLinks, StatusBadge } from '../components/Cards';
import { CtaBand } from '../components/CtaBand';
import { FaqList } from '../components/FaqList';
import { PageHero, Section, SectionHeader, Split } from '../components/Layout';
import { OpportunityFitMockup, ReadinessDashboardMockup, RoadmapMockup, SkillGapMockup } from '../components/mockups/ProductMockups';
import { PageMeta } from '../components/PageMeta';
import {
  BenefitList,
  BuildNote,
  FeatureDetails,
  UseCases,
  Workflow,
  type Benefit,
  type ProductFeature,
  type UseCase,
  type WorkflowStep,
} from '../components/ProductSections';
import { CAPABILITIES, type CapabilityId } from '../content/capabilities';
import type { FaqItem } from '../content/faq';
import { DEMO_PATH } from '../navigation';
import { SITE_PAGES, solutionPath } from '../siteMap';

const BENEFITS: Benefit[] = [
  { title: 'Evidence over claims', body: 'A skill shown in an interview counts for more than one only listed on a resume.' },
  { title: 'Gaps named early', body: 'Students see what a target role needs and what they have not shown yet, well before the drive.' },
  { title: 'A plan, not a number', body: 'Every gap comes with practice steps a student can work through and mark as done.' },
  { title: 'Effort aimed well', body: 'Placement and training staff can put their time where students need it most.' },
];

/** The evidence Career Intelligence draws on, and whether each source exists today. */
const INPUTS: { label: string; detail: string; capability: CapabilityId }[] = [
  { label: 'Student profile', detail: 'Skills, projects, certifications, experience', capability: 'careerProfile' },
  { label: 'Academic record', detail: 'CGPA and active backlogs', capability: 'academicRecords' },
  { label: 'Resume', detail: 'Parsed skills, projects and experience', capability: 'resumeParsing' },
  { label: 'Mock interviews', detail: 'Rubric scores per competency', capability: 'interviewFeedback' },
  { label: 'Assessments', detail: 'Verified skill results', capability: 'assessments' },
  { label: 'Job requirements', detail: 'Required skills on a posted job', capability: 'placementDrives' },
];

const OUTPUTS: { label: string; detail: string; capability: CapabilityId }[] = [
  { label: 'Readiness indicator', detail: 'How prepared a student is overall', capability: 'careerReadiness' },
  { label: 'Skill gaps', detail: 'Per competency, for one target role', capability: 'skillGap' },
  { label: 'Next steps', detail: 'Practice suggestions in order', capability: 'recommendations' },
  { label: 'Opportunity fit', detail: 'Why a posted job suits a student', capability: 'jobMatching' },
];

const STEPS: WorkflowStep[] = [
  {
    actor: 'Student',
    title: 'Keep a profile and resume current',
    body: 'Skills, projects and experience in the career profile, and an uploaded resume Alphagrew can read.',
    capability: 'careerProfile',
  },
  {
    actor: 'Student',
    title: 'Practise for a target role',
    body: 'Each mock interview adds scored evidence for the competencies of that role.',
    capability: 'aiInterviewText',
  },
  {
    actor: 'Alphagrew',
    title: 'Compare evidence with the role',
    body: "Each competency is marked exceeds, meets, gap, no evidence or unverified. A linked job's required skills are added to the list.",
    capability: 'skillGap',
  },
  {
    actor: 'Alphagrew',
    title: 'Suggest what to practise next',
    body: 'Practice steps come from the latest interview and the largest gaps. Students mark them as done.',
    capability: 'recommendations',
  },
  {
    actor: 'Student and staff',
    title: 'Track progress over time',
    body: 'The readiness indicator keeps a history, so a student and their mentors can see whether practice is working.',
    capability: 'careerReadiness',
  },
];

const WEIGHTS = [
  { part: 'Resume', weight: '20%', source: 'Latest resume analysis' },
  { part: 'Academics', weight: '25%', source: 'CGPA on a 100-point scale, less 10 for each active backlog' },
  { part: 'Assessments', weight: '25%', source: 'Not built yet, so currently left out' },
  { part: 'AI interviews', weight: '30%', source: 'Recent mock interview scores' },
];

const FEATURES: ProductFeature[] = [
  {
    icon: Compass,
    title: 'Readiness indicator',
    body: <p>One number from resume, academic and interview evidence, with each part and its weight shown. Missing parts are left out, not guessed.</p>,
    capability: 'careerReadiness',
    benefits: ['students', 'placement-officers'],
    why: 'A shared, explained starting point for a coaching conversation.',
  },
  {
    icon: ListChecks,
    title: 'Skill-gap view',
    body: <p>The competencies a target role needs, each compared with the best evidence the student has: interview, assessment or resume.</p>,
    capability: 'skillGap',
    benefits: ['students', 'faculty'],
    why: 'Students know exactly which topic to work on next.',
  },
  {
    icon: Scale,
    title: 'Evidence ranking',
    body: <p>Interview results count first, then assessment results. A skill only claimed on a resume gets half credit and is marked unverified.</p>,
    capability: 'skillGap',
    benefits: ['students', 'institutions'],
    why: 'Readiness reflects what students have shown, not only what they list.',
  },
  {
    icon: BookOpenCheck,
    title: 'Suggested practice steps',
    body: <p>Concrete next steps from the latest interview and the largest gaps, which students can mark as done.</p>,
    capability: 'recommendations',
    benefits: ['students'],
    why: 'Turns feedback into a short, ordered plan.',
  },
  {
    icon: LineChart,
    title: 'Progress over time',
    body: <p>Readiness history for each student, so change is visible from one month to the next.</p>,
    capability: 'careerReadiness',
    benefits: ['students', 'faculty'],
    why: 'Mentors can see whether advice is working.',
  },
  {
    icon: FileSearch,
    title: 'Resume analysis',
    body: <p>Feedback on resume quality and structure. Comparison against a specific job description is planned.</p>,
    capability: 'resumeAnalysis',
    benefits: ['students'],
    why: 'A stronger resume before the first application.',
  },
  {
    icon: GraduationCap,
    title: 'Opportunity fit',
    body: <p>For a posted job, an explanation of which required skills a student has shown and which are missing.</p>,
    capability: 'jobMatching',
    benefits: ['students', 'placement-officers'],
    why: 'Students prepare for the jobs that suit them; staff see who is close.',
  },
  {
    icon: UsersRound,
    title: 'Batch skill gaps',
    body: <p>The skills most of a batch has not shown yet, so training can be planned before the season.</p>,
    capability: 'batchInsights',
    benefits: ['institutions', 'placement-officers', 'faculty'],
    why: 'Training budgets go to the topics a whole batch needs.',
  },
  {
    icon: Presentation,
    title: 'Faculty view of mentees',
    body: <p>Faculty see their own mentees' readiness and practice, limited to what their role allows.</p>,
    capability: 'facultyInsights',
    benefits: ['faculty'],
    why: 'Mentors can spot who needs a check-in without asking each student.',
  },
];

const USE_CASES: UseCase[] = [
  {
    audience: 'students',
    title: 'Deciding what to study this week',
    body: <p>A student aiming for backend roles sees indexing marked as a gap and Git as unverified, and starts with the gap.</p>,
  },
  {
    audience: 'faculty',
    title: 'A focused mentoring conversation',
    body: (
      <p>
        A mentor and student look at the skill-gap view together and agree two steps. A faculty view across mentees is planned;
        today the student shares their screen.
      </p>
    ),
  },
  {
    audience: 'institutions',
    title: 'Planning training before the season',
    body: (
      <p>
        Leadership uses batch skill gaps to choose workshops. This batch view is planned; until then, staff work from individual
        reports.
      </p>
    ),
  },
];

const FAQS: FaqItem[] = [
  {
    question: 'Does the readiness score predict who will be placed?',
    text: 'No. It is a coaching indicator. Its weights are fixed by product design, not derived from placement outcomes, and it has not been validated as a predictor of employment.',
    answer: (
      <p>
        No. It is a coaching indicator. Its weights are set by product design, not derived from placement outcomes, and it has not
        been validated as a predictor of employment. A high score does not guarantee an offer, and a low one does not rule one out.
      </p>
    ),
  },
  {
    question: 'Can the score stop a student from applying to a drive?',
    text: 'No. Readiness is never an eligibility rule. Whether a student may apply depends only on the criteria the company and the institution set.',
    answer: (
      <p>
        No. Readiness is never an eligibility rule. Whether a student may apply depends only on the criteria the company and the
        institution set. See{' '}
        <Link to={SITE_PAGES.placementManagement.path} className="mk-link">
          Placement Management
        </Link>
        .
      </p>
    ),
  },
  {
    question: 'What happens when there is no data for a part of the score?',
    text: 'That part is left out and the remaining weights are rescaled. Assessments are not built yet, so today the indicator uses resume, academics and interviews.',
    answer: (
      <p>
        That part is left out and the remaining weights are rescaled, rather than counted as zero. Assessments are not built yet,
        so today the indicator uses resume, academics and interviews.
      </p>
    ),
  },
  {
    question: 'Is AI used to make these insights?',
    text: 'The skill-gap view and readiness indicator are calculated by fixed rules. AI is used for resume parsing and interview evaluation when a provider is configured. AI insights support development and are not employment guarantees.',
    answer: (
      <p>
        The skill-gap view and the readiness indicator are calculated by fixed rules, so the same evidence gives the same result. AI
        is used for resume parsing and interview evaluation when a provider is configured. Either way, the insights support a
        student's development and are not a guarantee of any employment outcome.
      </p>
    ),
  },
  {
    question: 'Who can see a student’s insights?',
    text: "The student, and staff at the student's institution whose role allows it. Insights are not shared with recruiters.",
    answer: <p>The student, and staff at the student's institution whose role allows it. Insights are not shared with recruiters.</p>,
  },
];

function StatusRow({ label, detail, capability }: { label: string; detail: string; capability: CapabilityId }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 py-3 first:pt-0 last:pb-0">
      <span className="flex flex-col">
        <span className="font-semibold text-ink-900">{label}</span>
        <span className="text-sm text-ink-500">{detail}</span>
      </span>
      <StatusBadge status={CAPABILITIES[capability].status} />
    </li>
  );
}

export default function CareerIntelligencePage() {
  return (
    <>
      <PageMeta page="careerIntelligence" />
      <PageHero
        page="careerIntelligence"
        eyebrow={
          <>
            Career Intelligence <CapabilityBadge id="careerReadiness" />
          </>
        }
        title="See the distance between today and the role a student wants."
        lede="Career Intelligence brings a student's profile, academic record, resume and mock interviews together, compares them with what a role needs, and turns the difference into practice steps. It guides preparation; it does not predict placement."
        actions={
          <>
            <ButtonLink to={DEMO_PATH} size="lg" arrow>
              Book a demo
            </ButtonLink>
            <ButtonLink to={{ hash: 'how-calculated' }} variant="secondary" size="lg">
              How readiness is calculated
            </ButtonLink>
          </>
        }
        aside={<ReadinessDashboardMockup />}
      />

      <Section tight labelledBy="benefits-title">
        <SectionHeader id="benefits-title" eyebrow="Why it helps" title="Preparation guided by evidence" />
        <BenefitList items={BENEFITS} />
        <BuildNote
          title="What's real today"
          items={[
            <>The readiness indicator, skill-gap view and practice suggestions are in development, built on the student profile and mock interviews.</>,
            <>Assessments are not built, so they are not counted yet. Opportunity fit and batch skill gaps are planned.</>,
            <>Readiness and skill gaps are rule-based calculations, not AI predictions.</>,
          ]}
        />
      </Section>

      <Section tone="muted" labelledBy="inputs-title">
        <SectionHeader
          id="inputs-title"
          eyebrow="What it brings together"
          title="Six kinds of evidence, four kinds of guidance"
          lede="Each source and result carries its build status. Institutions decide which sources they turn on."
        />
        <div className="grid gap-5 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
          <div className="mk-card">
            <h3 className="mk-h3 text-lg">Evidence in</h3>
            <ul className="flex flex-col divide-y divide-line">
              {INPUTS.map((input) => (
                <StatusRow key={input.label} {...input} />
              ))}
            </ul>
          </div>
          <p className="mx-auto max-w-[14rem] text-center font-display font-semibold text-iris-700">
            <span aria-hidden="true" className="block text-2xl">
              →
            </span>
            Compared with the competencies of a target role
          </p>
          <div className="mk-card">
            <h3 className="mk-h3 text-lg">Guidance out</h3>
            <ul className="flex flex-col divide-y divide-line">
              {OUTPUTS.map((output) => (
                <StatusRow key={output.label} {...output} />
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section labelledBy="workflow-title">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 [&>*]:min-w-0">
          <div>
            <SectionHeader id="workflow-title" eyebrow="How it works" title="From evidence to a plan in five steps" className="mb-10" />
            <Workflow steps={STEPS} />
          </div>
          <div className="mk-tone-dark self-start rounded-[1.75rem] p-4 sm:p-8 lg:sticky lg:top-28">
            <RoadmapMockup />
          </div>
        </div>
      </Section>

      <Section tone="dark" id="skill-gaps" labelledBy="gap-title">
        <Split>
          <div className="flex flex-col gap-5">
            <p className="mk-eyebrow">
              Skill gaps <CapabilityBadge id="skillGap" />
            </p>
            <h2 id="gap-title" className="mk-h2">
              Each competency, checked against real evidence
            </h2>
            <p className="mk-lede">
              For a target role such as backend or frontend developer, Alphagrew lists the competencies the role needs and looks for
              the strongest evidence of each one.
            </p>
            <ul className="mk-ticks text-ink-200">
              <li>A mock interview score counts first, then an assessment result.</li>
              <li>A skill only listed on a resume counts for half and is marked unverified until shown.</li>
              <li>When the practice is for a posted job, that job's required skills are added.</li>
            </ul>
          </div>
          <SkillGapMockup />
        </Split>
      </Section>

      <Section id="how-calculated" labelledBy="calc-title">
        <SectionHeader
          id="calc-title"
          eyebrow="Readiness, explained"
          title="How the readiness indicator is calculated"
          lede="Every part and weight is visible. The weights are a product design choice and have not been validated against placement outcomes."
        />
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <caption className="sr-only">Parts of the readiness indicator and their weights</caption>
            <thead className="bg-mist-50 text-ink-700">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Part</th>
                <th scope="col" className="px-4 py-3 font-semibold">Weight</th>
                <th scope="col" className="px-4 py-3 font-semibold">Where it comes from</th>
              </tr>
            </thead>
            <tbody>
              {WEIGHTS.map((row) => (
                <tr key={row.part} className="border-t border-line">
                  <th scope="row" className="px-4 py-3 font-medium text-ink-900">{row.part}</th>
                  <td className="px-4 py-3 font-mono text-ink-700">{row.weight}</td>
                  <td className="px-4 py-3 text-ink-500">{row.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-ink-500">
          A part with no data is left out and the other weights are scaled up to fill the gap, so a missing assessment never counts as
          zero.
        </p>
      </Section>

      <Section tone="muted" labelledBy="fit-title">
        <Split reverse>
          <div className="flex flex-col gap-5">
            <p className="mk-eyebrow">
              Opportunity fit <CapabilityBadge id="jobMatching" />
            </p>
            <h2 id="fit-title" className="mk-h2">
              Why a job suits a student, in plain words
            </h2>
            <p className="mk-lede">
              Planned: for each posted job, show which required skills a student has already shown and which they still need, so
              preparation goes to the right drives.
            </p>
            <p className="text-ink-500">
              Fit is guidance only. It never decides who may apply; eligibility rules do.
            </p>
          </div>
          <div className="mk-tone-dark rounded-[1.75rem] p-4 sm:p-8">
            <OpportunityFitMockup />
          </div>
        </Split>
      </Section>

      <Section labelledBy="features-title">
        <SectionHeader id="features-title" eyebrow="Features" title="What Career Intelligence includes" lede="Who each feature helps, and how far along it is." />
        <FeatureDetails features={FEATURES} />
      </Section>

      <Section tone="muted" labelledBy="uses-title">
        <SectionHeader id="uses-title" eyebrow="Use cases" title="How it fits into a placement season" />
        <UseCases items={USE_CASES} />
      </Section>

      <Section labelledBy="responsible-title">
        <Split align="start">
          <div className="flex flex-col gap-4">
            <p className="mk-eyebrow">Responsible use</p>
            <h2 id="responsible-title" className="mk-h2">
              Support for development, not a verdict
            </h2>
          </div>
          <ul className="mk-ticks text-ink-700">
            <li>
              <strong className="text-ink-900">Not a prediction.</strong> Readiness has not been validated as a predictor of
              placement or job performance, and should not be read as one.
            </li>
            <li>
              <strong className="text-ink-900">No guaranteed outcomes.</strong> Insights help students prepare. They do not promise
              an interview, an offer or a salary.
            </li>
            <li>
              <strong className="text-ink-900">Never an eligibility blocker.</strong> Who may apply is set by the company and the
              institution, not by a readiness score.
            </li>
            <li>
              <strong className="text-ink-900">Visible to the student.</strong> Students see their own insights and can ask for the
              underlying record to be corrected. See the{' '}
              <Link to={SITE_PAGES.privacy.path} className="mk-link">
                Privacy Policy
              </Link>
              .
            </li>
          </ul>
        </Split>
      </Section>

      <Section tone="muted" labelledBy="faq-title">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.5fr] lg:gap-16">
          <div className="flex flex-col gap-4">
            <p className="mk-eyebrow">Questions</p>
            <h2 id="faq-title" className="mk-h2">
              About Career Intelligence
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
            { to: solutionPath('students'), label: 'For students', description: 'Know what to work on before each drive.' },
            { to: solutionPath('faculty'), label: 'For faculty', description: 'Mentor with the same evidence the student sees.' },
            { to: solutionPath('institutions'), label: 'For institutions', description: 'Plan training around what a batch needs.' },
            { to: SITE_PAGES.aiInterviewer.path, label: 'AI Interviewer', description: 'The practice that produces most of the evidence.' },
            { to: SITE_PAGES.placementManagement.path, label: 'Placement Management', description: 'Where posted jobs and their required skills come from.' },
          ]}
        />
      </Section>

      <CtaBand
        title="See how your students' evidence turns into a plan"
        lede="Book a walkthrough of the current build with a sample student: profile, mock interview, skill gaps and next steps."
        secondary={{ to: SITE_PAGES.aiInterviewer.path, label: 'Explore the AI Interviewer' }}
      />
    </>
  );
}
