import { ChartColumn, FileSearch, Gauge, History, Layers, ListChecks, Mic, MessagesSquare, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ButtonLink } from '../components/Button';
import { CapabilityBadge, RelatedLinks } from '../components/Cards';
import { CtaBand } from '../components/CtaBand';
import { FaqList } from '../components/FaqList';
import { PageHero, Section, SectionHeader, Split } from '../components/Layout';
import { InterviewReportMockup, InterviewSessionMockup, ResumeExtractMockup } from '../components/mockups/ProductMockups';
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
import { Tabs, type TabItem } from '../components/Tabs';
import type { FaqItem } from '../content/faq';
import { DEMO_PATH } from '../navigation';
import { SITE_PAGES, solutionPath } from '../siteMap';

const BENEFITS: Benefit[] = [
  { title: 'Practice that starts from the student', body: "Questions draw on the projects and skills on the student's own resume, not a generic list." },
  { title: 'A second question when it matters', body: 'A vague answer or an unchecked claim gets one follow-up, the way a panel would probe.' },
  { title: 'Feedback with reasons', body: 'Five rubric areas, each explained, with strengths, gaps and what a stronger answer includes.' },
  { title: 'Coaching where it is needed', body: "Results help the placement cell see who needs support before a company's interview day." },
];

const STEPS: WorkflowStep[] = [
  {
    actor: 'Student',
    title: 'Upload a resume',
    body: 'A PDF or Word file, stored privately. If a file cannot be read, the student is told why.',
    capability: 'resumeUpload',
  },
  {
    actor: 'Alphagrew',
    title: 'Read skills, projects and experience',
    body: 'The resume is parsed into skills, projects, experience and education. A screen to check and correct what was read is planned.',
    capability: 'resumeParsing',
  },
  {
    actor: 'Student',
    title: 'Choose a role and interview type',
    body: 'A target role or a campus job, one of five interview types, experience level, starting difficulty and a time limit.',
    capability: 'interviewSetup',
  },
  {
    actor: 'Alphagrew',
    title: 'Plan the questions',
    body: 'The interview is planned from the role and the resume. Without an AI provider configured, questions come from a curated question bank.',
    capability: 'aiInterviewText',
  },
  {
    actor: 'Student',
    title: 'Answer in writing',
    body: 'One question at a time, typed. Difficulty moves one step between questions by a fixed rule, and a weak answer can get one follow-up.',
    capability: 'difficultySteps',
  },
  {
    actor: 'Alphagrew',
    title: 'Show feedback and next steps',
    body: 'A report with rubric scores, strengths, areas to improve and per-question notes, plus a skill-gap view for the role.',
    capability: 'interviewFeedback',
  },
];

/** Example questions in the style of each interview type. The live wording depends on the resume, role and difficulty. */
const QUESTION_SETS: { id: string; label: string; intro: string; questions: { level: string; text: string; why: string }[] }[] = [
  {
    id: 'technical',
    label: 'Technical',
    intro: 'Fundamentals for the target role, from easier to harder.',
    questions: [
      { level: 'Difficulty 1', text: 'What is the difference between an array and a linked list, and when would you choose each?', why: 'Checks core data-structure reasoning.' },
      { level: 'Difficulty 3', text: 'What is the difference between PUT and PATCH, and when would you use each?', why: 'Common in backend and API roles.' },
      { level: 'Difficulty 5', text: 'How would you design an LRU cache with O(1) get and put operations?', why: 'Tests combining structures under constraints.' },
    ],
  },
  {
    id: 'hr',
    label: 'HR',
    intro: 'Motivation, teamwork and how the student talks about their choices.',
    questions: [
      { level: 'Opening', text: 'Tell me about yourself in two minutes, focused on why this role.', why: 'Practises a structured, relevant introduction.' },
      { level: 'Behavioural', text: 'Describe a time a project teammate missed a deadline. What did you do?', why: 'Looks for ownership and a clear outcome.' },
      { level: 'Closing', text: 'Where do you want to be two years after joining?', why: 'Checks the answer fits the role on offer.' },
    ],
  },
  {
    id: 'resume',
    label: 'Resume deep dive',
    intro: "Built from the student's own projects and experience.",
    questions: [
      { level: 'Project', text: 'Your complaint tracker uses PostgreSQL. How would you make the daily hostel-and-status query fast?', why: 'Tests whether the student understands their own design.' },
      { level: 'Claim check', text: 'You list Spring Boot. Walk me through what happens when a request reaches your controller.', why: 'A listed skill is probed before it counts.' },
      { level: 'Internship', text: 'What did you change during your internship, and how did you know it worked?', why: 'Looks for specific, measured impact.' },
    ],
  },
  {
    id: 'design',
    label: 'System design',
    intro: 'Open-ended design with trade-offs, for roles that need it.',
    questions: [
      { level: 'Difficulty 3', text: 'How would you make a payment-creation endpoint safe to retry?', why: 'Idempotency and failure handling.' },
      { level: 'Difficulty 4', text: 'How does a B-Tree index speed up a query, and what does it cost on writes?', why: 'Storage trade-offs behind everyday decisions.' },
      { level: 'Difficulty 5', text: 'Design a notification service for drive deadlines across many institutions.', why: 'Scale, isolation and delivery guarantees.' },
    ],
  },
  {
    id: 'mixed',
    label: 'Mixed',
    intro: 'A blend of technical, resume and HR questions, closest to a full campus round.',
    questions: [
      { level: 'Technical', text: 'What is a database transaction, and why does isolation matter?', why: 'Fundamentals first.' },
      { level: 'Resume', text: 'Why did you choose MQTT over plain HTTP for your soil monitor?', why: 'Connects theory to their own project.' },
      { level: 'HR', text: 'Why this company, and why now?', why: 'Ends the round as a real panel would.' },
    ],
  },
];

