import { LOGIN_BASE_PATH } from '../routes';
import { SITE_PAGES, SOLUTION_ROLES, solutionPath } from './siteMap';

// Header and footer navigation, built from the site map so labels and paths stay in one place.

export interface NavLinkItem {
  label: string;
  to: string;
  description?: string;
}

export interface NavGroup {
  label: string;
  /** Path prefix that marks the group as current. */
  match: string;
  items: NavLinkItem[];
}

export type NavEntry = NavLinkItem | NavGroup;

export const isNavGroup = (entry: NavEntry): entry is NavGroup => 'items' in entry;

export const PRIMARY_NAV: NavEntry[] = [
  {
    label: 'Platform',
    match: SITE_PAGES.platform.path,
    items: [
      { label: 'Platform overview', to: SITE_PAGES.platform.path, description: 'Every module and its build status' },
      { label: 'AI Interviewer', to: SITE_PAGES.aiInterviewer.path, description: 'Mock interviews that ask the follow-up' },
      { label: 'Career Intelligence', to: SITE_PAGES.careerIntelligence.path, description: 'Resume analysis and readiness' },
      { label: 'Placement Management', to: SITE_PAGES.placementManagement.path, description: 'Drives, eligibility, rounds and offers' },
    ],
  },
  {
    label: 'Solutions',
    match: SITE_PAGES.solutions.path,
    items: [
      { label: 'All solutions', to: SITE_PAGES.solutions.path, description: 'How the five roles work together' },
      ...SOLUTION_ROLES.map((role) => ({ label: role.label, to: solutionPath(role.id), description: role.summary })),
    ],
  },
  { label: 'How it works', to: SITE_PAGES.howItWorks.path },
  { label: 'About', to: SITE_PAGES.about.path },
  { label: 'FAQs', to: SITE_PAGES.faq.path },
];

export const SIGN_IN_PATH = LOGIN_BASE_PATH;
export const DEMO_PATH = SITE_PAGES.contact.path;

export const FOOTER_NAV: { heading: string; links: NavLinkItem[] }[] = [
  {
    heading: 'Platform',
    links: [
      { label: 'Overview', to: SITE_PAGES.platform.path },
      { label: 'AI Interviewer', to: SITE_PAGES.aiInterviewer.path },
      { label: 'Career Intelligence', to: SITE_PAGES.careerIntelligence.path },
      { label: 'Placement Management', to: SITE_PAGES.placementManagement.path },
      { label: 'How it works', to: SITE_PAGES.howItWorks.path },
    ],
  },
  {
    heading: 'Solutions',
    links: SOLUTION_ROLES.map((role) => ({ label: role.label, to: solutionPath(role.id) })),
  },
  {
    heading: 'Company',
    links: [
      { label: 'About us', to: SITE_PAGES.about.path },
      { label: 'FAQs', to: SITE_PAGES.faq.path },
      { label: 'Contact and demo', to: SITE_PAGES.contact.path },
      { label: 'Sign in', to: SIGN_IN_PATH },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy', to: SITE_PAGES.privacy.path },
      { label: 'Terms & Conditions', to: SITE_PAGES.terms.path },
    ],
  },
];
