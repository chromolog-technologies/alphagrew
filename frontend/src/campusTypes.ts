export type CampusRole =
  | 'super_admin'
  | 'institution_admin'
  | 'placement_officer'
  | 'staff'
  | 'student'
  | 'recruiter';

/** Super Admin or Institution Admin. */
export function isAdminRole(role: CampusRole | undefined): boolean {
  return role === 'super_admin' || role === 'institution_admin';
}

/** Institution employees: staff and placement officers use the staff portal. */
export function isInstitutionStaffRole(role: CampusRole | undefined): boolean {
  return role === 'staff' || role === 'placement_officer';
}

/** Maps role names saved by older versions ('admin') to the current ones. */
export function normalizeCampusRole(role: string): CampusRole {
  return role === 'admin' ? 'institution_admin' : (role as CampusRole);
}

export type CampusPermission =
  | 'dashboard.view'
  | 'students.view'
  | 'students.create'
  | 'departments.view'
  | 'departments.create'
  | 'marks.view'
  | 'marks.create'
  | 'marks.approve'
  | 'marks.publish'
  | 'placement.view'
  | 'placement.create'
  | 'placement.apply'
  | 'announcements.view'
  | 'announcements.create'
  | 'reports.view'
  | 'profile.view'
  | 'demo.reset'
  | 'attendance.view';

export type StaffDesignationPreset = 'hod' | 'department_coordinator' | 'hr' | 'exam_coordinator' | 'efc';

const campusAdminPermissions: CampusPermission[] = [
  'dashboard.view',
  'students.view',
  'students.create',
  'departments.view',
  'departments.create',
  'marks.view',
  'marks.create',
  'marks.approve',
  'marks.publish',
  'placement.view',
  'placement.create',
  'placement.apply',
  'announcements.view',
  'announcements.create',
  'reports.view',
  'profile.view',
  'demo.reset',
  'attendance.view',
];

export const campusRolePermissions: Record<CampusRole, CampusPermission[]> = {
  super_admin: campusAdminPermissions,
  institution_admin: campusAdminPermissions,
  placement_officer: [
    'dashboard.view',
    'students.view',
    'departments.view',
    'placement.view',
    'placement.create',
    'announcements.view',
    'announcements.create',
    'reports.view',
    'profile.view',
  ],
  recruiter: ['dashboard.view', 'profile.view'],
  staff: [
    'dashboard.view',
    'marks.view',
    'marks.create',
    'students.view',
    'students.create',
    'placement.view',
    'placement.create',
    'announcements.view',
    'announcements.create',
    'reports.view',
    'profile.view',
    'attendance.view',
  ],
  student: ['dashboard.view', 'marks.view', 'placement.view', 'placement.apply', 'announcements.view', 'profile.view', 'attendance.view'],
};

export const campusPermissionLabels: Record<CampusPermission, string> = {
  'dashboard.view': 'Dashboard',
  'students.view': 'Students',
  'students.create': 'Manage students',
  'departments.view': 'Departments',
  'departments.create': 'Manage departments',
  'marks.view': 'Marks',
  'marks.create': 'Manage marks',
  'marks.approve': 'Approve marks',
  'marks.publish': 'Publish results',
  'placement.view': 'Placement',
  'placement.create': 'Manage placement',
  'placement.apply': 'Apply to drives',
  'announcements.view': 'Announcements',
  'announcements.create': 'Manage announcements',
  'reports.view': 'Reports',
  'profile.view': 'Profile',
  'demo.reset': 'Reset demo',
  'attendance.view': 'Attendance',
};    

export const campusStaffAssignablePermissions: CampusPermission[] = [
  'students.view',
  'students.create',
  'departments.view',
  'departments.create',
  'marks.view',
  'marks.create',
  'marks.approve',
  'placement.view',
  'placement.create',
  'announcements.view',
  'announcements.create',
  'reports.view',
];

export const campusStaffBasePermissions: CampusPermission[] = ['dashboard.view', 'profile.view'];