const TABS: TabItem[] = QUESTION_SETS.map((set) => ({
  id: set.id,
  label: set.label,
  content: (
    <div className="flex flex-col gap-4">
      <p className="text-ink-500">{set.intro}</p>
      <ol className="m-0 grid list-none gap-4 p-0 md:grid-cols-3">
        {set.questions.map((question) => (
          <li key={question.text} className="mk-card gap-3 p-5">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-iris-700">{question.level}</span>
            <p className="font-medium leading-relaxed text-ink-900">“{question.text}”</p>
            <p className="mt-auto text-sm text-ink-500">{question.why}</p>
          </li>
        ))}
      </ol>
    </div>
  ),
}));

const FEATURES: ProductFeature[] = [
  {
    icon: FileSearch,
    title: 'Resume-aware questions',
    body: <p>Skills, projects and experience read from the resume shape which questions are asked and what they refer to.</p>,
    capability: 'resumeParsing',
    benefits: ['students'],
    why: 'Practice sounds like the interview their own resume will lead to.',
  },
  {
    icon: Target,
    title: 'Target role or campus job',
    body: <p>Practise for a role such as backend or frontend developer, or for a specific job the placement cell has posted.</p>,
    capability: 'interviewSetup',
    benefits: ['students', 'placement-officers'],
    why: 'Preparation lines up with the drives actually coming to campus.',
  },
  {
    icon: Layers,
    title: 'Five interview types',
    body: <p>Technical, HR, resume deep dive, system design or mixed, with experience level and a time limit.</p>,
    capability: 'interviewSetup',
    benefits: ['students', 'faculty'],
    why: 'Trainers can point students to the round they find hardest.',
  },
  {
    icon: MessagesSquare,
    title: 'Follow-up questions',
    body: <p>If an answer is too vague or a claim needs checking, the interviewer asks one follow-up, or steps back to fundamentals.</p>,
    capability: 'aiInterviewText',
    benefits: ['students'],
    why: 'Students learn to give complete answers the first time.',
  },
  {
    icon: Gauge,
    title: 'Difficulty that steps up or down',
    body: (
      <p>
        Between questions, a fixed rule lowers difficulty after a weak answer and raises it after two strong ones, on a scale of 1
        to 5. It is a rule, not live AI judgement.
      </p>
    ),
    capability: 'difficultySteps',
    benefits: ['students'],
    why: 'Nobody is stuck on questions far above or below their level.',
  },
  {
    icon: ChartColumn,
    title: 'Feedback report',
    body: <p>Technical depth, problem solving, communication, role fit and behavioural answers, with strengths, weaknesses and suggestions.</p>,
    capability: 'interviewFeedback',
    benefits: ['students', 'faculty'],
    why: 'Students know what to fix; mentors know what to coach.',
  },
  {
    icon: ListChecks,
    title: 'Skill gaps after each interview',
    body: (
      <p>
        Interview results feed the{' '}
        <Link to={SITE_PAGES.careerIntelligence.path} className="mk-link">
          skill-gap view
        </Link>{' '}
        for the target role, with suggested practice steps.
      </p>
    ),
    capability: 'skillGap',
    benefits: ['students', 'placement-officers'],
    why: 'Practice turns into a plan rather than a one-off score.',
  },
  {
    icon: History,
    title: 'Interview history',
    body: <p>Past interviews stay listed with their reports, so a student can compare one attempt with the next.</p>,
    capability: 'aiInterviewText',
    benefits: ['students', 'faculty'],
    why: 'Progress is visible, which keeps students practising.',
  },
  {
    icon: Mic,
    title: 'Spoken answers',
    body: <p>Speech transcription exists on the server but is not yet part of the interview screen. There is no video interview.</p>,
    capability: 'aiInterviewVoice',
    benefits: ['students'],
    why: 'Will let students practise speaking, not just writing, once released.',
  },
];

