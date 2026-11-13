import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlarmClock,
  BarChart3,
  Briefcase,
  Building2,
  CalendarRange,
  ClipboardList,
  Compass,
  EyeOff,
  FileQuestion,
  FileSpreadsheet,
  GraduationCap,
  Layers,
  ListChecks,
  MessageSquareWarning,
  Route,
  SearchCheck,
  Target,
  TimerReset,
  UsersRound,
} from 'lucide-react';
import {
  CandidatePipelineMockup,
  ClassProgressMockup,
  DepartmentMockup,
  DriveBoardMockup,
  StudentHomeMockup,
} from '../components/mockups/Mockups';
import { loginPath } from '../../routes';
import type { CapabilityId } from './capabilities';
import { SITE_PAGES, type SolutionRoleId } from '../siteMap';

/**
 * Content for each audience's solution page. Every page renders from the same
 * template (pages/SolutionRolePage.tsx), so a role can move to its own domain or
 * campaign page later by reusing its entry here.
 */

export interface RoleSolution {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  lede: string;
  cta: { label: string; to: string; note?: string };
  /** Wording for the closing call to action band. */
  closing: { title: string; lede: string };
  pains: { icon: LucideIcon; title: string; body: string }[];
  capabilities: { intro: string; ids: CapabilityId[]; summaries?: Partial<Record<CapabilityId, string>>; note?: string };
  preview: ReactNode;
  workflow: { title: string; body: string }[];
  benefits: { title: string; body: string }[];
  access: string;
  faqs: { question: string; answer: string }[];
  related: { to: string; label: string; description: string }[];
}

/** Where each role's demo request starts; the contact form preselects the matching role. */
const demo = (role: string) => `${SITE_PAGES.contact.path}?role=${encodeURIComponent(role)}`;