export const campusStaffDesignationPresets: Array<{
  id: StaffDesignationPreset;
  label: string;
  description: string;
  permissions: CampusPermission[];
}> = [
  {
    id: 'hod',
    label: 'Head of Department',
    description: 'Department leadership with full access to students, faculty, courses, and departmental administration.',
    permissions: ['students.view', 'students.create', 'departments.view', 'departments.create', 'placement.view', 'placement.create', 'announcements.view', 'announcements.create', 'reports.view'],
  },
  {
    id: 'department_coordinator',
    label: 'Department Coordinator',
    description: 'Students, placement, announcements, and reports for a department-facing staff member.',
    permissions: ['students.view', 'students.create', 'placement.view', 'placement.create', 'announcements.view', 'announcements.create', 'reports.view'],
  },
  {
    id: 'hr',
    label: 'HR',
    description: 'Placement-heavy access for interview planning, company updates, and student tracking.',
    permissions: ['students.view', 'placement.view', 'placement.create', 'announcements.view', 'announcements.create', 'reports.view'],
  },
  {
    id: 'exam_coordinator',
    label: 'Exam Coordinator',
    description: 'Academic coordination with department visibility, student records, and announcements.',
    permissions: ['students.view', 'departments.view', 'announcements.view', 'announcements.create', 'reports.view'],
  },
  {
    id: 'efc',
    label: 'EFC',
    description: 'Fee and compliance follow-up through student records, departments, and reports.',
    permissions: ['students.view', 'departments.view', 'reports.view', 'announcements.view'],
  },
];

export function normalizeStaffPermissions(permissions: CampusPermission[]) {
  const impliedPermissions: CampusPermission[] = [];

  if (permissions.includes('students.create')) {
    impliedPermissions.push('students.view');
  }
  if (permissions.includes('departments.create')) {
    impliedPermissions.push('departments.view');
  }
  if (permissions.includes('placement.create')) {
    impliedPermissions.push('placement.view');
  }
  if (permissions.includes('announcements.create')) {
    impliedPermissions.push('announcements.view');
  }

  return Array.from(new Set([...campusStaffBasePermissions, ...permissions, ...impliedPermissions]))
    .filter((permission) => campusAdminPermissions.includes(permission))
    .sort() as CampusPermission[];
}

export interface CampusDesignation {
  id: number;
  name: string;
  slug: string;
  description: string;
  permissions: CampusPermission[];
  staffCount: number;
  departmentCode?: string;
}

export const campusDefaultDesignations: CampusDesignation[] = campusStaffDesignationPresets.map((preset, index) => ({
  id: index + 1,
  name: preset.label,
  slug: preset.id,
  description: preset.description,
  permissions: normalizeStaffPermissions(preset.permissions),
  staffCount: 0,
}));

export type CampusMasterCategory =
  | 'student_gender'
  | 'student_year'
  | 'student_status'
  | 'payment_status'
  | 'company_drive_status'
  | 'company_drive_type'
  | 'announcement_audience'
  | 'announcement_priority';

export interface CampusMasterOption {
  id: number;
  category: CampusMasterCategory;
  code: string;
  label: string;
  description: string;
  sortOrder: number;
}

export const campusMasterCategoryLabels: Record<CampusMasterCategory, string> = {
  student_gender: 'Student genders',
  student_year: 'Academic years',
  student_status: 'Student statuses',
  payment_status: 'Payment statuses',
  company_drive_status: 'Company drive statuses',
  company_drive_type: 'Company drive types',
  announcement_audience: 'Announcement audiences',
  announcement_priority: 'Announcement priorities',
};

const campusMasterDefaultsByCategory: Record<
  CampusMasterCategory,
  Array<{ code: string; label: string; description: string }>