const USE_CASES: UseCase[] = [
  {
    audience: 'students',
    title: 'Rehearsing the week before a drive',
    body: (
      <p>
        A student picks the posted Graduate Engineer Trainee job and a technical interview, answers eight questions, then works on
        the two gaps the report names before trying again.
      </p>
    ),
  },
  {
    audience: 'placement-officers',
    title: 'Getting a batch ready for a visiting company',
    body: (
      <p>
        The placement cell asks eligible students to practise for the company's posted role, then plans a session on the topic most
        reports flag.
      </p>
    ),
  },
  {
    audience: 'faculty',
    title: 'Running a mock-interview week',
    body: (
      <p>
        Trainers assign resume deep dives so students learn to defend their own projects. A faculty view of class results is
        planned; today students share their reports with mentors.
      </p>
    ),
  },
];

const FAQS: FaqItem[] = [
  {
    question: 'Is the interview spoken or on video?',
    text: 'Neither, yet. Interviews are typed in the current build. Speech transcription is in development but not yet in the interview screen, and there is no video interview.',
    answer: (
      <p>
        Neither, yet. Interviews are typed in the current build. Speech transcription is in development but not yet in the
        interview screen, and there is no video interview.
      </p>
    ),
  },
  {
    question: 'Does the interviewer adapt in real time?',
    text: 'Not in the sense of live AI judgement. Between questions, a fixed rule moves difficulty one step up or down, and a vague answer can get one follow-up.',
    answer: (
      <p>
        Not in the sense of live AI judgement. Between questions, a fixed rule moves difficulty one step up or down based on the
        last answers, and a vague answer or unchecked claim can get one follow-up question.
      </p>
    ),
  },
  {
    question: 'Which AI does it use?',
    text: 'AI requests are made only from the Alphagrew server, through a provider configured for each deployment. Without one, questions come from a curated question bank and scoring uses rule-based signals.',
    answer: (
      <p>
        AI requests are made only from the Alphagrew server, through a provider configured for each deployment, and keys never
        reach the browser. Without a provider, questions come from a curated question bank and scoring uses rule-based signals.
        Answer quality with a live provider is still being evaluated, so ask to see it in your demo.
      </p>
    ),
  },
  {
    question: 'Are interview scores used to shortlist students?',
    text: 'No. Scores are for practice. They are visible to the student and to staff at their institution, not to recruiters, and they are not used to accept or reject anyone.',
    answer: (
      <p>
        No. Scores are for practice. They are visible to the student and to staff at their institution, not to recruiters, and
        they are not used to accept or reject anyone. Staff review of AI feedback is planned.
      </p>
    ),
  },
  {
    question: 'What if a resume cannot be read?',
    text: 'The student is told why the file could not be read and can upload another. Resume-based questions need a resume that has been read successfully.',
    answer: (
      <p>
        The student is told why the file could not be read and can upload another. Resume-based questions need a resume that has
        been read successfully; until then, practice is based on the target role.
      </p>
    ),
  },
  {
    question: 'How often can students practise?',
    text: 'Each student has one interview in progress at a time. How many interviews an institution can run depends on its set-up, which we agree during the pilot.',
    answer: (
      <p>
        Each student has one interview in progress at a time. How many interviews an institution can run depends on its set-up,
        which we agree during the pilot.
      </p>
    ),
  },
];

