import type { ReactNode } from 'react';
import { Bot, CalendarClock, Check, FileText, Filter, Lock, Megaphone, Sparkles, UserRound, X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { SampleBadge } from '../Cards';

/**
 * Product UI illustrations built from markup rather than screenshots, so they stay
 * sharp, themeable and readable by screen readers. Every figure is labelled as
 * sample data: none of these numbers, names or companies are real.
 */

export function MockFrame({ title, caption, children, className }: { title: string; caption: string; children: ReactNode; className?: string }) {
  return (
    <figure className={cn('mk-glow-frame m-0', className)}>
      <div className="mk-mock">
        <div className="mk-mock-bar">
          <div className="flex items-center gap-3">
            <span className="mk-mock-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span className="text-[0.8125rem] font-medium text-ink-200">{title}</span>
          </div>
          <SampleBadge>Sample</SampleBadge>
        </div>
        {children}
      </div>
      <figcaption className="mk-mock-caption mt-3 text-center text-xs">{caption}</figcaption>
    </figure>
  );
}

export function Meter({ value, label, figure }: { value: number; label: string; figure: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5">
      <span className="truncate text-ink-200">{label}</span>
      <span className="font-mono text-xs text-white">{figure}</span>
      <div className="mk-meter col-span-2" aria-hidden="true">
        <span style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

const FUNNEL = [
  { label: 'Eligible', count: 312 },
  { label: 'Applied', count: 241 },
  { label: 'Cleared aptitude', count: 128 },
  { label: 'Shortlisted', count: 62 },
  { label: 'Offers', count: 38 },
];

export function DriveBoardMockup({ className }: { className?: string }) {
  return (
    <MockFrame
      title="Placement drive"
      caption="Illustration of a drive view. Sample company and numbers."
      className={className}
    >
      <div className="flex flex-col gap-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-ink-300">Example Systems (sample)</p>
            <p className="font-display text-lg font-semibold">Graduate Engineer Trainee</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden="true" /> Drive open
          </span>
        </div>
        <dl className="grid grid-cols-3 gap-3">
          {[
            ['CTC', '6.5 LPA'],
            ['Min. aggregate', '65%'],
            ['Active backlogs', 'None'],
          ].map(([term, value]) => (
            <div key={term} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <dt className="text-[0.6875rem] uppercase tracking-wide text-ink-300">{term}</dt>
              <dd className="m-0 mt-1 font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-col gap-3">
          {FUNNEL.map((step) => (
            <Meter key={step.label} label={step.label} figure={String(step.count)} value={(step.count / FUNNEL[0].count) * 100} />
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/10 px-5 py-3 text-xs text-ink-200">
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock size={14} aria-hidden="true" /> Technical round · 14 Nov
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Filter size={14} aria-hidden="true" /> Branches: CSE, IT, ECE
        </span>
      </div>
    </MockFrame>
  );
}

function Bubble({ from, who, children }: { from: 'ai' | 'student'; who: string; children: ReactNode }) {
  const ai = from === 'ai';
  return (
    <div className={cn('flex max-w-[88%] flex-col gap-1', !ai && 'self-end items-end')}>
      <span className="inline-flex items-center gap-1.5 text-[0.6875rem] font-medium text-ink-300">
        {ai ? <Bot size={13} aria-hidden="true" /> : <UserRound size={13} aria-hidden="true" />}
        {who}
      </span>
      <p
        className={cn(
          'rounded-2xl px-4 py-2.5 leading-relaxed',
          ai ? 'rounded-tl-sm border border-white/10 bg-white/[0.05]' : 'rounded-tr-sm bg-iris-600 text-white',
        )}
      >
        {children}
      </p>
    </div>
  );
}

export function InterviewMockup({ className }: { className?: string }) {
  return (
    <MockFrame
      title="AI mock interview · Technical round"
      caption="Illustration of a text mock interview. Sample conversation."
      className={className}
    >
      <div className="flex flex-col gap-4 p-5">
        <Bubble from="ai" who="Interviewer">
          Your resume says your project used MQTT. Why did you choose it over plain HTTP for the sensor data?
        </Bubble>
        <Bubble from="student" who="Student">
          Because it is faster.
        </Bubble>
        <Bubble from="ai" who="Interviewer">
          Faster in what way? Think about how often the sensors send data and what happens when the network drops.
        </Bubble>
      </div>
      <div className="flex items-center gap-2 border-t border-white/10 px-5 py-3 text-xs text-ink-200">
        <Sparkles size={14} className="text-aqua-300" aria-hidden="true" />
        Follow-up asked because the first answer was vague
      </div>
    </MockFrame>
  );
}

const RUBRIC = [
  { label: 'Technical depth', score: 7 },
  { label: 'Problem solving', score: 6 },
  { label: 'Communication', score: 5 },
  { label: 'Role fit', score: 7 },
];

export function FeedbackMockup({ className }: { className?: string }) {
  return (
    <MockFrame title="Interview feedback" caption="Illustration of rubric feedback. Sample scores." className={className}>
      <div className="flex flex-col gap-4 p-5">
        {RUBRIC.map((row) => (
          <Meter key={row.label} label={row.label} figure={`${row.score} / 10`} value={row.score * 10} />
        ))}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-aqua-300">What to work on</p>
          <p className="leading-relaxed text-ink-200">
            You reached the right idea after one prompt. Lead with it next time, then name the trade-off in two or three
            sentences.
          </p>
        </div>
      </div>
    </MockFrame>
  );
}

const SKILLS = [
  { label: 'Aptitude', ready: 77 },
  { label: 'Data structures', ready: 59 },
  { label: 'SQL', ready: 52 },
  { label: 'Communication', ready: 39 },
  { label: 'System design basics', ready: 21 },
];

export function ReadinessMockup({ className }: { className?: string }) {
  return (
    <MockFrame title="Batch readiness · CSE 2027" caption="Illustration of a planned batch view. Sample figures." className={className}>
      <div className="flex flex-col gap-4 p-5">
        <p className="text-xs text-ink-300">Share of the batch rated ready on each skill</p>
        {SKILLS.map((skill) => (
          <Meter key={skill.label} label={skill.label} figure={`${skill.ready}%`} value={skill.ready} />
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-white/10 px-5 py-3 text-xs text-ink-200">
        <Sparkles size={14} className="text-aqua-300" aria-hidden="true" />
        Suggested: communication workshops before the next drives
      </div>
    </MockFrame>
  );
}

export function ResumeMockup({ className }: { className?: string }) {
  return (
    <MockFrame title="Resume analysis" caption="Illustration of resume feedback. Sample resume." className={className}>
      <div className="grid gap-4 p-5 sm:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-4" aria-hidden="true">
          <FileText size={18} className="text-ink-300" />
          {[90, 70, 82, 55, 76, 64].map((width, index) => (
            <span key={index} className="h-2 rounded-full bg-white/10" style={{ width: `${width}%` }} />
          ))}
        </div>
        <ul className="flex flex-col gap-3">
          {[
            ['Missing for this role', 'REST APIs, Git workflow'],
            ['Vague project line', '“Worked on a web app” → name the stack and your part'],
            ['Strong', 'Internship impact is clear and measured'],
          ].map(([title, body]) => (
            <li key={title} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs font-semibold text-aqua-300">{title}</p>
              <p className="mt-0.5 text-ink-200">{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </MockFrame>
  );
}

const KPIS = [
  { label: 'Open drives', value: '4' },
  { label: 'Eligible students', value: '312' },
  { label: 'Mock interviews this week', value: '86' },
];

const UPCOMING = [
  { company: 'Example Systems', role: 'Graduate Engineer Trainee', date: '14 Nov', state: 'Applications open' },
  { company: 'Acme Analytics', role: 'Data Analyst', date: '19 Nov', state: 'Eligibility review' },
  { company: 'Sample Labs', role: 'Associate Developer', date: '26 Nov', state: 'Draft' },
];

/** Placement-cell overview: the hero image on the home page. */
export function DashboardMockup({ className }: { className?: string }) {
  return (
    <MockFrame
      title="Placement overview · 2027 batch"
      caption="Illustrative dashboard. Sample companies and numbers, not a live screenshot."
      className={className}
    >
      <div className="flex flex-col gap-5 p-5">
        <dl className="grid grid-cols-3 gap-3">
          {KPIS.map((kpi) => (
            <div key={kpi.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <dt className="text-[0.6875rem] leading-tight text-ink-300">{kpi.label}</dt>
              <dd className="m-0 mt-1.5 font-display text-xl font-semibold">{kpi.value}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-aqua-300">Upcoming drives</p>
            <ul className="flex flex-col gap-2">
              {UPCOMING.map((drive) => (
                <li key={drive.company} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="font-medium">{drive.role}</p>
                    <p className="text-xs text-ink-300">{drive.company} (sample) · {drive.date}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-iris-500/20 px-2 py-0.5 text-[0.6875rem] font-medium text-iris-200">{drive.state}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-aqua-300">Batch readiness</p>
            <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
              <Meter label="Resume complete" figure="81%" value={81} />
              <Meter label="Practised interview" figure="64%" value={64} />
              <Meter label="Profile verified" figure="47%" value={47} />
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-white/10 px-5 py-3 text-xs text-ink-200">
        <Megaphone size={14} className="text-aqua-300" aria-hidden="true" />
        Announcement sent to CSE, IT and ECE final years
      </div>
    </MockFrame>
  );
}

const CHECKS = [
  { rule: 'Branch: CSE, IT or ECE', value: 'CSE', pass: true },
  { rule: 'Graduating in 2027', value: '2027', pass: true },
  { rule: 'Aggregate 65% or above', value: '71.4%', pass: true },
  { rule: 'No active backlogs', value: '1 active', pass: false },
];

/** A student's eligibility check for one drive. */
export function EligibilityMockup({ className }: { className?: string }) {
  return (
    <MockFrame title="Eligibility check · Student view" caption="Illustration of the eligibility check. Sample student and rules." className={className}>
      <div className="flex flex-col gap-4 p-5">
        <div>
          <p className="text-xs text-ink-300">Example Systems (sample) · Graduate Engineer Trainee</p>
          <p className="font-display text-lg font-semibold">Not eligible yet: 1 rule not met</p>
        </div>
        <ul className="flex flex-col gap-2">
          {CHECKS.map((check) => (
            <li key={check.rule} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
              <span className="flex items-center gap-2.5">
                <span
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full',
                    check.pass ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-400/15 text-amber-300',
                  )}
                >
                  {check.pass ? <Check size={13} aria-hidden="true" /> : <X size={13} aria-hidden="true" />}
                </span>
                <span>{check.rule}</span>
                <span className="sr-only">{check.pass ? 'met' : 'not met'}</span>
              </span>
              <span className="font-mono text-xs text-ink-200">{check.value}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex items-center gap-2 border-t border-white/10 px-5 py-3 text-xs text-ink-200">
        <Filter size={14} className="text-aqua-300" aria-hidden="true" />
        Checked against the student's academic record
      </div>
    </MockFrame>
  );
}

const DEPARTMENTS = [
  { name: 'Computer Science', students: 184, applied: 151, offers: 62 },
  { name: 'Information Technology', students: 120, applied: 97, offers: 41 },
  { name: 'Electronics', students: 132, applied: 88, offers: 29 },
  { name: 'Mechanical', students: 96, applied: 52, offers: 14 },
];

/** Institution leadership: placement activity by department. */
export function DepartmentMockup({ className }: { className?: string }) {
  return (
    <MockFrame title="Placement by department · 2027 batch" caption="Illustrative institution view. Sample departments and numbers." className={className}>
      <div className="overflow-x-auto p-5">
        <table className="w-full min-w-[22rem] text-left text-[0.8125rem]">
          <caption className="sr-only">Sample placement activity by department</caption>
          <thead className="text-[0.6875rem] uppercase tracking-wide text-ink-300">
            <tr>
              <th scope="col" className="pb-2 font-medium">Department</th>
              <th scope="col" className="pb-2 text-right font-medium">Final years</th>
              <th scope="col" className="pb-2 text-right font-medium">Applied</th>
              <th scope="col" className="pb-2 text-right font-medium">Offers</th>
            </tr>
          </thead>
          <tbody>
            {DEPARTMENTS.map((dept) => (
              <tr key={dept.name} className="border-t border-white/10">
                <th scope="row" className="py-2.5 font-medium">{dept.name}</th>
                <td className="py-2.5 text-right font-mono text-ink-200">{dept.students}</td>
                <td className="py-2.5 text-right font-mono text-ink-200">{dept.applied}</td>
                <td className="py-2.5 text-right font-mono text-white">{dept.offers}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2 border-t border-white/10 px-5 py-3 text-xs text-ink-200">
        <Sparkles size={14} className="text-aqua-300" aria-hidden="true" />
        Mechanical: fewer applications than last batch. Review drive mix.
      </div>
    </MockFrame>
  );
}

const CLASS = [
  { name: 'Student A', resume: true, practised: 3, flag: false },
  { name: 'Student B', resume: true, practised: 0, flag: true },
  { name: 'Student C', resume: false, practised: 1, flag: true },
  { name: 'Student D', resume: true, practised: 5, flag: false },
];

/** Faculty mentor: their own class's preparation (planned feature). */
export function ClassProgressMockup({ className }: { className?: string }) {
  return (
    <MockFrame title="My mentees · ECE 2027" caption="Illustration of a planned faculty view. Sample, anonymised students." className={className}>
      <ul className="flex flex-col gap-2 p-5">
        {CLASS.map((student) => (
          <li key={student.name} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
            <span className="font-medium">{student.name}</span>
            <span className="flex flex-wrap items-center gap-2 text-xs text-ink-200">
              <span>{student.resume ? 'Resume ready' : 'Resume missing'}</span>
              <span aria-hidden="true">·</span>
              <span>{student.practised} mock interviews</span>
              {student.flag && <span className="rounded-full bg-amber-400/15 px-2 py-0.5 font-medium text-amber-300">Needs a check-in</span>}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2 border-t border-white/10 px-5 py-3 text-xs text-ink-200">
        <Lock size={14} className="text-aqua-300" aria-hidden="true" />
        Shows only students assigned to you
      </div>
    </MockFrame>
  );
}

const APPLICATIONS = [
  { role: 'Graduate Engineer Trainee', company: 'Example Systems', stage: 'Technical round · 14 Nov' },
  { role: 'Data Analyst', company: 'Acme Analytics', stage: 'Applied' },
];

/** Student: own readiness, next steps and applications. */
export function StudentHomeMockup({ className }: { className?: string }) {
  return (
    <MockFrame title="My placement journey" caption="Illustrative student view. Sample student, companies and scores." className={className}>
      <div className="flex flex-col gap-5 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[0.6875rem] uppercase tracking-wide text-ink-300">Profile</p>
            <p className="mt-1 font-display text-xl font-semibold">85% complete</p>
            <div className="mk-meter mt-2" aria-hidden="true">
              <span style={{ width: '85%' }} />
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[0.6875rem] uppercase tracking-wide text-ink-300">Next step</p>
            <p className="mt-1 font-medium">Practise a technical interview for Graduate Engineer Trainee</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-aqua-300">My applications</p>
          {APPLICATIONS.map((app) => (
            <div key={app.role} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
              <div>
                <p className="font-medium">{app.role}</p>
                <p className="text-xs text-ink-300">{app.company} (sample)</p>
              </div>
              <span className="rounded-full bg-iris-500/20 px-2 py-0.5 text-[0.6875rem] font-medium text-iris-200">{app.stage}</span>
            </div>
          ))}
        </div>
      </div>
    </MockFrame>
  );
}

const STAGES = [
  { label: 'Eligible list shared', count: 48 },
  { label: 'Shortlisted', count: 22 },
  { label: 'Interviewing', count: 9 },
  { label: 'Offer made', count: 4 },
];

/** Recruiter: candidate stages for one campus drive (planned feature). */
export function CandidatePipelineMockup({ className }: { className?: string }) {
  return (
    <MockFrame title="Campus drive · Candidate stages" caption="Illustration of a planned recruiter view. Sample drive and counts." className={className}>
      <div className="flex flex-col gap-4 p-5">
        <div>
          <p className="text-xs text-ink-300">Sample Institute of Technology · Associate Developer</p>
          <p className="font-display text-lg font-semibold">Shared by the placement cell</p>
        </div>
        <ol className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-4">
          {STAGES.map((stage) => (
            <li key={stage.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="font-display text-xl font-semibold">{stage.count}</p>
              <p className="text-xs leading-snug text-ink-200">{stage.label}</p>
            </li>
          ))}
        </ol>
      </div>
      <div className="flex items-center gap-2 border-t border-white/10 px-5 py-3 text-xs text-ink-200">
        <Lock size={14} className="text-aqua-300" aria-hidden="true" />
        Profile sections are visible only if the student chose to share them
      </div>
    </MockFrame>
  );
}