> = {
  student_gender: [
    { code: 'male', label: 'Male', description: 'Male student record.' },
    { code: 'female', label: 'Female', description: 'Female student record.' },
    { code: 'non_binary', label: 'Non-binary', description: 'Non-binary student record.' },
    { code: 'prefer_not_to_say', label: 'Prefer not to say', description: 'Gender intentionally omitted.' },
  ],
  student_year: [
    { code: 'year_1', label: '1st Year', description: 'First-year academic record.' },
    { code: 'year_2', label: '2nd Year', description: 'Second-year academic record.' },
    { code: 'year_3', label: '3rd Year', description: 'Third-year academic record.' },
    { code: 'year_4', label: '4th Year', description: 'Final-year academic record.' },
  ],
  student_status: [
    { code: 'active', label: 'Active', description: 'Student is active in the campus system.' },
    { code: 'placement_ready', label: 'Placement Ready', description: 'Student is ready for placement drives.' },
    { code: 'placed', label: 'Placed', description: 'Student has received an offer.' },
  ],
  payment_status: [
    { code: 'paid', label: 'Paid', description: 'Fees are fully settled.' },
    { code: 'pending', label: 'Pending', description: 'Fees still need follow-up.' },
  ],
  company_drive_status: [
    { code: 'upcoming', label: 'Upcoming', description: 'Drive is scheduled for a future date.' },
    { code: 'open', label: 'Open', description: 'Drive is open for applications.' },
    { code: 'closing_soon', label: 'Closing Soon', description: 'Drive closes shortly.' },
    { code: 'closed', label: 'Closed', description: 'Drive is closed.' },
  ],
  company_drive_type: [
    { code: 'placement', label: 'Placement', description: 'Full placement drive.' },
    { code: 'internship', label: 'Internship', description: 'Internship hiring drive.' },
  ],
  announcement_audience: [
    { code: 'all', label: 'All', description: 'Visible to everyone.' },
    { code: 'students', label: 'Students', description: 'Visible to students.' },
    { code: 'staff', label: 'Staff', description: 'Visible to staff.' },
    { code: 'admin', label: 'Admin', description: 'Visible to admins.' },
  ],
  announcement_priority: [
    { code: 'high', label: 'High', description: 'Urgent announcement.' },
    { code: 'medium', label: 'Medium', description: 'Standard announcement.' },
    { code: 'low', label: 'Low', description: 'Low-priority announcement.' },
  ],
};

export const campusDefaultMasters: CampusMasterOption[] = (Object.entries(campusMasterDefaultsByCategory) as Array<
  [CampusMasterCategory, Array<{ code: string; label: string; description: string }>]
>).flatMap(([category, options]) =>
  options.map((option, index) => ({
    id: Number(`${(Object.keys(campusMasterDefaultsByCategory).indexOf(category) + 1) * 100}${index + 1}`),
    category,
    code: option.code,
    label: option.label,
    description: option.description,
    sortOrder: index + 1,
  })),
);

export function normalizeCampusMasterValue(
  category: CampusMasterCategory,
  value: string | null | undefined,
  masters: CampusMasterOption[] = campusDefaultMasters,
) {
  if (!value) {
    return '';
  }

  const match = masters.find(
    (master) =>
      master.category === category &&
      (master.code === value || master.label.trim().toLowerCase() === value.trim().toLowerCase()),
  );

  return match?.code ?? value;
}

export function getCampusMasterLabel(
  category: CampusMasterCategory,
  value: string | null | undefined,
  masters: CampusMasterOption[] = campusDefaultMasters,
) {
  if (!value) {
    return '';
  }

  const match = masters.find(
    (master) =>
      master.category === category &&
      (master.code === value || master.label.trim().toLowerCase() === value.trim().toLowerCase()),
  );

  return match?.label ?? value;
}

export type StudentStatus = string;
export type AnnouncementAudience = string;
export type AnnouncementPriority = string;
export type CompanyStatus = string;
export type CompanyType = string;
export type FeeStatus = string;
export type CampusResumeTemplate = 'classic_ats' | 'modern_ats' | 'compact_ats';

export interface CampusStudentResume {
  template: CampusResumeTemplate;
  headline: string;
  summary: string;
  targetRole: string;
  location: string;
  links: string[];
  certifications: string[];
  achievements: string[];
  projects: string[];
  experience: string[];
  uploadedResumeText: string;
  uploadedResumeFileName: string;
  lastUpdated: string | null;
}

export interface CampusAccount {
  id: number;
  name: string;
  email: string;
  password?: string;
  role: CampusRole;
  /** Null for Super Admin and Recruiter, who sit outside any institution. */
  institutionId?: number | null;
  title: string;
  departmentCode?: string;
  designationId?: number;
  designationName?: string;
  phone?: string;
  imageUrl?: string;
  communicationAddress?: string;
  permanentAddress?: string;
  emergencyContactPerson?: string;
  emergencyContactNumber?: string;
  biometricId?: string;
  experienceYears?: number;
  specialization?: string;
  studentId?: number;
  permissions?: CampusPermission[];
}

