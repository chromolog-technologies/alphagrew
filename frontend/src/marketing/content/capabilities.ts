// Build status of each capability the marketing site mentions. This is the single
// place to change when a feature ships, so no page claims more than the product does.
//
// Source: documentation/audit/02-gap-analysis.md (code snapshot, 22 October 2026),
// checked against the current routes in backend/routes/api.php.
//   available = built and working end to end in the current build (audit status ✅)
//   building  = partly built in the repository, not yet complete end to end
//   planned   = specified in the PRD, not built yet
// "Available" describes the code, not a commercial launch; the product owner decides
// what is sold at launch. Mockups are a separate, fourth category: illustrative.

export type CapabilityStatus = 'available' | 'building' | 'planned';

export interface Capability {
  name: string;
  status: CapabilityStatus;
  summary: string;
}

export const CAPABILITIES = {
  // Foundations
  rolesPermissions: {
    name: 'Roles and permissions',
    status: 'available',
    summary: 'Institution admin, placement officer, faculty and student each see only what their role needs.',
  },
  tenantIsolation: {
    name: 'Institution data isolation',
    status: 'building',
    summary: "Every record belongs to one institution, and each request is designed to reach only that institution's data.",
  },
  onboarding: {
    name: 'Staff invitations and student registration',
    status: 'available',
    summary: 'Invite staff by email, let students register, and approve or reject each registration.',
  },
  academicStructure: {
    name: 'Departments, courses and academic years',
    status: 'available',
    summary: 'The academic structure that student records, batches and eligibility rules hang from.',
  },
  academicRecords: {
    name: 'Attendance, exams and marks',
    status: 'building',
    summary: 'Marks entry, review and result publishing, with attendance and batch management being completed.',
  },
  multiCampus: {
    name: 'Multiple campuses',
    status: 'building',
    summary: 'Campuses and batches under one institution, with records kept to the right campus.',
  },
  bulkImport: {
    name: 'Bulk import',
    status: 'planned',
    summary: 'Bring in students and staff from spreadsheets, with an error report for rows that need fixing.',
  },

  // Student profiles and resumes
  careerProfile: {
    name: 'Student career profile',
    status: 'available',
    summary: 'Projects, certifications, experience, skills and education in one profile the student keeps current.',
  },
  resumeUpload: {
    name: 'Resume upload',
    status: 'available',
    summary: 'PDF and Word resumes stored privately, with clear messages when a file cannot be read.',
  },
  resumeParsing: {
    name: 'Resume parsing',
    status: 'building',
    summary: 'Skills, projects, experience and education read from an uploaded resume. A screen to review and correct what was read is not built yet.',
  },
  resumeAnalysis: {
    name: 'Resume analysis',
    status: 'building',
    summary: 'AI feedback on resume quality and structure, with comparison against a job description planned.',
  },
  documentVerification: {
    name: 'Document verification',
    status: 'planned',
    summary: 'Students upload mark sheets and certificates; staff verify them once.',
  },

  // Opportunities and eligibility
  placementDrives: {
    name: 'Companies, drives and applications',
    status: 'available',
    summary: 'Company, drive and job records with roles, packages and deadlines, and an application pipeline from applied to placed, with every status change recorded.',
  },
  placementPolicy: {
    name: 'Placement policies',
    status: 'available',
    summary: 'One-offer and dream-offer limits, offer deadlines, application caps, a minimum profile, opt-outs and debarment, checked automatically every time a student applies.',
  },
  departmentEligibility: {
    name: 'Department-limited drives',
    status: 'available',
    summary: 'A drive can be limited to chosen departments, and the limit is checked when a student applies.',
  },
  eligibilityEngine: {
    name: 'Job eligibility checks',
    status: 'available',
    summary: 'CGPA, backlog, attendance, department, batch, school-score, skill and profile rules evaluated against live student records, with the reason for every pass or fail.',
  },
  jobMatching: {
    name: 'Job matching',
    status: 'planned',
    summary: 'A match score and a personal feed of the roles that fit each student best.',
  },

  // Placement operations
  roundsOffers: {
    name: 'Rounds, shortlists and offers',
    status: 'available',
    summary: 'Aptitude, technical and HR rounds with schedules, shortlists, results per round, offers with deadlines and placement records.',
  },

  // Assessments and interview preparation
  aiInterviewText: {
    name: 'AI mock interviews (text)',
    status: 'available',
    summary: 'Typed mock interviews that ask role-specific questions and follow up on weak answers.',
  },
  interviewSetup: {
    name: 'Interview set-up',
    status: 'available',
    summary: 'Students pick a target role or a campus job, an interview type, experience level, starting difficulty and time limit.',
  },
  difficultySteps: {
    name: 'Difficulty between questions',
    status: 'available',
    summary: 'A fixed rule moves the next question one level easier after a weak answer, or one level harder after two strong ones.',
  },
  interviewFeedback: {
    name: 'Interview feedback reports',
    status: 'building',
    summary: 'Rubric scores with reasons and suggestions after each interview; staff review is planned.',
  },
  aiInterviewVoice: {
    name: 'AI mock interviews (voice)',
    status: 'building',
    summary: 'Server-side speech transcription exists but is not yet available in the interview screen. There is no video interview.',
  },
  assessments: {
    name: 'Assessments',
    status: 'planned',
    summary: 'Aptitude and technical tests from a question bank, with results that feed shortlists.',
  },

  // Career readiness insights
  careerReadiness: {
    name: 'Readiness score',
    status: 'building',
    summary: 'A coaching indicator per student built from resume, academic and interview evidence. Not a prediction of placement.',
  },
  skillGap: {
    name: 'Skill-gap view',
    status: 'building',
    summary: "Each competency for a target role compared with the student's interview, assessment and resume evidence.",
  },
  recommendations: {
    name: 'Suggested practice steps',
    status: 'building',
    summary: 'Practice suggestions generated from interview results and skill gaps, which students can mark as done.',
  },
  batchInsights: {
    name: 'Batch skill-gap insights',
    status: 'planned',
    summary: 'Which skills most of a batch is missing, so training can be planned before the season.',
  },

  facultyInsights: {
    name: 'Faculty view of student preparation',
    status: 'planned',
    summary: "Faculty see their own classes' interview practice and resume progress, as their role allows.",
  },
  mentorNotes: {
    name: 'Mentor notes and follow-ups',
    status: 'planned',
    summary: 'Faculty record guidance for a student and follow up on agreed actions.',
  },

  // Notifications and reporting
  announcements: {
    name: 'Announcements',
    status: 'available',
    summary: 'Notices to a department, batch or the whole institution.',
  },
  notifications: {
    name: 'Notifications',
    status: 'available',
    summary: 'In-app and email alerts for new jobs, rounds, application updates and offers, with per-person preferences. SMS is planned.',
  },
  analytics: {
    name: 'Placement reports',
    status: 'building',
    summary: 'Placement summaries by department today; exports for annual reports and accreditation planned.',
  },
  auditLog: {
    name: 'Audit log',
    status: 'available',
    summary: 'An append-only record of who changed what, which administrators can search and filter.',
  },

  // Recruiters
  candidateSharing: {
    name: 'Shared candidate profiles',
    status: 'planned',
    summary: 'The placement cell shares the profile sections a student has made visible, for a specific drive.',
  },
  recruiterPortal: {
    name: 'Recruiter portal',
    status: 'planned',
    summary: 'Recruiters post roles and review shared candidates directly.',
  },
} satisfies Record<string, Capability>;

export type CapabilityId = keyof typeof CAPABILITIES;

export const STATUS_LABEL: Record<CapabilityStatus, string> = {
  available: 'In current build',
  building: 'In development',
  planned: 'Planned',
};

export const STATUS_DESCRIPTION: Record<CapabilityStatus, string> = {
  available: 'Built and working end to end in the current product build.',
  building: 'Partly built and being completed.',
  planned: 'Specified in the product plan, not built yet.',
};
