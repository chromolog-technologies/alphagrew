// Public marketing site routes: one entry per page, used by the router, navigation,
// breadcrumbs, page metadata and the generated sitemap.xml. Keep this file free of
// React imports so vite.config.ts can read it at build time.

export type SitePageId =
  | 'home'
  | 'about'
  | 'platform'
  | 'aiInterviewer'
  | 'careerIntelligence'
  | 'placementManagement'
  | 'solutions'
  | 'solutionInstitutions'
  | 'solutionPlacementOfficers'
  | 'solutionFaculty'
  | 'solutionStudents'
  | 'solutionRecruiters'
  | 'howItWorks'
  | 'faq'
  | 'contact'
  | 'privacy'
  | 'terms';

export interface SitePage {
  path: string;
  /** Short name used in navigation and breadcrumbs. */
  label: string;
  /** Document title (the brand is appended by PageMeta). */
  title: string;
  /** Meta description: under ~160 characters. */
  description: string;
  /** Why the page exists and what it must answer for the visitor. */
  purpose: string;
  /** Breadcrumb parent; home has none. */
  parent?: SitePageId;
  /** Kept out of search results until the page is final. */
  noindex?: boolean;
}

export const SITE_PAGES: Record<SitePageId, SitePage> = {
  home: {
    path: '/',
    label: 'Home',
    title: 'From campus learning to career readiness',
    description:
      'Alphagrew is an AI-powered campus placement and career intelligence platform connecting institutions, placement teams, students and recruiters.',
    purpose:
      'Explain in one screen what Alphagrew is and who it is for, route each audience to its solution, and lead to a demo request.',
  },
  about: {
    path: '/about',
    label: 'About us',
    title: 'About us',
    description: 'The problem Alphagrew solves, its mission, vision and principles, and how it relates to Chromolog Technologies.',
    purpose: 'Explain the fragmented placement problem, the mission and vision, product principles and the Chromolog Technologies relationship.',
    parent: 'home',
  },
  platform: {
    path: '/platform',
    label: 'Platform',
    title: 'Platform and features',
    description:
      'Alphagrew features for placement operations, profiles and resumes, eligibility, interview preparation, readiness insights and reporting, with build status.',
    purpose: 'Give evaluators every feature area with honest build status (in current build, in development, planned) and link to each product page.',
    parent: 'home',
  },
  aiInterviewer: {
    path: '/platform/ai-interviewer',
    label: 'AI Interviewer',
    title: 'AI Interviewer: resume-aware mock interviews',
    description: 'Typed mock interviews built from a student\'s resume and target role, with follow-up questions, example questions by interview type and a rubric feedback report.',
    purpose: 'Show how AI mock interviews work, what feedback looks like, and the guardrails around AI use.',
    parent: 'platform',
  },
  careerIntelligence: {
    path: '/platform/career-intelligence',
    label: 'Career Intelligence',
    title: 'Career Intelligence: skill gaps and readiness',
    description: 'Combine profile, academic, resume and mock interview evidence to show each student\'s strengths, skill gaps and next practice steps. A coaching aid, not a placement prediction.',
    purpose: 'Explain resume analysis and readiness, and how staff use batch-level insight to plan training.',
    parent: 'platform',
  },
  placementManagement: {
    path: '/platform/placement-management',
    label: 'Placement Management',
    title: 'Placement Management: drives, eligibility and applications',
    description: 'Run campus placement drives from one record: companies, jobs, eligibility rules, applications, schedules, notices, rounds, outcomes and reports, with role-based access.',
    purpose: 'Walk a placement officer through the drive lifecycle and the eligibility model.',
    parent: 'platform',
  },
  solutions: {
    path: '/solutions',
    label: 'Solutions',
    title: 'Solutions by role',
    description: 'What Alphagrew does for institutions, placement officers, faculty, students and recruiters, and how the roles work together.',
    purpose: 'Route each of the five audiences to its own solution page, and show how the roles connect on one student record.',
    parent: 'home',
  },
  solutionInstitutions: {
    path: '/solutions/institutions',
    label: 'Institutions',
    title: 'Alphagrew for institutions',
    description: 'Institution-wide oversight of placement activity, department-level visibility, reporting and employability preparation.',
    purpose: 'Show leadership consolidated placement visibility across departments and lead to an institutional demo.',
    parent: 'solutions',
  },
  solutionPlacementOfficers: {
    path: '/solutions/placement-officers',
    label: 'Placement Officers',
    title: 'Alphagrew for placement officers',
    description: 'Company and job postings, eligibility criteria, shortlists, drive schedules, application tracking, notifications and placement reports.',
    purpose: 'Walk the placement cell through the drive workflow and show what is built, in development or planned.',
    parent: 'solutions',
  },
  solutionFaculty: {
    path: '/solutions/faculty',
    label: 'Faculty',
    title: 'Alphagrew for faculty',
    description: 'How faculty can support student preparation, assessments, progress reviews and targeted help, within the access their institution grants.',
    purpose: 'Explain the faculty role in preparation without implying unbuilt dashboards are live.',
    parent: 'solutions',
  },
  solutionStudents: {
    path: '/solutions/students',
    label: 'Students',
    title: 'Alphagrew for students',
    description: 'Build your profile and resume, practise AI mock interviews, see opportunities you qualify for and track every application.',
    purpose: 'Show students how to prepare and route them to registration through their institution.',
    parent: 'solutions',
  },
  solutionRecruiters: {
    path: '/solutions/recruiters',
    label: 'Recruiters',
    title: 'Alphagrew for recruiters',
    description: 'The intended campus hiring workflow on Alphagrew: eligible candidates, authorised profiles, drive coordination and candidate stages.',
    purpose: 'Describe the planned recruiter workflow honestly and lead to a campus hiring conversation.',
    parent: 'solutions',
  },
  howItWorks: {
    path: '/how-it-works',
    label: 'How it works',
    title: 'How it works',
    description: 'The end-to-end flow on Alphagrew, from institution onboarding to placement outcomes, reporting and continuous improvement.',
    purpose: 'Describe the eight stages of a placement season on Alphagrew, who does what, and what a pilot rollout involves.',
    parent: 'home',
  },
  faq: {
    path: '/faq',
    label: 'FAQs',
    title: 'Frequently asked questions',
    description: 'Answers to common questions about Alphagrew, AI use, data protection and getting started.',
    purpose: 'Remove objections (data, AI fairness, setup effort) before a demo request.',
    parent: 'home',
  },
  contact: {
    path: '/contact',
    label: 'Book a demo',
    title: 'Contact us and book a demo',
    description: 'Tell us about your institution and book a walkthrough of Alphagrew.',
    purpose: 'Collect demo requests and give every audience a way to reach the team.',
    parent: 'home',
  },
  privacy: {
    path: '/privacy',
    label: 'Privacy Policy',
    title: 'Privacy Policy',
    description: 'How Alphagrew handles personal data.',
    purpose: 'Publish the privacy notice required for students, staff and recruiters. Draft until legal review.',
    parent: 'home',
    noindex: true,
  },
  terms: {
    path: '/terms',
    label: 'Terms & Conditions',
    title: 'Terms and Conditions',
    description: 'Terms and conditions for using Alphagrew.',
    purpose: 'Publish the terms of use for the website and platform. Draft until legal review.',
    parent: 'home',
    noindex: true,
  },
};