export type CampusSession = Omit<CampusAccount, 'password'> & {
  permissions: CampusPermission[];
};

export interface CampusDepartment {
  id: number;
  name: string;
  code: string;
  hod: string;
  staffCount: number;
  intake: number;
  accent: string;
  description?: string;
}

export interface CampusStudent {
  id: number;
  name: string;
  email: string;
  registrationNumber: string;
  departmentCode: string;
  year: string;
  gender: string;
  status: StudentStatus;
  cgpa: number;
  attendance: number;
  phone: string;
  mentor: string;
  feeStatus: FeeStatus;
  placedCompany?: string;
  appliedCompanyIds: number[];
  skills: string[];
  resume?: CampusStudentResume | null;
}

export interface CampusCompany {
  id: number;
  name: string;
  role: string;
  packageOffered: string;
  driveDate: string;
  status: CompanyStatus;
  location: string;
  type: CompanyType;
  applicants: number;
  shortlisted: number;
  eligibleDepartments: string[];
}

export interface CampusAnnouncement {
  id: number;
  title: string;
  summary: string;
  audience: AnnouncementAudience;
  priority: AnnouncementPriority;
  postedBy: string;
  date: string;
  category: string;
}

export interface CampusData {
  users: CampusAccount[];
  departments: CampusDepartment[];
  designations: CampusDesignation[];
  masters: CampusMasterOption[];
  students: CampusStudent[];
  companies: CampusCompany[];
  announcements: CampusAnnouncement[];
}

export function createDefaultCampusStudentResume(
  student?: Partial<Pick<CampusStudent, 'departmentCode' | 'skills' | 'phone' | 'year' | 'cgpa' | 'name' | 'email'>>,
): CampusStudentResume {
  const skillHighlights = (student?.skills ?? []).slice(0, 4);

  return {
    template: 'classic_ats',
    headline: student?.departmentCode
      ? `${student.departmentCode} student building an ATS-friendly placement resume`
      : 'Student placement resume',
    summary:
      skillHighlights.length > 0
        ? `Career-focused student with hands-on exposure to ${skillHighlights.join(', ')} and a strong interest in internships and full-time roles.`
        : 'Career-focused student building a placement-ready resume for internships and campus drives.',
    targetRole: '',
    location: '',
    links: [],
    certifications: [],
    achievements: [],
    projects: [],
    experience: [],
    uploadedResumeText: '',
    uploadedResumeFileName: '',
    lastUpdated: null,
  };
}

export function normalizeCampusStudentResume(
  resume: Partial<CampusStudentResume> | null | undefined,
  student?: Partial<Pick<CampusStudent, 'departmentCode' | 'skills' | 'phone' | 'year' | 'cgpa' | 'name' | 'email'>>,
): CampusStudentResume {
  const fallback = createDefaultCampusStudentResume(student);

  return {
    template: resume?.template ?? fallback.template,
    headline: resume?.headline ?? fallback.headline,
    summary: resume?.summary ?? fallback.summary,
    targetRole: resume?.targetRole ?? fallback.targetRole,
    location: resume?.location ?? fallback.location,
    links: Array.isArray(resume?.links) ? resume.links.filter(Boolean) : fallback.links,
    certifications: Array.isArray(resume?.certifications) ? resume.certifications.filter(Boolean) : fallback.certifications,
    achievements: Array.isArray(resume?.achievements) ? resume.achievements.filter(Boolean) : fallback.achievements,
    projects: Array.isArray(resume?.projects) ? resume.projects.filter(Boolean) : fallback.projects,
    experience: Array.isArray(resume?.experience) ? resume.experience.filter(Boolean) : fallback.experience,
    uploadedResumeText: resume?.uploadedResumeText ?? fallback.uploadedResumeText,
    uploadedResumeFileName: resume?.uploadedResumeFileName ?? fallback.uploadedResumeFileName,
    lastUpdated: resume?.lastUpdated ?? fallback.lastUpdated,
  };
}
