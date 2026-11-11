/** Pure helpers for CampusWorkspace: formatting, card tones and resume analysis. */
import type { CardTone } from './types';
import { isAdminRole, isInstitutionStaffRole } from '../../../campusTypes';
import type {
  AnnouncementAudience,
  AnnouncementPriority,
  CampusData,
  CampusResumeTemplate,
  CampusRole,
  CampusStudentResume,
  CompanyStatus,
  FeeStatus,
  StudentStatus,
} from '../../../campusTypes';

export const monthTrend = [
  { month: 'Jan', offers: 8, drives: 2 },
  { month: 'Feb', offers: 14, drives: 3 },
  { month: 'Mar', offers: 18, drives: 3 },
  { month: 'Apr', offers: 22, drives: 4 },
  { month: 'May', offers: 27, drives: 5 },
  { month: 'Jun', offers: 31, drives: 5 },
];

export const cardToneStyles: Record<
  CardTone,
  {
    metric: string;
    highlight: string;
    icon: string;
    helper: string;
  }
> = {
  navy: {
    metric: 'border border-slate-200 bg-white shadow-sm',
    highlight: 'border border-slate-200 bg-white shadow-sm',
    icon: 'bg-blue-50 text-blue-600',
    helper: 'bg-blue-50 text-blue-600',
  },
  sky: {
    metric: 'border border-slate-200 bg-white shadow-sm',
    highlight: 'border border-slate-200 bg-white shadow-sm',
    icon: 'bg-sky-50 text-sky-600',
    helper: 'bg-sky-50 text-sky-600',
  },
  teal: {
    metric: 'border border-slate-200 bg-white shadow-sm',
    highlight: 'border border-slate-200 bg-white shadow-sm',
    icon: 'bg-teal-50 text-teal-600',
    helper: 'bg-teal-50 text-teal-600',
  },
  amber: {
    metric: 'border border-slate-200 bg-white shadow-sm',
    highlight: 'border border-slate-200 bg-white shadow-sm',
    icon: 'bg-amber-50 text-amber-600',
    helper: 'bg-amber-50 text-amber-600',
  },
  indigo: {
    metric: 'border border-slate-200 bg-white shadow-sm',
    highlight: 'border border-slate-200 bg-white shadow-sm',
    icon: 'bg-indigo-50 text-indigo-600',
    helper: 'bg-indigo-50 text-indigo-600',
  },
  emerald: {
    metric: 'border border-slate-200 bg-white shadow-sm',
    highlight: 'border border-slate-200 bg-white shadow-sm',
    icon: 'bg-emerald-50 text-emerald-600',
    helper: 'bg-emerald-50 text-emerald-600',
  },
};