export const ROLE_SOLUTIONS: Record<SolutionRoleId, RoleSolution> = {
  institutions: {
    icon: Building2,
    eyebrow: 'For institutions',
    title: 'See placement activity across every department, in one place.',
    lede: 'Principals, directors and placement leadership get a consolidated view of drives, applications and outcomes, department by department, and of how prepared the next batch is.',
    cta: { label: 'Book an Institutional Demo', to: demo('institutions') },
    closing: {
      title: 'Book an institutional demo',
      lede: 'We will walk your leadership team through the current build using your departments, batches and placement calendar.',
    },
    pains: [
      {
        icon: FileSpreadsheet,
        title: 'Figures rebuilt for every request',
        body: 'Each management review or accreditation request means collecting department spreadsheets and reconciling them again.',
      },
      {
        icon: EyeOff,
        title: 'Departments are hard to compare',
        body: 'Each department tracks placements its own way, so it is difficult to see where support is needed before results are final.',
      },
      {
        icon: AlarmClock,
        title: 'Readiness shows up too late',
        body: 'Gaps in student preparation usually surface after the first rejections, when there is little time left to act.',
      },
    ],
    capabilities: {
      intro: 'What institutional leadership works with.',
      ids: ['analytics', 'academicStructure', 'multiCampus', 'careerReadiness', 'rolesPermissions', 'auditLog'],
      summaries: {
        analytics: 'Placement activity and outcomes by department; exports for annual reports and accreditation are planned.',
        academicStructure: 'Departments, courses and academic years set up once, so every report uses the same structure.',
        multiCampus: 'Run several campuses or colleges under one institution, each with its own records.',
        careerReadiness: 'How prepared each batch is, from profile, resume and interview practice evidence.',
        rolesPermissions: 'Decide who in each department can see and change what.',
      },
    },
    preview: <DepartmentMockup />,
    workflow: [
      { title: 'Set up the institution', body: 'Add departments, courses and academic years, and assign roles to your staff.' },
      { title: 'Bring departments on board', body: 'Each department works in the same system, with records that stay with its students.' },
      { title: 'Follow the season', body: 'Track drives, applications and offers across departments while the season runs.' },
      { title: 'Review and plan', body: 'Use the department view to plan training and drive mix for the next batch.' },
    ],
    benefits: [
      { title: 'One version of the numbers', body: 'Department figures come from the same records, so leadership and departments discuss the same data.' },
      { title: 'Earlier, targeted support', body: 'Readiness by batch shows where training is needed while there is still time to deliver it.' },
      { title: 'Less reporting overhead', body: 'Placement reports start from records already in the system rather than from collected spreadsheets.' },
    ],
    access:
      "Each institution's data is kept to that institution. Your administrators decide which staff can see department, student and placement information. An audit log of administrator changes is in development.",
    faqs: [
      {
        question: 'Can several departments or campuses use one account?',
        answer: 'Yes. Departments work within one institution. Support for several campuses under one institution is in development.',
      },
      {
        question: 'Do we need to replace our existing ERP?',
        answer: 'No. Alphagrew is designed to work alongside the systems you use for admissions or fees, and to focus on preparation and placement.',
      },
      {
        question: 'Can we export reports for accreditation?',
        answer: 'Placement summaries are in development and exports are planned. Tell us which formats you need when you book a demo.',
      },
    ],
    related: [
      { to: SITE_PAGES.placementManagement.path, label: 'Placement Management', description: 'Drives, applications and reports.' },
      { to: SITE_PAGES.careerIntelligence.path, label: 'Career Intelligence', description: 'Readiness for each student and batch.' },
      { to: SITE_PAGES.howItWorks.path, label: 'How it works', description: 'From institution setup to reporting.' },
    ],
  },

  'placement-officers': {
    icon: ClipboardList,
    eyebrow: 'For placement officers',
    title: 'Run every drive from the first email to the final offer list.',
    lede: 'Companies, job postings, eligibility, shortlists, schedules and applications in one workspace, so the placement cell spends the season with companies and students, not spreadsheets.',
    cta: { label: 'Simplify Your Placement Process', to: demo('placement-officers') },
    closing: {
      title: 'Simplify your placement process',
      lede: 'Bring a recent drive and its eligibility mail. We will show you how it would run on Alphagrew.',
    },
    pains: [
      {
        icon: ListChecks,
        title: 'Eligibility lists built by hand',
        body: 'Every company has different cut-offs, and each change means filtering spreadsheets again.',
      },
      {
        icon: MessageSquareWarning,
        title: 'Notices get lost',
        body: 'Drive details go out through several groups, and students who should apply sometimes never see them.',
      },
      {
        icon: TimerReset,
        title: 'Status chasing between rounds',
        body: 'Tracking who applied, who cleared which round and who already holds an offer takes hours each week.',
      },
    ],
    capabilities: {
      intro: 'The drive workflow, step by step.',
      ids: ['placementDrives', 'eligibilityEngine', 'placementPolicy', 'roundsOffers', 'announcements', 'notifications', 'analytics'],
      summaries: {
        placementDrives: 'Company records, job postings and drives, with student applications in one list.',
        eligibilityEngine: 'Set branch, batch, aggregate and backlog criteria once and get the eligible list from student records.',
        placementPolicy: 'Record your one-offer and dream-offer rules in one place. Automatic checks when students apply are still to come.',
        roundsOffers: 'Shortlists, round schedules, interview slots, results and offers for each drive.',
        announcements: 'Send drive notices to the departments and batches they apply to.',
        notifications: 'Alert eligible students about new drives, deadlines and results.',
        analytics: 'Drive-by-drive and department placement reports.',
      },
      note: 'What you see depends on the product modules configured for your institution. Modules marked In development or Planned are not yet complete.',
    },
    preview: <DriveBoardMockup />,
    workflow: [
      { title: 'Add the company and role', body: 'Record the company, the job posting, the package and the drive dates.' },
      { title: 'Set eligibility', body: "Enter the company's criteria and review the list of eligible students." },
      { title: 'Publish and collect applications', body: 'Notify eligible students and track who applies before the deadline.' },
      { title: 'Run the rounds', body: 'Schedule rounds, publish shortlists and results, and record offers.' },
      { title: 'Report', body: 'Close the drive and see it in department and season placement reports.' },
    ],
    benefits: [
      { title: 'Fewer manual lists', body: 'Eligible students come from the records the institution already maintains.' },
      { title: 'Students hear about the right drives', body: 'Notices go to the students each drive applies to, with the deadline attached.' },
      { title: 'Policies applied consistently', body: 'Offer rules are checked the same way for every student, with fewer exceptions to argue about.' },
    ],
    access:
      'Placement officers see the student information their role allows. Companies only receive what the institution chooses to share for a specific drive.',
    faqs: [
      {
        question: 'Are eligibility checks automatic?',
        answer: 'Yes. Each job\'s rules are checked against student records, so the eligible list is built rather than typed, and students see which rule they missed.',
      },
      {
        question: 'Can we keep using our own offer policy?',
        answer: 'Yes. Each institution sets its own rules, such as one-offer and dream-offer limits, and they are checked automatically when a student applies.',
      },
    ],
    related: [
      { to: SITE_PAGES.placementManagement.path, label: 'Placement Management', description: 'The full drive lifecycle and an example rule.' },
      { to: SITE_PAGES.aiInterviewer.path, label: 'AI Interviewer', description: 'Practice for students before a big drive.' },
      { to: SITE_PAGES.platform.path, label: 'Platform and features', description: 'Every module and its build status.' },
    ],
  },

  faculty: {
    icon: UsersRound,
    eyebrow: 'For faculty and trainers',
    title: 'Help the students who need it, before the drive rather than after it.',
    lede: 'Mentors, heads of department and trainers can support preparation, assessments, progress reviews and targeted help, within the access their institution grants them.',
    cta: { label: 'Explore Faculty Workflows', to: demo('faculty') },
    closing: {
      title: 'Explore faculty workflows',
      lede: 'See how faculty roles and permissions work in the current build, and what is planned for mentors and trainers.',
    },
    pains: [
      {
        icon: FileQuestion,
        title: 'No clear view of who is prepared',
        body: 'Faculty often find out who struggled with interviews only when results come back.',
      },
      {
        icon: Layers,
        title: 'Preparation sits outside academic work',
        body: 'Marks and attendance live in one place and placement preparation in another, so the full picture is hard to see.',
      },
      {
        icon: Target,
        title: 'Generic sessions for varied needs',
        body: 'Without knowing which skills a class lacks, training sessions end up covering everything for everyone.',
      },
    ],
    capabilities: {
      intro: 'How faculty can take part, depending on their role.',
      ids: ['academicRecords', 'facultyInsights', 'assessments', 'mentorNotes', 'announcements'],
      summaries: {
        academicRecords: 'Enter and review marks for your classes, in the system placement eligibility will read from.',
        facultyInsights: "See your own classes' interview practice and resume progress.",
        assessments: 'Set aptitude and technical tests and review the results.',
        mentorNotes: 'Record guidance for a student and follow up on agreed actions.',
        announcements: 'Post notices to the departments and batches you are responsible for.',
      },
      note: 'Faculty access is set by each institution. Faculty views of student preparation are planned, not yet available.',
    },
    preview: <ClassProgressMockup />,
    workflow: [
      { title: 'Get access from your institution', body: 'Your administrator invites you and sets what your role can see.' },
      { title: 'Keep academic records current', body: 'Marks you enter become part of the student record used later in placement.' },
      { title: 'Review preparation', body: 'Check which students in your classes have practised and where they struggle.' },
      { title: 'Act on it', body: 'Plan sessions around common gaps and follow up with the students who need it.' },
    ],
    benefits: [
      { title: 'Time spent where it matters', body: 'Sessions can focus on the skills a class is missing, not a general syllabus.' },
      { title: 'One record for each student', body: 'Academic and preparation information about a student sits in one place.' },
      { title: 'Support before results', body: 'Students who need help can be reached before drives, not after rejections.' },
    ],
    access:
      'Faculty see only the classes and students their role covers. Interview practice scores are for preparation and are not shared with recruiters.',
    faqs: [
      {
        question: 'Will faculty see every student in the institution?',
        answer: 'No. Each institution sets faculty access, normally limited to the classes or students a faculty member is responsible for.',
      },
      {
        question: 'Is there a faculty dashboard today?',
        answer: 'Faculty roles and marks entry are part of the current work. A faculty view of student preparation is planned and not yet available.',
      },
    ],
    related: [
      { to: SITE_PAGES.careerIntelligence.path, label: 'Career Intelligence', description: 'Readiness and skill-gap insights.' },
      { to: SITE_PAGES.aiInterviewer.path, label: 'AI Interviewer', description: 'What students practise and the feedback they get.' },
      { to: SITE_PAGES.howItWorks.path, label: 'How it works', description: 'Where faculty fit in the season.' },
    ],
  },

  students: {
    icon: GraduationCap,
    eyebrow: 'For students',
    title: 'Prepare for placements with a profile, practice and a clear next step.',
    lede: 'Build your profile and resume, practise mock interviews for the roles you want, see the opportunities you qualify for and follow every application yourself.',
    cta: { label: 'Prepare for Your Next Opportunity', to: loginPath('register'), note: 'Access is provided through your institution, which approves your registration.' },
    closing: {
      title: 'Prepare for your next opportunity',
      lede: 'Register with your institution, or sign in if you already have an account.',
    },
    pains: [
      {
        icon: Compass,
        title: 'Not sure what to work on',
        body: 'It is hard to know whether your resume or interview answers are strong enough until a company decides.',
      },
      {
        icon: SearchCheck,
        title: 'Missing the right drives',
        body: 'Notices arrive in many places, and checking whether you qualify for each one takes time.',
      },
      {
        icon: Route,
        title: 'Losing track after applying',
        body: 'Once you apply, round dates and results are scattered across messages.',
      },
    ],
    capabilities: {
      intro: 'What you can do.',
      ids: ['careerProfile', 'resumeUpload', 'resumeAnalysis', 'aiInterviewText', 'interviewFeedback', 'assessments', 'eligibilityEngine', 'placementDrives', 'careerReadiness'],
      summaries: {
        careerProfile: 'Add your projects, skills, certifications and experience in one profile.',
        resumeUpload: 'Upload your resume as PDF or Word.',
        resumeAnalysis: 'Get suggestions on how to make your resume clearer and stronger.',
        aiInterviewText: 'Practise interviews for the roles you want, as often as your institution allows.',
        interviewFeedback: 'See scores with reasons, and how a stronger answer would be structured.',
        assessments: 'Take aptitude and technical tests set by your institution.',
        eligibilityEngine: 'See which drives you qualify for, and which rule you do not meet yet.',
        placementDrives: 'Apply to drives and follow each application.',
        careerReadiness: 'See how prepared you are and what would help most.',
      },
    },
    preview: <StudentHomeMockup />,
    workflow: [
      { title: 'Register', body: 'Sign up with your institution. Your placement cell approves your account.' },
      { title: 'Build your profile', body: 'Add your projects, skills and experience, and upload your resume.' },
      { title: 'Practise', body: 'Take mock interviews for your target roles and work on the feedback.' },
      { title: 'Apply and follow up', body: 'Apply to drives you qualify for and follow each round.' },
    ],
    benefits: [
      { title: 'Practice whenever you need it', body: 'Mock interviews are there between classes or late at night, not only when a trainer is free.' },
      { title: 'Feedback you can act on', body: 'Every score comes with a reason and a suggestion for next time.' },
      { title: 'Everything in one list', body: 'Your profile, practice and applications sit in one place you control.' },
    ],
    access:
      'You can see your own scores and feedback. Mock interview scores are for practice and are not shared with recruiters. Your institution decides which profile details are shared for a drive.',
    faqs: [
      {
        question: 'How do I get access?',
        answer: 'Register through your institution, or ask your placement cell for an invitation. Your institution approves each registration.',
      },
      {
        question: 'Do mock interviews affect my placement?',
        answer: 'No. They are for practice. Eligibility comes from the criteria set by the company and your institution.',
      },
      {
        question: 'Can I use it on my phone?',
        answer: 'Yes. Alphagrew is a web application that works in a mobile browser.',
      },
    ],
    related: [
      { to: SITE_PAGES.aiInterviewer.path, label: 'AI Interviewer', description: 'How mock interviews and feedback work.' },
      { to: SITE_PAGES.careerIntelligence.path, label: 'Career Intelligence', description: 'Resume feedback and readiness.' },
      { to: SITE_PAGES.faq.path, label: 'FAQs', description: 'Access, privacy and AI questions.' },
    ],
  },

  recruiters: {
    icon: Briefcase,
    eyebrow: 'For recruiters',
    title: 'Campus hiring that starts from verified records.',
    lede: 'The intended workflow: share your criteria with the placement cell, receive eligible candidates, view the profile sections students have authorised, coordinate the drive and follow candidates through each stage.',
    cta: { label: 'Discuss Campus Hiring', to: demo('recruiters') },
    closing: {
      title: 'Discuss campus hiring',
      lede: 'Tell us the roles you hire for and the campuses you visit. We will explain how recruiter access is being designed.',
    },
    pains: [
      {
        icon: FileSpreadsheet,
        title: 'Every campus sends a different sheet',
        body: 'Candidate lists arrive in different formats, and checking them against your criteria takes time.',
      },
      {
        icon: CalendarRange,
        title: 'Coordinating rounds by email',
        body: 'Slots, venues and results move between your team and the placement cell in long threads.',
      },
      {
        icon: BarChart3,
        title: 'Little visibility between stages',
        body: 'It is hard to see how many candidates are at each stage across campuses.',
      },
    ],
    capabilities: {
      intro: 'The recruiter portal is planned. Today, recruiters work with the placement cell, which already runs eligibility checks, rounds and offers on Alphagrew.',
      ids: ['eligibilityEngine', 'candidateSharing', 'roundsOffers', 'recruiterPortal'],
      summaries: {
        eligibilityEngine: 'The placement cell enters your criteria, and they are checked against academic records the institution maintains.',
        candidateSharing: 'See only the profile sections a student has made visible, for the drive they applied to.',
        roundsOffers: 'The placement cell schedules your rounds and records results and offers, so every candidate\'s stage is up to date.',
        recruiterPortal: 'Follow candidate stages for each campus drive in your own view.',
      },
      note: 'Recruiter sign-in is not available yet. Alphagrew does not make hiring decisions or rank candidates for recruiters.',
    },
    preview: <CandidatePipelineMockup />,
    workflow: [
      { title: 'Share your criteria', body: 'Send the role, package and eligibility criteria to the placement cell.' },
      { title: 'Receive eligible candidates', body: "The institution's records decide who meets the criteria." },
      { title: 'Review authorised profiles', body: 'See the profile sections each student has chosen to share for the drive.' },
      { title: 'Run the drive and track stages', body: 'Coordinate rounds with the placement cell and follow candidates to offer.' },
    ],
    benefits: [
      { title: 'Consistent candidate information', body: 'Profiles follow one structure across campuses that use Alphagrew.' },
      { title: 'Criteria checked against records', body: "Eligibility is based on the institution's academic records rather than self-reported details." },
      { title: 'Fewer coordination threads', body: 'Schedules and results are shared in one place with the placement cell.' },
    ],
    access:
      'As designed, recruiters will see only candidates who applied to their drive, and only the profile sections those students chose to share. Contact details will stay hidden until a candidate is shortlisted, and each recruiter view of a profile will be logged.',
    faqs: [
      {
        question: 'Can recruiters sign in today?',
        answer: 'Not yet. The recruiter portal is planned. Today, recruiters work with each placement cell directly.',
      },
      {
        question: 'Does Alphagrew screen or rank candidates?',
        answer: 'No. Eligibility comes from your criteria and the institution\'s records. Mock interview scores are not shared with recruiters, and hiring decisions are yours.',
      },
    ],
    related: [
      { to: SITE_PAGES.placementManagement.path, label: 'Placement Management', description: 'How placement cells run drives.' },
      { to: SITE_PAGES.platform.path, label: 'Platform and features', description: 'What is built and what is planned.' },
      { to: SITE_PAGES.contact.path, label: 'Contact', description: 'Talk to us about campus hiring.' },
    ],
  },
};
