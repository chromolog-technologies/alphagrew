import type { ReactNode } from 'react';
import { BookOpen, Briefcase, CalendarClock, Check, Clock, FileText, Filter, Info, Lock, MessageSquareText, Sparkles } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Meter, MockFrame } from './Mockups';

/**
 * Larger illustrations for the three product pages. Same rules as Mockups.tsx:
 * built from markup, sample data only, and nothing here looks like a working control.
 */

function Panel({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-white/10 bg-white/[0.03] p-4', className)}>
      {title && <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-aqua-300">{title}</p>}
      {children}
    </div>
  );
}

function Chip({ children, tone = 'iris' }: { children: ReactNode; tone?: 'iris' | 'green' | 'amber' | 'grey' | 'red' }) {
  const tones = {
    iris: 'bg-iris-500/20 text-iris-200',
    green: 'bg-emerald-400/15 text-emerald-300',
    amber: 'bg-amber-400/15 text-amber-300',
    red: 'bg-rose-400/15 text-rose-300',
    grey: 'bg-white/10 text-ink-200',
  };
  return <span className={cn('inline-flex max-w-full items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-medium', tones[tone])}>{children}</span>;
}

function Footer({ icon: Icon, children }: { icon: typeof Sparkles; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-t border-white/10 px-5 py-3 text-xs text-ink-200">
      <Icon size={14} className="shrink-0 text-aqua-300" aria-hidden="true" />
      {children}
    </div>
  );
}

/* ---------- AI Interviewer ---------- */

const EXTRACTED: [string, string[]][] = [
  ['Skills', ['Java', 'Spring Boot', 'PostgreSQL', 'REST APIs', 'Git']],
  ['Projects', ['Hostel complaint tracker (Spring Boot, PostgreSQL)', 'IoT soil monitor (MQTT, ESP32)']],
  ['Experience', ['Summer intern, backend team (8 weeks)']],
];

/** Steps 1–2 of the interview flow: what the system reads from a resume. */
export function ResumeExtractMockup({ className }: { className?: string }) {
  return (
    <MockFrame title="Resume read for interview" caption="Illustration of resume parsing (in development). Sample resume." className={className}>
      <div className="grid gap-4 p-5 sm:grid-cols-[0.8fr_1.2fr]">
        <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-4" aria-hidden="true">
          <span className="flex items-center gap-2 text-xs text-ink-200">
            <FileText size={16} className="text-ink-300" /> resume.pdf
          </span>
          {[88, 62, 80, 50, 74, 66, 58].map((width, index) => (
            <span key={index} className="h-2 rounded-full bg-white/10" style={{ width: `${width}%` }} />
          ))}
        </div>
        <dl className="m-0 flex flex-col gap-3">
          {EXTRACTED.map(([term, values]) => (
            <div key={term}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-aqua-300">{term}</dt>
              <dd className="m-0 mt-1.5 flex flex-wrap gap-1.5">
                {values.map((value) => (
                  <Chip key={value} tone="grey">
                    {value}
                  </Chip>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <Footer icon={Info}>Education is read too. A screen to check and correct this is planned.</Footer>
    </MockFrame>
  );
}

/** Step 5: the typed interview screen. No input or buttons, so nothing looks usable. */
export function InterviewSessionMockup({ className }: { className?: string }) {
  return (
    <MockFrame
      title="Mock interview · Backend developer"
      caption="Simulated interview screen with a sample conversation. Not a live session."
      className={className}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-5 py-3 text-xs text-ink-200">
        <Chip>Technical</Chip>
        <Chip tone="grey">Fresher</Chip>
        <Chip tone="grey">Difficulty 3 of 5</Chip>
        <span className="ml-auto inline-flex items-center gap-1.5">
          <Clock size={13} aria-hidden="true" /> Question 4 of 8
        </span>
      </div>
      <div className="flex flex-col gap-4 p-5">
        <div className="flex max-w-[90%] flex-col gap-1">
          <span className="text-[0.6875rem] font-medium text-ink-300">Interviewer · from your resume</span>
          <p className="rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.05] px-4 py-2.5 leading-relaxed">
            Your complaint tracker uses PostgreSQL. A warden filters complaints by hostel and status every morning. How would
            you make that query fast?
          </p>
        </div>
        <div className="flex max-w-[90%] flex-col items-end gap-1 self-end">
          <span className="text-[0.6875rem] font-medium text-ink-300">Student · typed answer</span>
          <p className="rounded-2xl rounded-tr-sm bg-iris-600 px-4 py-2.5 leading-relaxed text-white">I would add an index.</p>
        </div>
        <div className="flex max-w-[90%] flex-col gap-1">
          <span className="text-[0.6875rem] font-medium text-ink-300">Interviewer · follow-up</span>
          <p className="rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.05] px-4 py-2.5 leading-relaxed">
            Which columns would you index, and in what order? What does the index cost you when complaints are inserted?
          </p>
        </div>
      </div>
      <Footer icon={Sparkles}>One follow-up is asked when an answer is too short or a claim needs checking</Footer>
    </MockFrame>
  );
}

const DIMENSIONS = [
  { label: 'Technical depth', weight: 30, score: 64 },
  { label: 'Problem solving', weight: 25, score: 70 },
  { label: 'Communication', weight: 20, score: 58 },
  { label: 'Role fit', weight: 15, score: 72 },
  { label: 'Behavioural', weight: 10, score: 66 },
];

/** Step 6: the report after an interview. */
export function InterviewReportMockup({ className }: { className?: string }) {
  return (
    <MockFrame title="Interview report" caption="Illustrative feedback report. Sample scores and comments." className={className}>
      <div className="flex flex-col gap-5 p-5">
        <div className="flex flex-col gap-3">
          <p className="text-xs text-ink-300">Five rubric areas, weighted as shown</p>
          {DIMENSIONS.map((row) => (
            <Meter key={row.label} label={`${row.label} · ${row.weight}%`} figure={`${row.score} / 100`} value={row.score} />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Panel title="Strengths">
            <p className="leading-relaxed text-ink-200">Explained your own project clearly and named the right data structure for lookups.</p>
          </Panel>
          <Panel title="Work on">
            <p className="leading-relaxed text-ink-200">Index trade-offs. Say what an index costs on writes before you are asked.</p>
          </Panel>
        </div>
        <Panel title="Question 4 · note">
          <p className="leading-relaxed text-ink-200">
            “Add an index” was right but incomplete. A stronger answer names a composite index on hostel and status, and why that
            order.
          </p>
        </Panel>
      </div>
      <Footer icon={Lock}>For practice. Visible to the student and their institution, not to recruiters.</Footer>
    </MockFrame>
  );
}

/* ---------- Career Intelligence ---------- */

const COMPONENTS: { label: string; weight: number; score: number | null; source: string }[] = [
  { label: 'Resume', weight: 20, score: 74, source: 'Latest resume analysis' },
  { label: 'Academics', weight: 25, score: 68, source: 'CGPA, less 10 per active backlog' },
  { label: 'Assessments', weight: 25, score: null, source: 'No assessment taken yet' },
  { label: 'AI interviews', weight: 30, score: 51, source: 'Last three mock interviews' },
];

/** A student's readiness indicator and how it is made up. */
export function ReadinessDashboardMockup({ className }: { className?: string }) {
  return (
    <MockFrame title="My career readiness" caption="Illustrative readiness view. Sample student and figures." className={className}>
      <div className="flex flex-col gap-5 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs text-ink-300">Coaching indicator, not a prediction</p>
            <p className="font-display text-4xl font-semibold">
              63 <span className="text-base font-normal text-ink-300">/ 100</span>
            </p>
          </div>
          <Chip tone="grey">Up 6 since September</Chip>
        </div>
        <ul className="flex flex-col gap-2">
          {COMPONENTS.map((part) => (
            <li key={part.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
              <span className="font-medium">
                {part.label} <span className="text-xs font-normal text-ink-300">· weight {part.weight}%</span>
              </span>
              {part.score === null ? <Chip tone="grey">Not measured</Chip> : <span className="font-mono text-xs">{part.score}</span>}
              <span className="col-span-2 text-xs text-ink-300">{part.source}</span>
            </li>
          ))}
        </ul>
      </div>
      <Footer icon={Info}>Assessments are not measured, so the other weights are rescaled. Not a prediction of placement.</Footer>
    </MockFrame>
  );
}

const GAP_STATUS = {
  exceeds: { label: 'Exceeds', tone: 'green' },
  meets: { label: 'Meets', tone: 'green' },
  gap: { label: 'Gap', tone: 'amber' },
  missing: { label: 'No evidence', tone: 'red' },
  unverified: { label: 'Unverified', tone: 'grey' },
} as const;

const GAPS: { skill: string; evidence: string; status: keyof typeof GAP_STATUS }[] = [
  { skill: 'REST API design', evidence: 'Interview · 82', status: 'exceeds' },
  { skill: 'Data structures and algorithms', evidence: 'Interview · 71', status: 'meets' },
  { skill: 'Database indexing and query tuning', evidence: 'Interview · 48', status: 'gap' },
  { skill: 'Git workflow', evidence: 'Resume only', status: 'unverified' },
  { skill: 'Concurrency and operating systems', evidence: 'None yet', status: 'missing' },
];

/** Competencies for a role compared with the evidence held for one student. */
export function SkillGapMockup({ className }: { className?: string }) {
  return (
    <MockFrame title="Skill gaps · Backend developer" caption="Illustrative skill-gap view. Sample student and evidence." className={className}>
      <div className="overflow-x-auto p-5">
        <table className="w-full min-w-[20rem] text-left text-[0.8125rem]">
          <caption className="sr-only">Sample skill-gap view for a backend developer role</caption>
          <thead className="text-[0.6875rem] uppercase tracking-wide text-ink-300">
            <tr>
              <th scope="col" className="pb-2 font-medium">Competency</th>
              <th scope="col" className="pb-2 font-medium">Evidence</th>
              <th scope="col" className="pb-2 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {GAPS.map((row) => (
              <tr key={row.skill} className="border-t border-white/10">
                <th scope="row" className="py-2.5 pr-3 font-medium">{row.skill}</th>
                <td className="py-2.5 pr-3 text-xs text-ink-200">{row.evidence}</td>
                <td className="py-2.5 text-right">
                  <Chip tone={GAP_STATUS[row.status].tone}>{GAP_STATUS[row.status].label}</Chip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Footer icon={Info}>Interview evidence counts first, then assessments. A skill only listed on a resume gets half credit.</Footer>
    </MockFrame>
  );
}

/** Planned: why a role does or does not suit a student yet. */
export function OpportunityFitMockup({ className }: { className?: string }) {
  return (
    <MockFrame title="Opportunity fit" caption="Illustration of a planned feature. Sample role and student." className={className}>
      <div className="flex flex-col gap-4 p-5">
        <div>
          <p className="text-xs text-ink-300">Example Systems (sample) · Associate Developer</p>
          <p className="font-display text-lg font-semibold">Good fit on 4 of 6 required skills</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Panel title="Why it fits">
            <ul className="flex flex-col gap-1.5 text-ink-200">
              <li className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0 text-emerald-300" aria-hidden="true" />Java and Spring Boot shown in interviews</li>
              <li className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0 text-emerald-300" aria-hidden="true" />REST API project on resume</li>
            </ul>
          </Panel>
          <Panel title="What is missing">
            <ul className="flex flex-col gap-1.5 text-ink-200">
              <li>SQL tuning: practise before the drive</li>
              <li>Docker: not on profile yet</li>
            </ul>
          </Panel>
        </div>
      </div>
      <Footer icon={Filter}>Fit explains preparation only. Whether a student may apply is set by eligibility rules.</Footer>
    </MockFrame>
  );
}

const ROADMAP = [
  { when: 'This week', step: 'Practise a database-focused mock interview at difficulty 3', icon: MessageSquareText, done: true },
  { when: 'Next week', step: 'Revise composite indexes and query plans', icon: BookOpen, done: false },
  { when: 'Week 3', step: 'Add the intern project’s API work to your resume', icon: FileText, done: false },
  { when: 'Before 14 Nov', step: 'Retake a technical interview for Associate Developer', icon: Briefcase, done: false },
];

/** Suggested practice steps, in order. */
export function RoadmapMockup({ className }: { className?: string }) {
  return (
    <MockFrame title="Suggested next steps" caption="Illustrative improvement plan. Sample steps and dates." className={className}>
      <ol className="m-0 flex list-none flex-col gap-2 p-5">
        {ROADMAP.map((item) => (
          <li key={item.step} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
            <span
              className={cn(
                'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                item.done ? 'bg-emerald-400/15 text-emerald-300' : 'bg-iris-500/20 text-iris-200',
              )}
            >
              {item.done ? <Check size={13} aria-hidden="true" /> : <item.icon size={13} aria-hidden="true" />}
            </span>
            <span className="flex flex-col">
              <span className="text-xs text-ink-300">
                {item.when}
                {item.done && ' · done'}
              </span>
              <span>{item.step}</span>
            </span>
          </li>
        ))}
      </ol>
      <Footer icon={Sparkles}>Built from the latest interview and skill gaps. Students mark steps as done.</Footer>
    </MockFrame>
  );
}

/* ---------- Placement Management ---------- */

const DRIVES = [
  { company: 'Example Systems', role: 'Graduate Engineer Trainee', date: '14 Nov', departments: 'CSE, IT, ECE', applied: 118, status: 'Open' },
  { company: 'Acme Analytics', role: 'Data Analyst', date: '19 Nov', departments: 'All departments', applied: 64, status: 'Open' },
  { company: 'Sample Labs', role: 'Associate Developer', date: '26 Nov', departments: 'CSE, IT', applied: 0, status: 'Draft' },
  { company: 'Demo Motors', role: 'Graduate Apprentice', date: '2 Nov', departments: 'Mechanical, EEE', applied: 41, status: 'Closed' },
];

const DRIVE_TONE = { Open: 'green', Draft: 'grey', Closed: 'iris' } as const;

/** The placement cell's season view. */
export function PlacementDashboardMockup({ className }: { className?: string }) {
  return (
    <MockFrame
      title="Placement drives · 2027 batch"
      caption="Illustrative placement dashboard. Sample companies and numbers, not a live screenshot."
      className={className}
    >
      <div className="flex flex-col gap-5 p-5">
        <dl className="grid grid-cols-3 gap-3">
          {[
            ['Open drives', '2'],
            ['Applications', '223'],
            ['Students applied', '171'],
          ].map(([term, value]) => (
            <div key={term} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <dt className="text-[0.6875rem] leading-tight text-ink-300">{term}</dt>
              <dd className="m-0 mt-1.5 font-display text-xl font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        <ul className="flex flex-col gap-2">
          {DRIVES.map((drive) => (
            <li key={drive.company} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
              <div className="min-w-0">
                <p className="font-medium">{drive.role}</p>
                <p className="text-xs text-ink-300">
                  {drive.company} (sample) · {drive.date} · {drive.departments}
                </p>
              </div>
              <span className="flex items-center gap-2">
                <span className="font-mono text-xs text-ink-200">{drive.applied} applied</span>
                <Chip tone={DRIVE_TONE[drive.status as keyof typeof DRIVE_TONE]}>{drive.status}</Chip>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <Footer icon={CalendarClock}>Drive dates and department limits come from each drive record</Footer>
    </MockFrame>
  );
}