export function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function formatDate(dateValue: string) {
  return new Date(dateValue).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const calendarWeekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function audienceMatches(role: CampusRole, audience: AnnouncementAudience) {
  if (audience === 'all' || audience === 'All') {
    return true;
  }
  if (isAdminRole(role)) {
    return true;
  }
  return (
    (isInstitutionStaffRole(role) && (audience === 'staff' || audience === 'Staff')) ||
    (role === 'student' && (audience === 'students' || audience === 'Students'))
  );
}

export function statusTone(status: StudentStatus | CompanyStatus | AnnouncementPriority | FeeStatus) {
  const tones: Record<string, string> = {
    active: 'bg-slate-100 text-slate-700',
    Active: 'bg-slate-100 text-slate-700',
    placement_ready: 'bg-blue-50 text-blue-700',
    'Placement Ready': 'bg-blue-50 text-blue-700',
    placed: 'bg-emerald-50 text-emerald-700',
    Placed: 'bg-emerald-50 text-emerald-700',
    open: 'bg-emerald-50 text-emerald-700',
    Open: 'bg-emerald-50 text-emerald-700',
    closing_soon: 'bg-amber-50 text-amber-700',
    'Closing Soon': 'bg-amber-50 text-amber-700',
    upcoming: 'bg-sky-50 text-sky-700',
    Upcoming: 'bg-sky-50 text-sky-700',
    closed: 'bg-slate-100 text-slate-500',
    Closed: 'bg-slate-100 text-slate-500',
    high: 'bg-red-50 text-red-700',
    High: 'bg-red-50 text-red-700',
    medium: 'bg-amber-50 text-amber-700',
    Medium: 'bg-amber-50 text-amber-700',
    low: 'bg-slate-100 text-slate-600',
    Low: 'bg-slate-100 text-slate-600',
    paid: 'bg-emerald-50 text-emerald-700',
    Paid: 'bg-emerald-50 text-emerald-700',
    pending: 'bg-red-50 text-red-700',
    Pending: 'bg-red-50 text-red-700',
  };

  return tones[status] ?? 'bg-slate-100 text-slate-700';
}

export const resumeTemplateOptions: Array<{
  id: CampusResumeTemplate;
  label: string;
  description: string;
  shellClass: string;
  accentClass: string;
}> = [
  {
    id: 'classic_ats',
    label: 'Classic ATS',
    description: 'Single-column structure with strong section headers for recruiter systems.',
    shellClass: 'border border-slate-200 bg-white',
    accentClass: 'bg-slate-950 text-white',
  },
  {
    id: 'modern_ats',
    label: 'Modern ATS',
    description: 'Clean header and balanced spacing while keeping ATS-safe text blocks.',
    shellClass: 'border border-sky-200 bg-[linear-gradient(180deg,#ffffff,#f5fbff)]',
    accentClass: 'bg-[linear-gradient(135deg,#072b52,#16a3db)] text-white',
  },
  {
    id: 'compact_ats',
    label: 'Compact ATS',
    description: 'Tighter layout for one-page resumes with dense but readable sections.',
    shellClass: 'border border-emerald-200 bg-[linear-gradient(180deg,#ffffff,#f5fcf8)]',
    accentClass: 'bg-emerald-600 text-white',
  },
];

export function resumeListToText(items: string[]) {
  return items.join('\n');
}

export function resumeTextToList(value: string) {
  return value
    .split('\n')
    .map((item) => item.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean);
}

export function uniqueResumeKeywords(keywords: string[]) {
  return Array.from(
    new Set(
      keywords
        .map((keyword) => keyword.trim().toLowerCase())
        .filter((keyword) => keyword.length > 2),
    ),
  );
}

export function buildResumeBenchmarkKeywords(student: CampusData['students'][number], companies: CampusData['companies']) {
  return uniqueResumeKeywords([
    ...student.skills,
    ...companies.flatMap((company) =>
      `${company.role} ${company.name} ${company.type} ${company.packageOffered}`
        .split(/[^a-zA-Z0-9+#.]+/)
        .filter(Boolean),
    ),
    'projects',
    'leadership',
    'communication',
    'problem solving',
    'internship',
    'placement',
  ]).slice(0, 16);
}

export function buildGeneratedResumeText(student: CampusData['students'][number], resume: CampusStudentResume) {
  const sections = [
    `${student.name}`,
    resume.headline || `${student.departmentCode} student`,
    [student.email, student.phone || '', resume.location].filter(Boolean).join(' | '),
    resume.links.length ? `Links: ${resume.links.join(' | ')}` : '',
    '',
    'PROFESSIONAL SUMMARY',
    resume.summary,
    '',
    'TARGET ROLE',
    resume.targetRole,
    '',
    'EDUCATION',
    `${student.departmentCode} | ${masterYearLabel(student.year)} | CGPA ${student.cgpa.toFixed(1)} | Attendance ${student.attendance}%`,
    '',
    'SKILLS',
    student.skills.join(', '),
    '',
    'PROJECTS',
    ...resume.projects.map((item) => `- ${item}`),
    '',
    'EXPERIENCE',
    ...resume.experience.map((item) => `- ${item}`),
    '',
    'ACHIEVEMENTS',
    ...resume.achievements.map((item) => `- ${item}`),
    '',
    'CERTIFICATIONS',
    ...resume.certifications.map((item) => `- ${item}`),
  ];

  return sections.filter((section) => section !== '').join('\n');
}

export function masterYearLabel(year: string) {
  return ({
    year_1: '1st Year',
    year_2: '2nd Year',
    year_3: '3rd Year',
    year_4: '4th Year',
  } as Record<string, string>)[year] ?? year;
}

export function analyzeResumeText(
  text: string,
  benchmarkKeywords: string[],
  resume: CampusStudentResume,
  student: CampusData['students'][number],
) {
  const normalizedText = text.toLowerCase();
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const hasContact = Boolean(student.email) && Boolean(student.phone || resume.location || resume.links.length);
  const hasSummary = Boolean(resume.summary.trim()) || /\b(summary|profile)\b/i.test(text);
  const hasSkills = student.skills.length > 0 || /\bskills\b/i.test(text);
  const hasProjects = resume.projects.length > 0 || /\bprojects?\b/i.test(text);
  const hasExperience = resume.experience.length > 0 || /\bexperience\b/i.test(text);
  const hasMetrics = /\b\d+(\.\d+)?%|\b\d+\+|\b\d+x\b|\b\d+\s*(users|students|projects|drives|teams|apps)\b/i.test(text);
  const hasActionVerbs = /\b(built|led|designed|developed|created|implemented|improved|optimized|delivered|launched|managed)\b/i.test(text);
  const atsSafeFormatting = !/[|]{2,}|[_]{3,}|[*]{3,}/.test(text);
  const matchedKeywords = benchmarkKeywords.filter((keyword) => normalizedText.includes(keyword));
  const missingKeywords = benchmarkKeywords.filter((keyword) => !normalizedText.includes(keyword)).slice(0, 6);
  const keywordScore = benchmarkKeywords.length === 0 ? 0 : Math.round((matchedKeywords.length / benchmarkKeywords.length) * 15);

  let score = 0;
  if (hasContact) score += 14;
  if (hasSummary) score += 12;
  if (hasSkills) score += 14;
  if (hasProjects) score += 12;
  if (hasExperience) score += 12;
  if (hasMetrics) score += 10;
  if (hasActionVerbs) score += 8;
  if (atsSafeFormatting) score += 6;
  score += wordCount >= 220 && wordCount <= 900 ? 12 : wordCount >= 140 ? 6 : 0;
  score += keywordScore;

  const missingSections = [
    !hasContact ? 'Contact details' : null,
    !hasSummary ? 'Professional summary' : null,
    !hasSkills ? 'Skills section' : null,
    !hasProjects ? 'Projects section' : null,
    !hasExperience ? 'Experience section' : null,
    !hasMetrics ? 'Measured impact' : null,
  ].filter(Boolean) as string[];

  const suggestions = [
    !hasMetrics ? 'Add measurable outcomes like percentages, counts, or delivery impact.' : null,
    matchedKeywords.length < 5 ? 'Mirror keywords from target roles and eligible drives so ATS filters catch your resume.' : null,
    wordCount < 220 ? 'Expand your resume with project impact, achievements, and clear skill evidence.' : null,
    wordCount > 900 ? 'Tighten long paragraphs so the resume stays one-page and ATS-friendly.' : null,
    !hasActionVerbs ? 'Start bullets with action verbs like built, led, optimized, or delivered.' : null,
  ].filter(Boolean) as string[];

  return {
    score: Math.max(38, Math.min(98, score)),
    wordCount,
    matchedKeywords,
    missingKeywords,
    missingSections,
    suggestions,
  };
}