export default function AiInterviewerPage() {
  return (
    <>
      <PageMeta page="aiInterviewer" />
      <PageHero
        page="aiInterviewer"
        eyebrow={
          <>
            AI Interviewer <CapabilityBadge id="aiInterviewText" />
          </>
        }
        title="Practise the interview your resume will get you."
        lede="Students upload a resume, choose the role they want and answer questions about their own projects. When an answer is thin, the interviewer asks the follow-up a real panel would, then explains what a stronger answer includes."
        actions={
          <>
            <ButtonLink to={DEMO_PATH} size="lg" arrow>
              Book a demo
            </ButtonLink>
            <ButtonLink to={{ hash: 'report' }} variant="secondary" size="lg">
              See a sample report
            </ButtonLink>
          </>
        }
        aside={<InterviewSessionMockup />}
      />

      <Section tight labelledBy="benefits-title">
        <SectionHeader id="benefits-title" eyebrow="Why it helps" title="Interview practice for every student, not only the confident few" />
        <BenefitList items={BENEFITS} />
        <BuildNote
          title="What's real today"
          items={[
            <>Typed mock interviews with resume and role context, five interview types and follow-up questions are in the current build.</>,
            <>Feedback reports, resume parsing and skill gaps are in development. Speech is in development; there is no video.</>,
            <>Tested end to end with the built-in question bank and rule-based scoring. Live AI provider quality is still being evaluated.</>,
          ]}
        />
      </Section>

      <Section tone="muted" id="workflow" labelledBy="workflow-title">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 [&>*]:min-w-0">
          <div>
            <SectionHeader
              id="workflow-title"
              eyebrow="How it works"
              title="From resume to feedback in six steps"
              lede="Each step shows its build status. What a student sees depends on the features their institution has turned on."
              className="mb-10"
            />
            <Workflow steps={STEPS} />
          </div>
          <div className="flex flex-col gap-8 lg:sticky lg:top-28 lg:self-start">
            <ResumeExtractMockup />
          </div>
        </div>
      </Section>

      <Section labelledBy="questions-title">
        <SectionHeader
          id="questions-title"
          eyebrow="Example questions"
          title="What students are asked"
          lede="Examples in the style of each interview type. Live questions depend on the resume, the role and the current difficulty."
        />
        <Tabs label="Example questions by interview type" items={TABS} />
      </Section>

      <Section tone="dark" id="report" labelledBy="report-title">
        <Split>
          <div className="flex flex-col gap-5">
            <p className="mk-eyebrow">
              After the interview <CapabilityBadge id="interviewFeedback" />
            </p>
            <h2 id="report-title" className="mk-h2">
              A report a student can act on
            </h2>
            <p className="mk-lede">
              Each interview ends with scores in five weighted areas, what went well, what to work on and a note on each question.
              The scores are a practice measure for the student, not a verdict on them.
            </p>
            <ul className="mk-ticks text-ink-200">
              <li>Weights are fixed and shown: technical depth 30%, problem solving 25%, communication 20%, role fit 15%, behavioural 10%.</li>
              <li>With an AI provider, the evaluation is written by the model. Without one, it is built from per-answer signals.</li>
              <li>Staff review and correction of AI feedback is planned.</li>
            </ul>
          </div>
          <InterviewReportMockup />
        </Split>
      </Section>

      <Section labelledBy="features-title">
        <SectionHeader
          id="features-title"
          eyebrow="Features"
          title="What the AI Interviewer includes"
          lede="Every feature carries its build status and says who it is for."
        />
        <FeatureDetails features={FEATURES} />
      </Section>

      <Section tone="muted" labelledBy="uses-title">
        <SectionHeader id="uses-title" eyebrow="Use cases" title="How campuses could use it" />
        <UseCases items={USE_CASES} />
      </Section>

      <Section labelledBy="guardrails-title">
        <Split align="start">
          <div className="flex flex-col gap-4">
            <p className="mk-eyebrow">Guardrails</p>
            <h2 id="guardrails-title" className="mk-h2">
              What the AI Interviewer does not do
            </h2>
            <p className="text-ink-500">
              Read how we handle student data in the{' '}
              <Link to={SITE_PAGES.privacy.path} className="mk-link">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
          <ul className="mk-ticks text-ink-700">
            <li>
              <strong className="text-ink-900">It does not hire or reject.</strong> Scores support practice and coaching. Eligibility
              and selection stay with the institution and the company.
            </li>
            <li>
              <strong className="text-ink-900">It does not share practice scores with recruiters.</strong> Results are for the
              student and the staff who support them.
            </li>
            <li>
              <strong className="text-ink-900">It does not expose AI keys.</strong> Every AI request is made from the Alphagrew
              server.
            </li>
            <li>
              <strong className="text-ink-900">It does not claim to be a human interviewer.</strong> Students always know they are
              practising with software.
            </li>
          </ul>
        </Split>
      </Section>

      <Section tone="muted" labelledBy="faq-title">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.5fr] lg:gap-16">
          <div className="flex flex-col gap-4">
            <p className="mk-eyebrow">Questions</p>
            <h2 id="faq-title" className="mk-h2">
              About the AI Interviewer
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
            { to: solutionPath('students'), label: 'For students', description: 'Prepare, apply and track every round.' },
            { to: solutionPath('faculty'), label: 'For faculty', description: 'Support preparation where your access allows.' },
            { to: solutionPath('placement-officers'), label: 'For placement officers', description: 'Get each batch ready for the drives ahead.' },
            { to: SITE_PAGES.careerIntelligence.path, label: 'Career Intelligence', description: 'Where interview results become skill gaps and next steps.' },
            { to: SITE_PAGES.placementManagement.path, label: 'Placement Management', description: 'The drives and jobs students practise for.' },
          ]}
        />
      </Section>

      <CtaBand
        title="Give every student a practice panel"
        lede="Book a walkthrough of the current build. We will run a typed mock interview with a sample resume and show you the report."
        secondary={{ to: SITE_PAGES.careerIntelligence.path, label: 'Explore Career Intelligence' }}
      />
    </>
  );
}