export const sitePath = (id: SitePageId) => SITE_PAGES[id].path;

/** Pages from home down to the given page, for breadcrumbs. */
export function breadcrumbTrail(id: SitePageId): SitePageId[] {
  const trail: SitePageId[] = [];
  let current: SitePageId | undefined = id;
  while (current) {
    trail.unshift(current);
    current = SITE_PAGES[current].parent;
  }
  return trail;
}

/** The five audiences. Each has its own landing page under /solutions/<id>. */
export const SOLUTION_ROLES = [
  { id: 'institutions', page: 'solutionInstitutions', label: 'Institutions', summary: 'Placement activity and outcomes across every department' },
  { id: 'placement-officers', page: 'solutionPlacementOfficers', label: 'Placement Officers', summary: 'Drives, eligibility and applications without the spreadsheets' },
  { id: 'faculty', page: 'solutionFaculty', label: 'Faculty', summary: 'Support preparation where your access allows' },
  { id: 'students', page: 'solutionStudents', label: 'Students', summary: 'Prepare, apply and track every round' },
  { id: 'recruiters', page: 'solutionRecruiters', label: 'Recruiters', summary: 'Campus hiring through the placement cell' },
] as const satisfies readonly { id: string; page: SitePageId; label: string; summary: string }[];

export type SolutionRoleId = (typeof SOLUTION_ROLES)[number]['id'];

export const solutionRole = (id: SolutionRoleId) => SOLUTION_ROLES.find((role) => role.id === id)!;

export const solutionPath = (role: SolutionRoleId) => SITE_PAGES[solutionRole(role).page].path;
