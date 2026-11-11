import type { CapabilityId } from './capabilities';
import { SITE_PAGES } from '../siteMap';

/** The placement season in eight stages; used by the How it works page and the home page path. */
export interface Stage {
  id: string;
  role: string;
  title: string;
  body: string;
  uses: CapabilityId[];
  link?: { to: string; label: string };
}

export const STAGES: Stage[] = [
  {
    id: 'setup',
    role: 'Institution admin',
    title: 'Institution onboarding and setup',
    body: 'Add departments, courses and academic years, assign roles, and set the placement policies your institution follows.',
    uses: ['academicStructure', 'rolesPermissions', 'placementPolicy'],
  },
  {
    id: 'people',
    role: 'Institution admin and staff',
    title: 'Student and faculty onboarding',
    body: 'Invite placement officers and faculty by email. Students register and the institution approves each registration, or brings students in from existing records.',
    uses: ['onboarding', 'bulkImport'],
  },
  {
    id: 'profiles',
    role: 'Students',
    title: 'Profile and resume preparation',
    body: 'Students complete their career profile with projects, skills and experience, upload a resume and get feedback on how to improve it.',
    uses: ['careerProfile', 'resumeUpload', 'resumeAnalysis'],
    link: { to: SITE_PAGES.careerIntelligence.path, label: 'Career Intelligence' },
  },
  {
    id: 'opportunities',
    role: 'Placement officer and students',
    title: 'Opportunities and eligibility checks',
    body: "The placement cell adds companies and roles with their criteria. Each student's record is checked against those criteria, so eligible lists are built rather than typed.",
    uses: ['placementDrives', 'eligibilityEngine', 'jobMatching'],
  },
  {
    id: 'preparation',
    role: 'Students, faculty and trainers',
    title: 'Preparation and AI interview practice',
    body: 'Students practise role-specific mock interviews as often as they need and read the feedback. Faculty see where their classes need help.',
    uses: ['aiInterviewText', 'interviewFeedback', 'assessments'],
    link: { to: SITE_PAGES.aiInterviewer.path, label: 'AI Interviewer' },
  },
  {
    id: 'drives',
    role: 'Placement officer',
    title: 'Placement drive coordination',
    body: 'Publish the drive, notify the students it applies to, and manage each round: aptitude, technical and HR, through to results.',
    uses: ['placementDrives', 'announcements', 'notifications', 'roundsOffers'],
    link: { to: SITE_PAGES.placementManagement.path, label: 'Placement Management' },
  },
  {
    id: 'outcomes',
    role: 'Students and placement officer',
    title: 'Applications and outcomes',
    body: 'Students apply in one place and follow each round. Offers and placement records are captured, and the institution\'s offer policy is checked automatically.',
    uses: ['placementDrives', 'placementPolicy', 'roundsOffers'],
  },
  {
    id: 'reporting',
    role: 'Leadership and placement cell',
    title: 'Reporting and continuous improvement',
    body: 'Review placements by department and readiness by batch, see which skills the next batch is missing, and plan training before the next season.',
    uses: ['analytics', 'careerReadiness', 'batchInsights'],
  },
];
