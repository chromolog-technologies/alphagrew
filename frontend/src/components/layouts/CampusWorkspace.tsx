import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Bell,
  BookOpenCheck,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Calendar,
  ChartColumn,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  Filter,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Megaphone,
  Plus,
  Pencil,
  RotateCcw,
  Search,
  ShieldCheck,
  Settings,
  Sparkles,
  TrendingUp,
  Trash2,
  UserCircle2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { CoursesModule } from '../admin/CoursesModule';
import { DepartmentsModule } from '../admin/DepartmentsModule';
import { SubjectsModule } from '../admin/SubjectsModule';
import { AcademicYearModule } from '../admin/AcademicYearModule';
import { TimetableModule } from '../admin/TimetableModule';
import { ClassesModule } from '../admin/ClassesModule';
import { RolesPermissionsModule } from '../admin/RolesPermissionsModule';
import { ExamsModule } from '../admin/ExamsModule';
import { isCampusApiConfigured } from '../../api/campusApi';
import { MarksWorkflowModule, StudentResultsView } from '../marks';
import { FeesModule } from '../admin/FeesModule';
import { SystemSettingsModule } from '../admin/SystemSettingsModule';
import { DepartmentOverview } from '../staff/DepartmentOverview';
import { HODStaffManagement } from '../staff/HODStaffManagement';
import { HODReportsAnalytics } from '../staff/HODReportsAnalytics';
import { PlacementOfficerModule } from '../staff/PlacementOfficerModule';
import { ExamCoordinatorModule } from '../staff/ExamCoordinatorModule';
import { AttendanceMarking } from '../staff/AttendanceMarking';
import { StudentTimetableView } from '../student/StudentTimetableView';
import { StudentAssignmentsMaterials } from '../student/StudentAssignmentsMaterials';
import { StudentAttendanceView } from '../student/StudentAttendanceView';
import { StudentNotifications } from '../student/StudentNotifications';
import { apiCall } from '../../api/apiClient';
import { campusBrand } from '../../campusDemoData';
import { TenantState } from '../shared';
import {
  campusMasterCategoryLabels,
  campusPermissionLabels,
  campusPortalLabels,
  campusRoleLabels,
  campusStaffAssignablePermissions,
  campusStaffBasePermissions,
  createDefaultCampusStudentResume,
  getCampusMasterLabel,
  isAdminRole,
  isInstitutionStaffRole,
  normalizeCampusStudentResume,
  normalizeStaffPermissions,
} from '../../campusTypes';
import type {
  AnnouncementAudience,
  AnnouncementPriority,
  CampusData,
  CampusDesignation,
  CampusMasterCategory,
  CampusMasterOption,
  CampusPermission,
  CampusResumeTemplate,
  CampusRole,
  CampusSession,
  CampusStudentResume,
  TenantError,
  CompanyStatus,
  CompanyType,
  FeeStatus,
  StudentStatus,
} from '../../campusTypes';

interface CampusWorkspaceProps {
  error: string;
  /** 403 or 404 from the last API call; replaces the tab content until dismissed. */
  tenantError?: TenantError | null;
  onDismissTenantError?: () => void;
  user: CampusSession;
  data: CampusData;
  onLogout: () => Promise<void> | void;
  onResetDemo: () => Promise<void> | void;
  onCreateStudent: (payload: {
    name: string;
    email: string;
    departmentCode?: string;
    year: string;
    gender: string;
    status: string;
    cgpa: number;
    attendance: number;
    phone?: string;
    feeStatus: FeeStatus;
    password?: string;
    skills: string[];
  }) => Promise<void> | void;
  onUpdateStudent: (
    studentId: number,
    payload: {
      name: string;
      email: string;
      departmentCode?: string;
      year: string;
      gender: string;
      status: string;
      cgpa: number;
      attendance: number;
      phone?: string;
      feeStatus: FeeStatus;
      password?: string;
      skills: string[];
    },
  ) => Promise<void> | void;
  onDeleteStudent: (studentId: number) => Promise<void> | void;
  onCreateDepartment: (payload: {
    name: string;
    code: string;
    description: string;
    hod: string;
    staffCount: number;
    intake: number;
  }) => Promise<void> | void;
  onUpdateDepartment: (
    departmentId: number,
    payload: {
      name: string;
      code: string;
      description: string;
      hod: string;
      staffCount: number;
      intake: number;
    },
  ) => Promise<void> | void;
  onDeleteDepartment: (departmentId: number) => Promise<void> | void;
  onCreateCompany: (payload: {
    name: string;
    role: string;
    packageOffered: string;
    driveDate: string;
    status: CompanyStatus;
    location: string;
    type: CompanyType;
    eligibleDepartments: string[];
  }) => Promise<void> | void;
  onUpdateCompany: (
    companyId: number,
    payload: {
      name: string;
      role: string;
      packageOffered: string;
      driveDate: string;
      status: CompanyStatus;
      location: string;
      type: CompanyType;
      eligibleDepartments: string[];
    },
  ) => Promise<void> | void;
  onDeleteCompany: (companyId: number) => Promise<void> | void;
  onCreateAnnouncement: (payload: {
    title: string;
    summary: string;
    audience: AnnouncementAudience;
    priority: AnnouncementPriority;
    category: string;
  }) => Promise<void> | void;
  onUpdateAnnouncement: (
    announcementId: number,
    payload: {
      title: string;
      summary: string;
      audience: AnnouncementAudience;
      priority: AnnouncementPriority;
      category: string;
    },
  ) => Promise<void> | void;
  onDeleteAnnouncement: (announcementId: number) => Promise<void> | void;
  onUpdateProfile: (payload: { name: string; email: string; title: string; password?: string }) => Promise<void> | void;
  onUpdateStudentResume: (payload: CampusStudentResume) => Promise<void> | void;
  onCreateMaster: (payload: {
    category: CampusMasterCategory;
    label: string;
    description?: string;
    sortOrder: number;
  }) => Promise<void> | void;
  onUpdateMaster: (
    masterId: number,
    payload: {
      category: CampusMasterCategory;
      label: string;
      description?: string;
      sortOrder: number;
    },
  ) => Promise<void> | void;
  onDeleteMaster: (masterId: number) => Promise<void> | void;
  onCreateDesignation: (payload: {
    name: string;
    departmentCode?: string;
    description?: string;
    permissions: CampusPermission[];
  }) => Promise<void> | void;
  onUpdateDesignation: (
    designationId: number,
    payload: {
      name: string;
      departmentCode?: string;
      description?: string;
      permissions: CampusPermission[];
    },
  ) => Promise<void> | void;
  onDeleteDesignation: (designationId: number) => Promise<void> | void;
  onCreateStaff: (payload: {
    name: string;
    email: string;
    designationId: number;
    departmentCode: string;
    phone?: string;
    communicationAddress?: string;
    permanentAddress?: string;
    emergencyContactPerson?: string;
    emergencyContactNumber?: string;
    biometricId?: string;
    experienceYears?: number;
    specialization?: string;
    imageFile?: File;
    password?: string;
    permissions: CampusPermission[];
  }) => Promise<void> | void;
  onUpdateStaff: (
    staffId: number,
    payload: {
      name: string;
      email: string;
      designationId: number;
      departmentCode: string;
      phone?: string;
      communicationAddress?: string;
      permanentAddress?: string;
      emergencyContactPerson?: string;
      emergencyContactNumber?: string;
      biometricId?: string;
      experienceYears?: number;
      specialization?: string;
      imageFile?: File;
      password?: string;
      permissions: CampusPermission[];
    },
  ) => Promise<void> | void;
  onDeleteStaff: (staffId: number) => Promise<void> | void;
  onApplyToCompany: (companyId: number) => Promise<void> | void;
}

type StudentDraft = {
  name: string;
  email: string;
  departmentCode: string;
  year: string;
  gender: string;
  status: string;
  cgpa: string;
  attendance: string;
  phone: string;
  feeStatus: FeeStatus;
  password: string;
  skills: string;
};

type DepartmentDraft = {
  name: string;
  code: string;
  hod: string;
  description: string;
  staffCount: string;
  intake: string;
};

type CompanyDraft = {
  name: string;
  role: string;
  packageOffered: string;
  driveDate: string;
  status: CompanyStatus;
  location: string;
  type: CompanyType;
  eligibleDepartments: string;
};

type AnnouncementDraft = {
  title: string;
  summary: string;
  audience: AnnouncementAudience;
  priority: AnnouncementPriority;
  category: string;
};

type StaffDraft = {
  designationId: string;
  name: string;
  email: string;
  phone?: string;
  imageUrl?: string;
  imageFile?: File | null;
  communicationAddress?: string;
  permanentAddress?: string;
  emergencyContactPerson?: string;
  emergencyContactNumber?: string;
  departmentCode: string;
  biometricId?: string;
  experience?: string;
  specialization?: string;
  password: string;
  permissions: CampusPermission[];
};

type DesignationDraft = {
  name: string;
  departmentCode: string;
  description: string;
  permissions: CampusPermission[];
};

type MasterDraft = {
  category: CampusMasterCategory;
  label: string;
  description: string;
  sortOrder: string;
};

type ProfileDraft = {
  name: string;
  email: string;
  title: string;
  password: string;
};

type DeleteIntent =
  | {
      type: 'student';
      id: number;
      title: string;
      description: string;
    }
  | {
      type: 'department';
      id: number;
      title: string;
      description: string;
    }
  | {
      type: 'master';
      id: number;
      title: string;
      description: string;
    }
  | {
      type: 'designation';
      id: number;
      title: string;
      description: string;
    }
  | {
      type: 'company';
      id: number;
      title: string;
      description: string;
    }
  | {
      type: 'announcement';
      id: number;
      title: string;
      description: string;
    }
  | {
      type: 'staff';
      id: number;
      title: string;
      description: string;
    };

type NavItem = {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission: CampusPermission;
};

type SidebarNavGroup = {
  id: string;
  label: string;
  itemIds: string[];
};

type CardTone = 'navy' | 'sky' | 'teal' | 'amber' | 'indigo' | 'emerald';

// Header role chip colours from documentation/frontend/roles-tenancy-design.md (D5).
const roleChipTone: Record<CampusRole, string> = {
  super_admin: 'bg-[#0a2342] text-white',
  institution_admin: 'bg-[#e6f1fb] text-[#0b4d88]',
  placement_officer: 'bg-[#fff4e5] text-[#8a4b00]',
  staff: 'bg-[#eef4fa] text-[#123a66]',
  student: 'bg-[#ecfdf3] text-[#05603a]',
  recruiter: 'bg-[#eef4fa] text-[#123a66]',
};

// Same page sizes as GET /students (per_page up to 100).
const STUDENTS_PER_PAGE_OPTIONS = [25, 50, 100];

const baseNavByRole: Record<'admin' | 'staff' | 'student', NavItem[]> = {
  admin: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
    { id: 'activity', label: 'Activity', icon: Bell, permission: 'announcements.view' },
    { id: 'masters', label: 'Masters', icon: BookOpenCheck, permission: 'departments.create' },
    { id: 'departments', label: 'Departments', icon: Building2, permission: 'departments.view' },
    { id: 'courses', label: 'Courses', icon: BookOpen, permission: 'departments.create' },
    { id: 'designations', label: 'Designations', icon: ShieldCheck, permission: 'departments.create' },
    { id: 'staff', label: 'Staff', icon: UserCircle2, permission: 'departments.view' },
    { id: 'students', label: 'Students', icon: Users, permission: 'students.view' },
    { id: 'classes', label: 'Classes', icon: Users, permission: 'departments.create' },
    { id: 'subjects', label: 'Subjects', icon: BookOpen, permission: 'departments.create' },
    { id: 'academic_years', label: 'Academic Years', icon: Calendar, permission: 'departments.create' },
    { id: 'roles', label: 'Roles & Permissions', icon: ShieldCheck, permission: 'departments.create' },
    { id: 'attendance', label: 'Attendance', icon: Clock, permission: 'attendance.view' },
    { id: 'timetable', label: 'Timetable', icon: Calendar, permission: 'departments.create' },
    { id: 'exams', label: 'Exams', icon: ClipboardList, permission: 'departments.create' },
    { id: 'marks', label: 'Marks', icon: ChartColumn, permission: 'marks.view' },
    { id: 'fees', label: 'Fees', icon: BriefcaseBusiness, permission: 'departments.create' },
    { id: 'placement', label: 'Placement', icon: BriefcaseBusiness, permission: 'placement.view' },
    { id: 'announcements', label: 'Announcements', icon: Megaphone, permission: 'announcements.view' },
    { id: 'reports', label: 'Reports', icon: ChartColumn, permission: 'reports.view' },
    { id: 'settings', label: 'Settings', icon: Settings, permission: 'departments.create' },
    { id: 'profile', label: 'Profile', icon: UserCircle2, permission: 'profile.view' },
  ],
  staff: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
    { id: 'activity', label: 'Activity', icon: Bell, permission: 'announcements.view' },
    { id: 'students', label: 'Students', icon: Users, permission: 'students.view' },
    { id: 'departments', label: 'Departments', icon: Building2, permission: 'departments.view' },
    { id: 'attendance', label: 'Attendance', icon: Clock, permission: 'attendance.view' },
    { id: 'exams', label: 'Exams', icon: ClipboardList, permission: 'departments.create' },
    { id: 'marks', label: 'Marks', icon: ChartColumn, permission: 'marks.view' },
    { id: 'placement', label: 'Placement', icon: BriefcaseBusiness, permission: 'placement.view' },
    { id: 'announcements', label: 'Announcements', icon: Megaphone, permission: 'announcements.view' },
    { id: 'reports', label: 'Reports', icon: ChartColumn, permission: 'reports.view' },
    { id: 'profile', label: 'Profile', icon: UserCircle2, permission: 'profile.view' },
  ],
  student: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
    { id: 'activity', label: 'Activity', icon: Bell, permission: 'announcements.view' },
    { id: 'attendance', label: 'Attendance', icon: Clock, permission: 'attendance.view' },
    { id: 'exams', label: 'Exams', icon: ClipboardList, permission: 'departments.create' },
    { id: 'marks', label: 'Marks', icon: ChartColumn, permission: 'marks.view' },
    { id: 'placement', label: 'Placement', icon: BriefcaseBusiness, permission: 'placement.view' },
    { id: 'announcements', label: 'Announcements', icon: Megaphone, permission: 'announcements.view' },
    { id: 'profile', label: 'Profile', icon: UserCircle2, permission: 'profile.view' },
  ],
};

const navByRole: Record<CampusRole, NavItem[]> = {
  super_admin: baseNavByRole.admin,
  institution_admin: baseNavByRole.admin,
  placement_officer: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
    { id: 'activity', label: 'Activity', icon: Bell, permission: 'announcements.view' },
    { id: 'students', label: 'Students', icon: Users, permission: 'students.view' },
    { id: 'placement', label: 'Placement', icon: BriefcaseBusiness, permission: 'placement.view' },
    { id: 'announcements', label: 'Announcements', icon: Megaphone, permission: 'announcements.view' },
    { id: 'reports', label: 'Reports', icon: ChartColumn, permission: 'reports.view' },
    { id: 'profile', label: 'Profile', icon: UserCircle2, permission: 'profile.view' },
  ],
  staff: baseNavByRole.staff,
  student: baseNavByRole.student,
  // Recruiters cannot sign in yet; the recruiter portal is a later phase.
  recruiter: [],
};

const sidebarNavGroups: SidebarNavGroup[] = [
  { id: 'overview', label: 'Overview', itemIds: ['dashboard', 'activity'] },
  { id: 'master_data', label: 'Master Data', itemIds: ['masters', 'departments', 'courses', 'designations', 'academic_years'] },
  { id: 'users_roles', label: 'Users & Roles', itemIds: ['staff', 'students', 'roles'] },
  { id: 'academic', label: 'Academic', itemIds: ['classes', 'subjects', 'attendance', 'exams', 'marks', 'fees', 'timetable'] },
  { id: 'finance', label: 'Finance', itemIds: [] },
  { id: 'placement', label: 'Placement', itemIds: ['placement'] },
  { id: 'other', label: 'Other', itemIds: ['announcements', 'reports', 'settings', 'profile'] },
];

const monthTrend = [
  { month: 'Jan', offers: 8, drives: 2 },
  { month: 'Feb', offers: 14, drives: 3 },
  { month: 'Mar', offers: 18, drives: 3 },
  { month: 'Apr', offers: 22, drives: 4 },
  { month: 'May', offers: 27, drives: 5 },
  { month: 'Jun', offers: 31, drives: 5 },
];

const cardToneStyles: Record<
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

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

function formatDate(dateValue: string) {
  return new Date(dateValue).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const calendarWeekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function audienceMatches(role: CampusRole, audience: AnnouncementAudience) {
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

function statusTone(status: StudentStatus | CompanyStatus | AnnouncementPriority | FeeStatus) {
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

const resumeTemplateOptions: Array<{
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

function resumeListToText(items: string[]) {
  return items.join('\n');
}

function resumeTextToList(value: string) {
  return value
    .split('\n')
    .map((item) => item.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean);
}

function uniqueResumeKeywords(keywords: string[]) {
  return Array.from(
    new Set(
      keywords
        .map((keyword) => keyword.trim().toLowerCase())
        .filter((keyword) => keyword.length > 2),
    ),
  );
}

function buildResumeBenchmarkKeywords(student: CampusData['students'][number], companies: CampusData['companies']) {
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

function buildGeneratedResumeText(student: CampusData['students'][number], resume: CampusStudentResume) {
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

function masterYearLabel(year: string) {
  return ({
    year_1: '1st Year',
    year_2: '2nd Year',
    year_3: '3rd Year',
    year_4: '4th Year',
  } as Record<string, string>)[year] ?? year;
}

function analyzeResumeText(
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

function Panel({ children, className }: { children: ReactNode; className?: string; key?: string | number }) {
  return (
    <section
      className={classNames(
        'rounded-[18px] border border-[#e2eaf3] bg-white shadow-[0_22px_45px_-34px_rgba(15,23,42,0.18)]',
        className,
      )}
    >
      {children}
    </section>
  );
}

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">{title}</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-950">{description}</h2>
      </div>
      {action}
    </div>
  );
}

function Sparkline({ points, color = '#2563eb' }: { points: number[]; color?: string }) {
  if (points.length === 0) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min === 0 ? 1 : max - min;
  const width = 50;
  const height = 16;
  const padding = 1;
  const svgPoints = points.map((p, i) => {
    const x = padding + (i / (points.length - 1)) * (width - padding * 2);
    const y = height - padding - ((p - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });
  const pathD = `M ${svgPoints.join(' L ')}`;
  
  return (
    <svg width={width} height={height} className="flex-shrink-0 opacity-85">
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = 'navy',
  sparklineData = [12, 16, 14, 20, 18, 22, 21, 25]
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: typeof Users;
  tone?: CardTone;
  sparklineData?: number[];
}) {
  const toneStyles = cardToneStyles[tone];
  
  const colors: Record<CardTone, string> = {
    navy: '#2563eb',
    sky: '#0ea5e9',
    teal: '#0d766e',
    amber: '#d97706',
    indigo: '#4f46e5',
    emerald: '#059669'
  };
  const strokeColor = colors[tone] || '#2563eb';

  return (
    <section className="rounded-lg p-3 bg-white border border-slate-200 shadow-sm flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xl font-bold text-slate-900 leading-none tracking-tight">{value}</p>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">{label}</p>
        <p className="mt-0.5 text-[9px] text-emerald-600 font-bold flex items-center gap-1">
          {helper}
        </p>
      </div>
      <div className="flex-shrink-0 flex items-center justify-center">
        <Sparkline points={sparklineData} color={strokeColor} />
      </div>
    </section>
  );
}

function DashboardHighlightCard({
  label,
  value,
  detail,
  meta,
  icon: Icon,
  tone = 'navy',
}: {
  label: string;
  value: string | number;
  detail: string;
  meta: string;
  icon: typeof Users;
  tone?: CardTone;
}) {
  const toneStyles = cardToneStyles[tone];

  return (
    <section className={classNames('rounded-xl p-4 bg-white border border-slate-200/80 shadow-sm', toneStyles.highlight)}>
      <div className="flex items-start justify-between gap-3">
        <div className={classNames('flex h-8 w-8 items-center justify-center rounded-lg', toneStyles.icon)}>
          <Icon size={16} />
        </div>
        <span className={classNames('rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider', toneStyles.helper)}>
          {meta}
        </span>
      </div>
      <p className="mt-3.5 text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-900 leading-none">{value}</p>
      <p className="mt-2 text-xs text-slate-500 leading-relaxed">{detail}</p>
    </section>
  );
}

function AdminSnapshotCard({
  label,
  value,
  note,
  icon: Icon,
  tone = 'navy',
  sparklineData = [12, 16, 14, 20, 18, 22, 21, 25]
}: {
  label: string;
  value: string | number;
  note: string;
  icon: typeof Users;
  className?: string;
  tone?: CardTone;
  sparklineData?: number[];
}) {
  const toneStyles = cardToneStyles[tone];
  
  const colors: Record<CardTone, string> = {
    navy: '#2563eb',
    sky: '#0ea5e9',
    teal: '#0d766e',
    amber: '#d97706',
    indigo: '#4f46e5',
    emerald: '#059669'
  };
  const strokeColor = colors[tone] || '#2563eb';

  return (
    <section className="rounded-lg p-3 bg-white border border-slate-200 shadow-sm flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xl font-bold text-slate-900 leading-none tracking-tight">{value}</p>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">{label}</p>
        <p className="mt-0.5 text-[9px] text-emerald-600 font-bold">{note}</p>
      </div>
      <div className="flex-shrink-0 flex items-center justify-center">
        <Sparkline points={sparklineData} color={strokeColor} />
      </div>
    </section>
  );
}

function Modal({
  open,
  title,
  description,
  onClose,
  children,
  compact = false,
}: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
  compact?: boolean;
}) {
  if (!open) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          className={`my-4 w-full rounded-[18px] bg-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.55)] ${
            compact ? 'max-w-md p-6' : 'max-w-2xl p-7'
          }`}
        >
          <div className={`flex items-start justify-between gap-4 ${compact ? 'mb-5' : 'mb-6'}`}>
            <div>
              <h3 className={`${compact ? 'text-xl' : 'text-2xl'} font-bold text-slate-950`}>{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function CampusWorkspace({
  error,
  tenantError = null,
  onDismissTenantError,
  user,
  data,
  onLogout,
  onResetDemo,
  onCreateStudent,
  onUpdateStudent,
  onDeleteStudent,
  onCreateDepartment,
  onUpdateDepartment,
  onDeleteDepartment,
  onCreateCompany,
  onUpdateCompany,
  onDeleteCompany,
  onCreateAnnouncement,
  onUpdateAnnouncement,
  onDeleteAnnouncement,
  onUpdateProfile,
  onUpdateStudentResume,
  onCreateMaster,
  onUpdateMaster,
  onDeleteMaster,
  onCreateDesignation,
  onUpdateDesignation,
  onDeleteDesignation,
  onCreateStaff,
  onUpdateStaff,
  onDeleteStaff,
  onApplyToCompany,
}: CampusWorkspaceProps) {
  const defaultDepartmentCode = user.departmentCode ?? data.departments[0]?.code ?? 'CSE';
  const defaultDesignation = data.designations[0] ?? null;
  const masterOptions = (category: CampusMasterCategory) =>
    data.masters
      .filter((master) => master.category === category)
      .sort((left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label));
  const defaultMasterCode = (category: CampusMasterCategory, fallback = '') => masterOptions(category)[0]?.code ?? fallback;
  const masterLabel = (category: CampusMasterCategory, value: string | null | undefined) =>
    getCampusMasterLabel(category, value, data.masters);

  const departmentHodLabel = (hod: unknown) => {
    if (typeof hod === 'string') {
      return hod;
    }

    if (hod && typeof hod === 'object' && 'name' in hod && typeof (hod as Record<string, unknown>).name === 'string') {
      return (hod as { name: string }).name;
    }

    return '';
  };

  const can = (permission: CampusPermission) => user.permissions.includes(permission);
  const availableNav = navByRole[user.role];
  const linkedStudent = user.studentId ? data.students.find((student) => student.id === user.studentId) ?? null : null;
  const asArray = <T,>(response: unknown): T[] => {
    if (Array.isArray(response)) {
      return response as T[];
    }

    if (
      response &&
      typeof response === 'object' &&
      'data' in response &&
      Array.isArray((response as { data?: unknown }).data)
    ) {
      return (response as { data: T[] }).data;
    }

    return [];
  };

  const createStudentDraft = (): StudentDraft => ({
    name: '',
    email: '',
    departmentCode: defaultDepartmentCode,
    year: defaultMasterCode('student_year', 'year_1'),
    gender: defaultMasterCode('student_gender', 'prefer_not_to_say'),
    status: defaultMasterCode('student_status', 'active'),
    cgpa: '7.5',
    attendance: '90',
    phone: '',
    feeStatus: defaultMasterCode('payment_status', 'paid'),
    password: '',
    skills: '',
  });

  const createDepartmentDraft = (): DepartmentDraft => ({
    name: '',
    code: '',
    hod: '',
    description: '',
    staffCount: '10',
    intake: '120',
  });

  const createCompanyDraft = (): CompanyDraft => ({
    name: '',
    role: '',
    packageOffered: '',
    driveDate: '2026-05-10',
    status: defaultMasterCode('company_drive_status', 'upcoming'),
    location: 'On Campus',
    type: defaultMasterCode('company_drive_type', 'placement'),
    eligibleDepartments: defaultDepartmentCode,
  });

  const createAnnouncementDraft = (): AnnouncementDraft => ({
    title: '',
    summary: '',
    audience: isAdminRole(user.role) ? 'all' : 'students',
    priority: defaultMasterCode('announcement_priority', 'medium'),
    category: 'Campus Update',
  });

  const createMasterDraft = (category: CampusMasterCategory = 'student_gender'): MasterDraft => ({
    category,
    label: '',
    description: '',
    sortOrder: String(masterOptions(category).length + 1),
  });

  const createDesignationDraft = (): DesignationDraft => ({
    name: '',
    departmentCode: defaultDepartmentCode,
    description: '',
    permissions: normalizeStaffPermissions([]),
  });

  const createStaffDraft = (): StaffDraft => ({
    designationId: defaultDesignation ? String(defaultDesignation.id) : '',
    name: '',
    email: '',
    phone: '',
    imageUrl: '',
    imageFile: null,
    communicationAddress: '',
    permanentAddress: '',
    emergencyContactPerson: '',
    emergencyContactNumber: '',
    departmentCode: defaultDepartmentCode,
    biometricId: '',
    experience: '',
    specialization: '',
    password: '',
    permissions: normalizeStaffPermissions(defaultDesignation?.permissions ?? []),
  });

  const createProfileDraft = (): ProfileDraft => ({
    name: user.name,
    email: user.email,
    title: user.title,
    password: '',
  });

  const createResumeDraft = (): CampusStudentResume =>
    normalizeCampusStudentResume(linkedStudent?.resume, linkedStudent ?? undefined);

  const findDesignationById = (designationId?: number | string | null) => {
    if (designationId == null || designationId === '') {
      return null;
    }

    return data.designations.find((designation) => designation.id === Number(designationId)) ?? null;
  };

  const findDesignationByName = (name?: string | null) =>
    data.designations.find((designation) => designation.name.trim().toLowerCase() === String(name ?? '').trim().toLowerCase()) ?? null;
  const findMasterById = (masterId?: number | null) => data.masters.find((master) => master.id === masterId) ?? null;
  const extractAssignablePermissions = (permissions: CampusPermission[]) =>
    normalizeStaffPermissions(permissions).filter((permission) => campusStaffAssignablePermissions.includes(permission));

  const [activeTab, setActiveTab] = useState(availableNav[0]?.id ?? 'dashboard');

  // A 403/404 belongs to the tab it happened on; moving to another tab clears it.
  useEffect(() => {
    onDismissTenantError?.();
  }, [activeTab]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarDropdowns, setSidebarDropdowns] = useState<Record<SidebarNavGroup['id'], boolean>>({
    overview: true,
    master_data: true,
    management: true,
    workspace: true,
  });
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => new Date());
  const [adminAnalyticsTab, setAdminAnalyticsTab] = useState<'placement' | 'pipeline' | 'readiness'>('placement');
  const [isHeaderSearchOpen, setIsHeaderSearchOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [studentPage, setStudentPage] = useState(1);
  const [studentsPerPage, setStudentsPerPage] = useState(STUDENTS_PER_PAGE_OPTIONS[0]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(user.studentId ?? data.students[0]?.id ?? null);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(data.departments[0]?.id ?? null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showMasterModal, setShowMasterModal] = useState(false);
  const [showDesignationModal, setShowDesignationModal] = useState(false);
  const [designationModalTab, setDesignationModalTab] = useState<'details' | 'access'>('details');
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffModalTab, setStaffModalTab] = useState<'basic' | 'academic'>('basic');
  const [staffErrors, setStaffErrors] = useState<Record<string, string>>({});
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [deleteIntent, setDeleteIntent] = useState<DeleteIntent | null>(null);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);
  const [editingStudent, setEditingStudent] = useState<CampusData['students'][number] | null>(null);
  const [editingDepartment, setEditingDepartment] = useState<CampusData['departments'][number] | null>(null);
  const [editingCompany, setEditingCompany] = useState<CampusData['companies'][number] | null>(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState<CampusData['announcements'][number] | null>(null);
  const [editingMaster, setEditingMaster] = useState<CampusMasterOption | null>(null);
  const [editingDesignation, setEditingDesignation] = useState<CampusDesignation | null>(null);
  const [editingStaff, setEditingStaff] = useState<CampusData['users'][number] | null>(null);
  const [studentDraft, setStudentDraft] = useState<StudentDraft>(createStudentDraft);
  const [departmentDraft, setDepartmentDraft] = useState<DepartmentDraft>(createDepartmentDraft);
  const [companyDraft, setCompanyDraft] = useState<CompanyDraft>(createCompanyDraft);
  const [announcementDraft, setAnnouncementDraft] = useState<AnnouncementDraft>(createAnnouncementDraft);
  const [masterDraft, setMasterDraft] = useState<MasterDraft>(createMasterDraft);
  const [designationDraft, setDesignationDraft] = useState<DesignationDraft>(createDesignationDraft);
  const [staffDraft, setStaffDraft] = useState<StaffDraft>(createStaffDraft);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(createProfileDraft);
  const [resumeDraft, setResumeDraft] = useState<CampusStudentResume>(createResumeDraft);
  const [resumeUploadNotice, setResumeUploadNotice] = useState('');
  const [isResumeSaving, setIsResumeSaving] = useState(false);
  const [activeMasterCategory, setActiveMasterCategory] = useState<CampusMasterCategory>('student_gender');
  const [credentialNotice, setCredentialNotice] = useState<{ label: string; email: string; password: string } | null>(null);
  const [phase1CoursesConfigured, setPhase1CoursesConfigured] = useState(false);
  const [phase1StaffDesignationsConfigured, setPhase1StaffDesignationsConfigured] = useState(false);
  const [phase1Notice, setPhase1Notice] = useState('');
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const notificationRef = useRef<HTMLDivElement | null>(null);
  const calendarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!availableNav.some((item) => item.id === activeTab)) {
      setActiveTab(availableNav[0]?.id ?? 'dashboard');
    }
  }, [activeTab, availableNav]);

  useEffect(() => {
    if (!isAdminRole(user.role)) {
      return;
    }

    let isDisposed = false;

    const refreshCoursesCompletion = async () => {
      try {
        const response = await apiCall('/courses', 'GET');
        const hasCourses = asArray(response).length > 0;

        if (!isDisposed) {
          setPhase1CoursesConfigured(hasCourses);
        }
      } catch {
        if (!isDisposed) {
          setPhase1CoursesConfigured(false);
        }
      }
    };

    void refreshCoursesCompletion();

    return () => {
      isDisposed = true;
    };
  }, [user.role]);

  useEffect(() => {
    if (!isAdminRole(user.role) || activeTab !== 'courses') {
      return;
    }

    let isDisposed = false;

    const refreshCoursesCompletion = async () => {
      try {
        const response = await apiCall('/courses', 'GET');
        const hasCourses = asArray(response).length > 0;

        if (!isDisposed) {
          setPhase1CoursesConfigured(hasCourses);
        }
      } catch {
        if (!isDisposed) {
          setPhase1CoursesConfigured(false);
        }
      }
    };

    void refreshCoursesCompletion();

    return () => {
      isDisposed = true;
    };
  }, [activeTab, user.role]);

  useEffect(() => {
    if (!isAdminRole(user.role)) {
      return;
    }

    let isDisposed = false;

    const refreshStaffDesignationCompletion = async () => {
      try {
        const [designationsResponse, staffResponse] = await Promise.all([
          apiCall('/designations', 'GET'),
          apiCall('/staff', 'GET'),
        ]);

        const designations = asArray<{ id?: number }>(designationsResponse);
        const staff = asArray<{ designationId?: number | null; designationName?: string | null }>(staffResponse);

        const hasDesignations = designations.length > 0;
        const hasAssignedStaff = staff.some((staffMember) => Boolean(staffMember?.designationId || staffMember?.designationName));

        if (!isDisposed) {
          setPhase1StaffDesignationsConfigured(hasDesignations && hasAssignedStaff);
        }
      } catch {
        if (!isDisposed) {
          setPhase1StaffDesignationsConfigured(false);
        }
      }
    };

    void refreshStaffDesignationCompletion();

    return () => {
      isDisposed = true;
    };
  }, [user.role]);

  useEffect(() => {
    if (!isAdminRole(user.role) || (activeTab !== 'designations' && activeTab !== 'staff')) {
      return;
    }

    let isDisposed = false;

    const refreshStaffDesignationCompletion = async () => {
      try {
        const [designationsResponse, staffResponse] = await Promise.all([
          apiCall('/designations', 'GET'),
          apiCall('/staff', 'GET'),
        ]);

        const designations = asArray<{ id?: number }>(designationsResponse);
        const staff = asArray<{ designationId?: number | null; designationName?: string | null }>(staffResponse);

        const hasDesignations = designations.length > 0;
        const hasAssignedStaff = staff.some((staffMember) => Boolean(staffMember?.designationId || staffMember?.designationName));

        if (!isDisposed) {
          setPhase1StaffDesignationsConfigured(hasDesignations && hasAssignedStaff);
        }
      } catch {
        if (!isDisposed) {
          setPhase1StaffDesignationsConfigured(false);
        }
      }
    };

    void refreshStaffDesignationCompletion();

    return () => {
      isDisposed = true;
    };
  }, [activeTab, user.role]);

  useEffect(() => {
    const activeGroup = sidebarNavGroups.find((group) => group.itemIds.includes(activeTab));
    if (!activeGroup || sidebarDropdowns[activeGroup.id]) {
      return;
    }

    setSidebarDropdowns((current) => ({
      ...current,
      [activeGroup.id]: true,
    }));
  }, [activeTab, sidebarDropdowns]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const syncSidebarState = (matches: boolean) => {
      setIsSidebarOpen(matches);
    };
    const handleChange = (event: MediaQueryListEvent) => {
      syncSidebarState(event.matches);
    };

    syncSidebarState(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  useEffect(() => {
    if (user.studentId) {
      setSelectedStudentId(user.studentId);
    }
  }, [user.studentId]);

  useEffect(() => {
    setProfileDraft(createProfileDraft());
  }, [user.email, user.name, user.title]);

  useEffect(() => {
    setResumeDraft(createResumeDraft());
  }, [linkedStudent?.id, linkedStudent?.resume?.lastUpdated]);

  useEffect(() => {
    setStaffDraft((current) => {
      if (!data.designations.length) {
        if (!current.designationId && current.permissions.length === 0) {
          return current;
        }

        return {
          ...current,
          designationId: '',
          permissions: [],
        };
      }

      const activeDesignation =
        data.designations.find((designation) => designation.id === Number(current.designationId)) ?? defaultDesignation;
      if (!activeDesignation) {
        return current;
      }

      const nextPermissions = normalizeStaffPermissions(activeDesignation.permissions);
      const samePermissions =
        current.permissions.length === nextPermissions.length &&
        current.permissions.every((permission, index) => permission === nextPermissions[index]);

      if (current.designationId === String(activeDesignation.id) && samePermissions) {
        return current;
      }

      return {
        ...current,
        designationId: String(activeDesignation.id),
        permissions: nextPermissions,
      };
    });
  }, [data.designations, defaultDesignation?.id]);

  const normalizedHeaderSearch = headerSearch.trim().toLowerCase();
  const matchesHeaderSearch = (...values: Array<string | number | null | undefined>) => {
    if (!normalizedHeaderSearch) {
      return true;
    }

    return values.some((value) => String(value ?? '').toLowerCase().includes(normalizedHeaderSearch));
  };

  const departmentLookup = new Map(data.departments.map((department) => [department.code, department]));
  const designationLookup = new Map(data.designations.map((designation) => [designation.id, designation]));
  const currentStudent = linkedStudent;
  const scopeStudents =
    user.role === 'staff' && user.departmentCode
      ? data.students.filter((student) => student.departmentCode === user.departmentCode)
      : data.students;

  const filteredStudents = scopeStudents.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      student.registrationNumber.toLowerCase().includes(studentSearch.toLowerCase());
    const matchesDepartment = departmentFilter === 'all' ? true : student.departmentCode === departmentFilter;
    const matchesHeader = matchesHeaderSearch(
      student.name,
      student.registrationNumber,
      student.email,
      student.departmentCode,
      student.year,
      masterLabel('student_year', student.year),
      student.gender,
      masterLabel('student_gender', student.gender),
      student.status,
      masterLabel('student_status', student.status),
      student.feeStatus,
      masterLabel('payment_status', student.feeStatus),
    );
    return matchesSearch && matchesDepartment && matchesHeader;
  });

  // Pages the filtered list in the browser. Moves to fetchStudentsPage() once GET /students
  // accepts search and department filters and the bootstrap stops sending every student.
  const studentPageCount = Math.max(1, Math.ceil(filteredStudents.length / studentsPerPage));
  const currentStudentPage = Math.min(studentPage, studentPageCount);
  const studentPageStart = (currentStudentPage - 1) * studentsPerPage;
  const pagedStudents = filteredStudents.slice(studentPageStart, studentPageStart + studentsPerPage);

  useEffect(() => {
    setStudentPage(1);
  }, [studentSearch, departmentFilter, studentsPerPage]);

  const staffMembers = data.users.filter((account) => isInstitutionStaffRole(account.role));
  const filteredStaffMembers = staffMembers.filter((account) =>
    matchesHeaderSearch(
      account.name,
      account.email,
      account.designationName ?? account.title,
      account.departmentCode,
      departmentLookup.get(account.departmentCode ?? '')?.name,
    ),
  );
  const filteredDesignations = data.designations.filter((designation) =>
    matchesHeaderSearch(
      designation.name,
      designation.description,
      designation.slug,
      designation.staffCount,
      designation.permissions.join(' '),
    ),
  );

  useEffect(() => {
    if (!filteredStudents.length) {
      setSelectedStudentId(null);
      return;
    }

    const stillVisible = filteredStudents.some((student) => student.id === selectedStudentId);
    if (!stillVisible) {
      setSelectedStudentId(filteredStudents[0].id);
    }
  }, [filteredStudents, selectedStudentId]);

  const selectedStudent =
    (user.role === 'student' ? currentStudent : data.students.find((student) => student.id === selectedStudentId)) ??
    filteredStudents[0] ??
    null;

  useEffect(() => {
    if (!filteredStaffMembers.length) {
      setSelectedStaffId(null);
      return;
    }

    const stillVisible = filteredStaffMembers.some((account) => account.id === selectedStaffId);
    if (!stillVisible) {
      setSelectedStaffId(filteredStaffMembers[0].id);
    }
  }, [filteredStaffMembers, selectedStaffId]);

  const selectedStaff = filteredStaffMembers.find((account) => account.id === selectedStaffId) ?? filteredStaffMembers[0] ?? null;
  const selectedStaffDesignation =
    (selectedStaff?.designationId ? designationLookup.get(selectedStaff.designationId) : undefined) ??
    findDesignationByName(selectedStaff?.designationName ?? selectedStaff?.title) ??
    null;

  const visibleAnnouncements = data.announcements.filter((announcement) =>
    audienceMatches(user.role, announcement.audience),
  );
  const filteredVisibleAnnouncements = visibleAnnouncements.filter((announcement) =>
    matchesHeaderSearch(
      announcement.title,
      announcement.summary,
      announcement.category,
      announcement.audience,
      masterLabel('announcement_audience', announcement.audience),
      announcement.priority,
      masterLabel('announcement_priority', announcement.priority),
      announcement.postedBy,
    ),
  );

  const eligibleCompanies =
    currentStudent == null
      ? []
      : data.companies.filter((company) => company.eligibleDepartments.includes(currentStudent.departmentCode));
  const filteredEligibleCompanies = eligibleCompanies.filter((company) =>
    matchesHeaderSearch(
      company.name,
      company.role,
      company.location,
      company.packageOffered,
      company.type,
      masterLabel('company_drive_type', company.type),
      company.status,
      masterLabel('company_drive_status', company.status),
      company.eligibleDepartments.join(' '),
    ),
  );

  const placedStudents = data.students.filter((student) => student.status === 'placed').length;
  const placementReadyStudents = data.students.filter((student) => student.status === 'placement_ready').length;
  const paidFees = data.students.filter((student) => student.feeStatus === 'paid').length;
  const openDrives = data.companies.filter(
    (company) => company.status === 'open' || company.status === 'closing_soon',
  ).length;
  const scopedAverageAttendance =
    scopeStudents.length === 0
      ? 0
      : Math.round(scopeStudents.reduce((sum, student) => sum + student.attendance, 0) / scopeStudents.length);
  const placementRate =
    data.students.length === 0 ? 0 : Math.round((placedStudents / data.students.length) * 100);

  const departmentStats = data.departments.map((department) => {
    const students = data.students.filter((student) => student.departmentCode === department.code);
    const placed = students.filter((student) => student.status === 'placed').length;
    const ready = students.filter((student) => student.status === 'placement_ready').length;
    return {
      department,
      students: students.length,
      placed,
      ready,
      rate: students.length === 0 ? 0 : Math.round((placed / students.length) * 100),
    };
  });
  const filteredDepartmentStats = departmentStats.filter((item) =>
    matchesHeaderSearch(item.department.name, item.department.code, departmentHodLabel(item.department.hod)),
  );

  const placementPieData = [
    { name: 'Placed', value: placedStudents, color: '#0ea5e9' },
    { name: 'Ready', value: placementReadyStudents, color: '#7dd3fc' },
    { name: 'Active', value: data.students.length - placedStudents - placementReadyStudents, color: '#e2e8f0' },
  ];
  const feeRecoveryRate =
    data.students.length === 0 ? 0 : Math.round((paidFees / data.students.length) * 100);
  const featuredCompanies = [...data.companies]
    .sort((left, right) => {
      const statusRank: Record<CompanyStatus, number> = {
        open: 0,
        closing_soon: 1,
        upcoming: 2,
        closed: 3,
      };
      const statusDelta = statusRank[left.status] - statusRank[right.status];
      if (statusDelta !== 0) {
        return statusDelta;
      }
      return new Date(left.driveDate).getTime() - new Date(right.driveDate).getTime();
    })
    .slice(0, 5);
  const filteredFeaturedCompanies = featuredCompanies.filter((company) =>
    matchesHeaderSearch(
      company.name,
      company.role,
      company.location,
      company.packageOffered,
      company.type,
      masterLabel('company_drive_type', company.type),
      company.status,
      masterLabel('company_drive_status', company.status),
      company.eligibleDepartments.join(' '),
    ),
  );
  const filteredPlacementCompanies = data.companies.filter((company) =>
    matchesHeaderSearch(
      company.name,
      company.role,
      company.location,
      company.packageOffered,
      company.type,
      masterLabel('company_drive_type', company.type),
      company.status,
      masterLabel('company_drive_status', company.status),
      company.eligibleDepartments.join(' '),
    ),
  );
  const liveActivityCompanies = (user.role === 'student' ? eligibleCompanies : data.companies)
    .filter((company) => company.status !== 'closed')
    .filter((company) =>
      matchesHeaderSearch(
        company.name,
        company.role,
        company.location,
        company.packageOffered,
        company.type,
        masterLabel('company_drive_type', company.type),
        company.status,
        masterLabel('company_drive_status', company.status),
        company.eligibleDepartments.join(' '),
      ),
    );
  const activityFeed = visibleAnnouncements.slice(0, 4);
  const activityTimeline = [
    ...filteredVisibleAnnouncements.map((announcement) => ({
      id: `announcement-${announcement.id}`,
      type: 'Announcement' as const,
      title: announcement.title,
      summary: announcement.summary,
      date: announcement.date,
      badge: masterLabel('announcement_priority', announcement.priority),
      badgeClass: statusTone(announcement.priority),
      metaPrimary: `${announcement.postedBy} | ${masterLabel('announcement_audience', announcement.audience)}`,
      metaSecondary: announcement.category,
    })),
    ...liveActivityCompanies.map((company) => ({
      id: `company-${company.id}`,
      type: 'Drive' as const,
      title:
        company.status === 'open'
          ? `${company.name} drive is open`
          : company.status === 'closing_soon'
            ? `${company.name} drive closes soon`
            : `${company.name} drive is scheduled`,
      summary: `${company.role} | ${company.packageOffered} | ${company.location}`,
      date: company.driveDate,
      badge: masterLabel('company_drive_status', company.status),
      badgeClass: statusTone(company.status),
      metaPrimary: `${company.applicants} applicants | ${company.shortlisted} shortlisted`,
      metaSecondary: company.eligibleDepartments.join(', '),
    })),
  ].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
  const highPriorityAnnouncements = filteredVisibleAnnouncements.filter((announcement) => announcement.priority === 'high').length;
  const closingSoonDrives = liveActivityCompanies.filter((company) => company.status === 'closing_soon').length;
  const nextActivityDrives = [...liveActivityCompanies]
    .sort((left, right) => new Date(left.driveDate).getTime() - new Date(right.driveDate).getTime())
    .slice(0, 4);
  const departmentLeaders = [...departmentStats]
    .sort((left, right) => (right.rate - left.rate) || (right.placed - left.placed))
    .slice(0, 4);
  const roleSubtitle: Record<CampusRole, string> = {
    super_admin: 'Platform overview',
    institution_admin: 'Campus overview',
    placement_officer: 'Placement overview',
    staff: 'Department overview',
    student: 'Student overview',
    recruiter: 'Recruiter overview',
  };
  const adminAnalyticsViews = {
    placement: {
      title: 'Placement movement',
      description: 'Offers and drives across the current cycle.',
      data: monthTrend,
      series: [
        { key: 'offers', label: 'Offers', color: '#ef6b4d' },
        { key: 'drives', label: 'Drives', color: '#20b4e0' },
      ],
    },
    pipeline: {
      title: 'Pipeline momentum',
      description: 'Applications and shortlists building month over month.',
      data: monthTrend.map((item, index) => ({
        month: item.month,
        applicants: [18, 24, 29, 35, 44, 52][index],
        shortlisted: [6, 8, 11, 15, 18, 22][index],
      })),
      series: [
        { key: 'applicants', label: 'Applicants', color: '#0ea5e9' },
        { key: 'shortlisted', label: 'Shortlisted', color: '#0f766e' },
      ],
    },
    readiness: {
      title: 'Readiness analytics',
      description: 'Placement readiness and interview conversion signals.',
      data: monthTrend.map((item, index) => ({
        month: item.month,
        readiness: [56, 61, 66, 72, 79, 84][index],
        interviews: [9, 12, 15, 18, 24, 28][index],
      })),
      series: [
        { key: 'readiness', label: 'Readiness', color: '#f59e0b' },
        { key: 'interviews', label: 'Interviews', color: '#072b52' },
      ],
    },
  } as const;
  const activeAdminAnalytics = adminAnalyticsViews[adminAnalyticsTab];
  const headerDateLabel = selectedCalendarDate.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
  const headerDateLongLabel = selectedCalendarDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const headerSearchPlaceholder: Record<string, string> = {
    dashboard: 'Search dashboard notes',
    activity: 'Search live activity',
    students: 'Search students',
    staff: 'Search staff',
    designations: 'Search designations',
    departments: 'Search departments',
    placement: 'Search placement drives',
    announcements: 'Search announcements',
    reports: 'Search reports',
    profile: 'Search profile details',
  };
  const calendarMonthLabel = calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const calendarStartOffset = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay();
  const calendarGrid = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), index - calendarStartOffset + 1);

    return {
      key: date.toISOString(),
      date,
      isCurrentMonth: date.getMonth() === calendarMonth.getMonth(),
      isSelected: isSameDay(date, selectedCalendarDate),
      isToday: isSameDay(date, new Date()),
    };
  });
  const groupedSidebarNav = sidebarNavGroups
    .map((group) => ({
      ...group,
      items: availableNav.filter((item) => group.itemIds.includes(item.id)),
    }))
    .filter((group) => group.items.length > 0);
  const phase1Status = {
    departments: data.departments.length > 0,
    courses: phase1CoursesConfigured,
    staffAndDesignations: phase1StaffDesignationsConfigured,
    students: data.students.length > 0,
  };
  const isPhase1Complete =
    phase1Status.departments &&
    phase1Status.courses &&
    phase1Status.staffAndDesignations &&
    phase1Status.students;
  const phase1LockedTabIds = new Set([
    'classes',
    'subjects',
    'academic_years',
    'attendance',
    'timetable',
    'exams',
    'marks',
    'fees',
    'reports',
    'placement',
  ]);
  const isPhase1LockedTab = (tabId: string) => isAdminRole(user.role) && !isPhase1Complete && phase1LockedTabIds.has(tabId);
  const activeNavLabel = availableNav.find((item) => item.id === activeTab)?.label ?? 'Dashboard';
  const breadcrumbItems = activeTab === 'dashboard' ? ['Dashboard'] : ['Dashboard', activeNavLabel];
  // The institution comes from the session (workflow ticket F2); until the backend sends it,
  // institution users see the demo campus name.
  const institutionName =
    user.institution?.name ?? (user.role === 'super_admin' ? 'All institutions' : campusBrand.campusName);
  const institutionCode = user.institution?.code;
  const institutionInitials = institutionName
    .split(/\s+/)
    .filter((word) => /^[A-Za-z]/.test(word) && !['of', 'and', 'the'].includes(word.toLowerCase()))
    .slice(0, 3)
    .map((word) => word[0].toUpperCase())
    .join('');
  const userInitials =
    user.name
      .split(' ')
      .map((segment) => segment[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'AG';

  const handleNavSelection = (tabId: string) => {
    if (isPhase1LockedTab(tabId)) {
      setPhase1Notice('Complete Phase 1 setup first: Departments, Courses, Staff + Designations, and Students.');
      return;
    }

    setPhase1Notice('');
    setActiveTab(tabId);
    setIsProfileMenuOpen(false);
    setIsNotificationOpen(false);

    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const closeStudentModal = () => {
    setShowStudentModal(false);
    setEditingStudent(null);
    setStudentDraft(createStudentDraft());
  };

  const closeDepartmentModal = () => {
    setShowDepartmentModal(false);
    setEditingDepartment(null);
    setDepartmentDraft(createDepartmentDraft());
  };

  const closeCompanyModal = () => {
    setShowCompanyModal(false);
    setEditingCompany(null);
    setCompanyDraft(createCompanyDraft());
  };

  const closeAnnouncementModal = () => {
    setShowAnnouncementModal(false);
    setEditingAnnouncement(null);
    setAnnouncementDraft(createAnnouncementDraft());
  };

  const closeMasterModal = () => {
    setShowMasterModal(false);
    setEditingMaster(null);
    setMasterDraft(createMasterDraft(activeMasterCategory));
  };

  const closeDesignationModal = () => {
    setShowDesignationModal(false);
    setEditingDesignation(null);
    setDesignationModalTab('details');
    setDesignationDraft(createDesignationDraft());
  };

  const closeStaffModal = () => {
    setShowStaffModal(false);
    setEditingStaff(null);
    setStaffDraft(createStaffDraft());
  };

  const closeProfileModal = () => {
    setShowProfileModal(false);
    setProfileDraft(createProfileDraft());
  };

  const closeDeleteModal = () => {
    if (isDeleteSubmitting) {
      return;
    }

    setDeleteIntent(null);
  };

  const openStudentEditor = (student?: CampusData['students'][number]) => {
    if (student) {
      setEditingStudent(student);
      setStudentDraft({
        name: student.name,
        email: student.email,
        departmentCode: student.departmentCode,
        year: student.year,
        gender: student.gender,
        status: student.status,
        cgpa: String(student.cgpa),
        attendance: String(student.attendance),
        phone: student.phone,
        feeStatus: student.feeStatus,
        password: '',
        skills: student.skills.join(', '),
      });
    } else {
      setEditingStudent(null);
      setStudentDraft(createStudentDraft());
    }

    setShowStudentModal(true);
  };

  const openDepartmentEditor = (department?: CampusData['departments'][number]) => {
    if (department) {
      setEditingDepartment(department);
      setDepartmentDraft({
        name: department.name,
        code: department.code,
        hod: departmentHodLabel(department.hod),
        description: department.description ?? '',
        staffCount: String(department.staffCount),
        intake: String(department.intake),
      });
    } else {
      setEditingDepartment(null);
      setDepartmentDraft(createDepartmentDraft());
    }

    setShowDepartmentModal(true);
  };

  const openCompanyEditor = (company?: CampusData['companies'][number]) => {
    if (company) {
      setEditingCompany(company);
      setCompanyDraft({
        name: company.name,
        role: company.role,
        packageOffered: company.packageOffered,
        driveDate: company.driveDate,
        status: company.status,
        location: company.location,
        type: company.type,
        eligibleDepartments: company.eligibleDepartments.join(', '),
      });
    } else {
      setEditingCompany(null);
      setCompanyDraft(createCompanyDraft());
    }

    setShowCompanyModal(true);
  };

  const openAnnouncementEditor = (announcement?: CampusData['announcements'][number]) => {
    if (announcement) {
      setEditingAnnouncement(announcement);
      setAnnouncementDraft({
        title: announcement.title,
        summary: announcement.summary,
        audience: announcement.audience,
        priority: announcement.priority,
        category: announcement.category,
      });
    } else {
      setEditingAnnouncement(null);
      setAnnouncementDraft(createAnnouncementDraft());
    }

    setShowAnnouncementModal(true);
  };

  const openMasterEditor = (master?: CampusMasterOption, category: CampusMasterCategory = activeMasterCategory) => {
    if (master) {
      setEditingMaster(master);
      setActiveMasterCategory(master.category);
      setMasterDraft({
        category: master.category,
        label: master.label,
        description: master.description ?? '',
        sortOrder: String(master.sortOrder),
      });
    } else {
      setEditingMaster(null);
      setActiveMasterCategory(category);
      setMasterDraft(createMasterDraft(category));
    }

    setShowMasterModal(true);
  };

  const openDesignationEditor = (designation?: CampusDesignation) => {
    if (designation) {
      setEditingDesignation(designation);
      setDesignationDraft({
        name: designation.name,
        departmentCode: designation.departmentCode ?? defaultDepartmentCode,
        description: designation.description ?? '',
        permissions: normalizeStaffPermissions(designation.permissions),
      });
    } else {
      setEditingDesignation(null);
      setDesignationDraft(createDesignationDraft());
    }

    setDesignationModalTab('details');
    setShowDesignationModal(true);
  };

  const openStaffEditor = (staff?: CampusData['users'][number]) => {
    if (staff) {
      const resolvedDesignation =
        (staff.designationId ? designationLookup.get(staff.designationId) : undefined) ??
        findDesignationByName(staff.designationName ?? staff.title) ??
        defaultDesignation;
      setEditingStaff(staff);
      setStaffDraft({
        designationId: resolvedDesignation ? String(resolvedDesignation.id) : '',
        name: staff.name,
        email: staff.email,
        phone: staff.phone || '',
        imageUrl: staff.imageUrl || '',
        imageFile: null,
        communicationAddress: staff.communicationAddress || '',
        permanentAddress: staff.permanentAddress || '',
        emergencyContactPerson: staff.emergencyContactPerson || '',
        emergencyContactNumber: staff.emergencyContactNumber || '',
        departmentCode: staff.departmentCode ?? defaultDepartmentCode,
        biometricId: staff.biometricId || '',
        experience: staff.experienceYears !== undefined && staff.experienceYears !== null ? String(staff.experienceYears) : '',
        specialization: staff.specialization || '',
        password: '',
        permissions: normalizeStaffPermissions(resolvedDesignation?.permissions ?? staff.permissions ?? []),
      });
    } else {
      setEditingStaff(null);
      setStaffDraft(createStaffDraft());
    }

    setStaffModalTab('basic');
    setShowStaffModal(true);
  };

  const openProfileEditor = () => {
    setProfileDraft(createProfileDraft());
    setShowProfileModal(true);
    setIsProfileMenuOpen(false);
  };

  const handleStaffDesignationSelection = (designationId: string) => {
    const designation = findDesignationById(designationId);

    setStaffDraft((current) => ({
      ...current,
      designationId,
      permissions: normalizeStaffPermissions(designation?.permissions ?? []),
    }));
  };

  const handleStaffImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setStaffDraft((current) => ({
        ...current,
        imageFile: file,
        imageUrl: typeof reader.result === 'string' ? reader.result : current.imageUrl,
      }));
    };
    reader.readAsDataURL(file);
  };

  const toggleDesignationPermission = (permission: CampusPermission) => {
    setDesignationDraft((current) => {
      const nextPermissions = current.permissions.includes(permission)
        ? current.permissions.filter((entry) => entry !== permission)
        : [...current.permissions, permission];

      return {
        ...current,
        permissions: normalizeStaffPermissions(nextPermissions),
      };
    });
  };

  const selectedDesignationPermissions = extractAssignablePermissions(designationDraft.permissions);
  const allDesignationPermissionsSelected =
    selectedDesignationPermissions.length > 0 &&
    selectedDesignationPermissions.length === campusStaffAssignablePermissions.length;
  const hasPartialDesignationPermissionsSelected =
    selectedDesignationPermissions.length > 0 && !allDesignationPermissionsSelected;

  const toggleAllDesignationPermissions = () => {
    setDesignationDraft((current) => {
      const currentlySelected = extractAssignablePermissions(current.permissions);
      const allSelected =
        currentlySelected.length > 0 && currentlySelected.length === campusStaffAssignablePermissions.length;

      return {
        ...current,
        permissions: normalizeStaffPermissions(allSelected ? [] : campusStaffAssignablePermissions),
      };
    });
  };

  const submitStudent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      name: studentDraft.name,
      email: studentDraft.email,
      departmentCode: user.role === 'staff' ? user.departmentCode : studentDraft.departmentCode,
      year: studentDraft.year,
      gender: studentDraft.gender,
      status: studentDraft.status,
      cgpa: Number(studentDraft.cgpa),
      attendance: Number(studentDraft.attendance),
      phone: studentDraft.phone || undefined,
      feeStatus: studentDraft.feeStatus,
      password: studentDraft.password.trim() || undefined,
      skills: studentDraft.skills.split(',').map((skill) => skill.trim()).filter(Boolean),
    };

    const action = editingStudent
      ? onUpdateStudent(editingStudent.id, payload)
      : onCreateStudent(payload);

    void Promise.resolve(action)
      .then(() => {
        if (payload.password) {
          setCredentialNotice({
            label: editingStudent ? 'Updated student login' : 'New student login',
            email: payload.email,
            password: payload.password,
          });
        }
        closeStudentModal();
      })
      .catch(() => undefined);
  };

  const submitDepartment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      name: departmentDraft.name,
      code: departmentDraft.code.trim().toUpperCase(),
      hod: departmentDraft.hod,
      description: departmentDraft.description,
      staffCount: Number(departmentDraft.staffCount),
      intake: Number(departmentDraft.intake),
    };

    const action = editingDepartment
      ? onUpdateDepartment(editingDepartment.id, payload)
      : onCreateDepartment(payload);

    void Promise.resolve(action).then(() => {
      closeDepartmentModal();
    }).catch(() => undefined);
  };

  const submitCompany = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      name: companyDraft.name,
      role: companyDraft.role,
      packageOffered: companyDraft.packageOffered,
      driveDate: companyDraft.driveDate,
      status: companyDraft.status,
      location: companyDraft.location,
      type: companyDraft.type,
      eligibleDepartments: companyDraft.eligibleDepartments
        .split(',')
        .map((department) => department.trim().toUpperCase())
        .filter(Boolean),
    };

    const action = editingCompany
      ? onUpdateCompany(editingCompany.id, payload)
      : onCreateCompany(payload);

    void Promise.resolve(action).then(() => {
      closeCompanyModal();
    }).catch(() => undefined);
  };

  const submitAnnouncement = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      title: announcementDraft.title,
      summary: announcementDraft.summary,
      audience: announcementDraft.audience,
      priority: announcementDraft.priority,
      category: announcementDraft.category,
    };

    const action = editingAnnouncement
      ? onUpdateAnnouncement(editingAnnouncement.id, payload)
      : onCreateAnnouncement(payload);

    void Promise.resolve(action).then(() => {
      closeAnnouncementModal();
    }).catch(() => undefined);
  };

  const submitMaster = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      category: masterDraft.category,
      label: masterDraft.label,
      description: masterDraft.description.trim() || undefined,
      sortOrder: Number(masterDraft.sortOrder),
    };

    const action = editingMaster
      ? onUpdateMaster(editingMaster.id, payload)
      : onCreateMaster(payload);

    void Promise.resolve(action).then(() => {
      closeMasterModal();
    }).catch(() => undefined);
  };

  const submitDesignation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      name: designationDraft.name,
      departmentCode: designationDraft.departmentCode || undefined,
      description: designationDraft.description.trim() || undefined,
      permissions: extractAssignablePermissions(designationDraft.permissions),
    };

    const action = editingDesignation
      ? onUpdateDesignation(editingDesignation.id, payload)
      : onCreateDesignation(payload);

    void Promise.resolve(action).then(() => {
      closeDesignationModal();
    }).catch(() => undefined);
  };

  const submitStaff = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // Validation
    const errors: Record<string, string> = {};
    
    if (!staffDraft.name.trim()) {
      errors.name = 'Full name is required';
    }
    if (!staffDraft.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(staffDraft.email)) {
      errors.email = 'Please enter a valid email';
    }
    if (!staffDraft.designationId) {
      errors.designationId = 'Designation is required';
    }
    if (!staffDraft.departmentCode) {
      errors.departmentCode = 'Department is required';
    }
    if (!editingStaff && !staffDraft.password.trim()) {
      errors.password = 'Password is required for new staff';
    }
    
    if (Object.keys(errors).length > 0) {
      setStaffErrors(errors);
      if (errors.designationId || errors.departmentCode || errors.password) {
        setStaffModalTab('academic');
      }
      return;
    }
    
    setStaffErrors({});

    const designation = findDesignationById(staffDraft.designationId) ?? (data.designations[0] ?? null);
    if (!designation) {
      setStaffErrors({ designationId: 'Invalid designation selected' });
      setStaffModalTab('academic');
      return;
    }

    const experienceInput = (staffDraft.experience ?? '').trim();
    const experienceYears = experienceInput ? Number.parseInt(experienceInput, 10) : undefined;
    if (experienceInput && (Number.isNaN(experienceYears) || experienceYears < 0)) {
      setStaffErrors({ experience: 'Experience must be a valid non-negative number' });
      setStaffModalTab('academic');
      return;
    }

    const payload = {
      name: staffDraft.name,
      email: staffDraft.email,
      phone: staffDraft.phone || undefined,
      imageFile: staffDraft.imageFile ?? undefined,
      communicationAddress: staffDraft.communicationAddress || undefined,
      permanentAddress: staffDraft.permanentAddress || undefined,
      emergencyContactPerson: staffDraft.emergencyContactPerson || undefined,
      emergencyContactNumber: staffDraft.emergencyContactNumber || undefined,
      biometricId: staffDraft.biometricId || undefined,
      experienceYears,
      specialization: staffDraft.specialization || undefined,
      designationId: designation.id,
      departmentCode: staffDraft.departmentCode,
      password: staffDraft.password.trim() || undefined,
      permissions: extractAssignablePermissions(designation.permissions),
    };

    const action = editingStaff
      ? onUpdateStaff(editingStaff.id, payload)
      : onCreateStaff(payload);

    void Promise.resolve(action)
      .then(() => {
        setStaffErrors({});
        if (payload.password) {
          setCredentialNotice({
            label: editingStaff ? 'Updated staff login' : 'New staff login',
            email: payload.email,
            password: payload.password,
          });
        }
        closeStaffModal();
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Unable to save staff account.';
        setStaffErrors((current) => ({
          ...current,
          form: message,
        }));
      });
  };

  const submitProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      name: profileDraft.name,
      email: profileDraft.email,
      title: profileDraft.title,
      password: profileDraft.password.trim() || undefined,
    };

    void Promise.resolve(onUpdateProfile(payload))
      .then(() => {
        if (payload.password) {
          setCredentialNotice({
            label: 'Updated profile login',
            email: payload.email,
            password: payload.password,
          });
        }
        closeProfileModal();
      })
      .catch(() => undefined);
  };

  const handleResumeListChange = (
    field: 'links' | 'certifications' | 'achievements' | 'projects' | 'experience',
    value: string,
  ) => {
    setResumeDraft((current) => ({
      ...current,
      [field]: resumeTextToList(value),
    }));
  };

  const handleResumeUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const looksTextBased = file.type.startsWith('text/') || /\.(txt|md|rtf)$/i.test(file.name);
    if (!looksTextBased) {
      setResumeUploadNotice('Upload a TXT, MD, or RTF resume file for scoring. For PDF or DOCX, paste the resume text below.');
      event.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      setResumeDraft((current) => ({
        ...current,
        uploadedResumeText: text,
        uploadedResumeFileName: file.name,
      }));
      setResumeUploadNotice(`Loaded ${file.name} for ATS scoring and analysis.`);
    } catch {
      setResumeUploadNotice('The resume file could not be read. Please paste the resume text manually.');
    } finally {
      event.target.value = '';
    }
  };

  const saveStudentResume = () => {
    if (!currentStudent || isResumeSaving) {
      return;
    }

    const payload = normalizeCampusStudentResume(
      {
        ...resumeDraft,
        lastUpdated: new Date().toISOString(),
      },
      currentStudent,
    );

    setIsResumeSaving(true);

    void Promise.resolve(onUpdateStudentResume(payload))
      .then(() => {
        setResumeDraft(payload);
        setResumeUploadNotice('Resume studio saved successfully.');
      })
      .catch(() => undefined)
      .finally(() => {
        setIsResumeSaving(false);
      });
  };

  const deleteStudent = (student: CampusData['students'][number]) => {
    setDeleteIntent({
      type: 'student',
      id: student.id,
      title: 'Delete student?',
      description: `Remove ${student.name} from the student list and disable this login from the demo workspace.`,
    });
  };

  const deleteDepartment = (department: CampusData['departments'][number]) => {
    setDeleteIntent({
      type: 'department',
      id: department.id,
      title: 'Delete department?',
      description: `Remove ${department.name} (${department.code}) from the campus list when it no longer has linked records.`,
    });
  };

  const deleteDesignation = (designation: CampusDesignation) => {
    setDeleteIntent({
      type: 'designation',
      id: designation.id,
      title: 'Delete designation?',
      description: `Remove ${designation.name} only after every linked staff member has been reassigned to another designation.`,
    });
  };

  const deleteCompany = (company: CampusData['companies'][number]) => {
    setDeleteIntent({
      type: 'company',
      id: company.id,
      title: 'Delete placement drive?',
      description: `Remove the ${company.name} drive for ${company.role} from placement tracking and student visibility.`,
    });
  };

  const deleteAnnouncement = (announcement: CampusData['announcements'][number]) => {
    setDeleteIntent({
      type: 'announcement',
      id: announcement.id,
      title: 'Delete announcement?',
      description: `Remove "${announcement.title}" from the notice feed and recent updates list.`,
    });
  };

  const deleteStaff = (staff: CampusData['users'][number]) => {
    setDeleteIntent({
      type: 'staff',
      id: staff.id,
      title: 'Delete staff account?',
      description: `Remove ${staff.name} from staff access and revoke this login from the campus workspace.`,
    });
  };

  const deleteMaster = (master: CampusMasterOption) => {
    setDeleteIntent({
      type: 'master',
      id: master.id,
      title: 'Delete master value?',
      description: `Remove ${master.label} from ${campusMasterCategoryLabels[master.category]} after linked records are updated.`,
    });
  };

  const confirmDelete = () => {
    if (!deleteIntent || isDeleteSubmitting) {
      return;
    }

    const request =
      deleteIntent.type === 'student'
        ? Promise.resolve(onDeleteStudent(deleteIntent.id)).then(() => {
            if (selectedStudentId === deleteIntent.id) {
              setSelectedStudentId(null);
            }
          })
        : deleteIntent.type === 'department'
          ? Promise.resolve(onDeleteDepartment(deleteIntent.id))
          : deleteIntent.type === 'master'
            ? Promise.resolve(onDeleteMaster(deleteIntent.id))
          : deleteIntent.type === 'designation'
            ? Promise.resolve(onDeleteDesignation(deleteIntent.id))
          : deleteIntent.type === 'company'
            ? Promise.resolve(onDeleteCompany(deleteIntent.id))
            : deleteIntent.type === 'announcement'
              ? Promise.resolve(onDeleteAnnouncement(deleteIntent.id))
              : Promise.resolve(onDeleteStaff(deleteIntent.id)).then(() => {
                  if (selectedStaffId === deleteIntent.id) {
                    setSelectedStaffId(null);
                  }
                });

    setIsDeleteSubmitting(true);

    void request
      .then(() => {
        setDeleteIntent(null);
      })
      .catch(() => undefined)
      .finally(() => {
        setIsDeleteSubmitting(false);
      });
  };

  const applyToCompany = (companyId: number) => {
    if (!currentStudent || currentStudent.appliedCompanyIds.includes(companyId) || !can('placement.apply')) {
      return;
    }

    void Promise.resolve(onApplyToCompany(companyId)).catch(() => undefined);
  };

  const dashboardHero = (
    <Panel className="overflow-hidden border border-sky-100 bg-[linear-gradient(135deg,#38bdf8,#7dd3fc)] p-7 text-white md:p-8">
      <div className="grid gap-7 xl:grid-cols-[1.25fr_0.75fr]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-blue-50">
            <Sparkles size={14} />
            Campus view
          </div>
          <h1 className="mt-5 text-3xl font-bold leading-tight md:text-4xl">{campusBrand.campusName}</h1>
          <p className="mt-4 text-base leading-7 text-blue-50/90">{roleSubtitle[user.role]}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {can('students.create') ? (
              <button
                type="button"
                onClick={() => openStudentEditor()}
                className="rounded-[18px] bg-white px-4 py-3 text-sm font-semibold text-sky-700 transition hover:bg-sky-50"
              >
                Add student
              </button>
            ) : null}
            {can('announcements.create') ? (
              <button
                type="button"
                onClick={() => openAnnouncementEditor()}
                className="rounded-[18px] border border-white/25 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/16"
              >
                Post update
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-[18px] border border-white/15 bg-white/10 p-5 backdrop-blur">
            <p className="text-sm text-blue-100">Live metrics</p>
            <p className="mt-3 text-3xl font-bold">{placementRate}%</p>
            <p className="mt-2 text-sm text-blue-50/80">Placement rate</p>
          </div>
          <div className="rounded-[18px] border border-white/15 bg-white/10 p-5 backdrop-blur">
            <p className="text-sm text-blue-100">This week</p>
            <p className="mt-3 text-3xl font-bold">{openDrives}</p>
            <p className="mt-2 text-sm text-blue-50/80">Open drives</p>
          </div>
        </div>
      </div>
    </Panel>
  );

  const renderAdminDashboard = () => {
    const activeStudents = Math.max(data.students.length - placedStudents - placementReadyStudents, 0);
    const adminSpotlightStudent =
      [...data.students].sort((left, right) => (right.cgpa - left.cgpa) || (right.attendance - left.attendance))[0] ?? null;
    const pipelineRows = featuredCompanies.map((company) => ({
      ...company,
      shortlistRate: company.applicants === 0 ? 0 : Math.round((company.shortlisted / company.applicants) * 100),
    }));

    return (
      <div className="space-y-5">
        <div className="flex min-w-0 items-center gap-2 overflow-hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7a93ac]">
          {breadcrumbItems.map((item, index) => (
            <div key={item} className="flex min-w-0 items-center gap-2">
              {index > 0 ? <ChevronRight size={12} className="flex-shrink-0 text-[#9ab1c8]" /> : null}
              <span className="truncate">{item}</span>
            </div>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          <AdminSnapshotCard
            label="Students"
            value={data.students.length}
            note={`${placementReadyStudents} ready for the next drive`}
            icon={Users}
            tone="navy"
          />
          <AdminSnapshotCard
            label="Placement Rate"
            value={`${placementRate}%`}
            note={`${placedStudents} students already placed`}
            icon={TrendingUp}
            tone="emerald"
          />
          <AdminSnapshotCard
            label="Fee Recovery"
            value={`${feeRecoveryRate}%`}
            note={`${paidFees} accounts cleared this cycle`}
            icon={ClipboardList}
            tone="amber"
          />
          <AdminSnapshotCard
            label="Open Drives"
            value={openDrives}
            note={`${data.companies.length} companies tracked`}
            icon={BriefcaseBusiness}
            tone="sky"
          />
        </div>

        {/* Department Designation Viewer */}
        <Panel className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Department Designation Viewer</h3>
              <p className="mt-1 text-sm text-slate-500">Select a department to view its HOD designation details</p>
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Select Department</label>
            <select
              value={selectedDepartmentId ?? ''}
              onChange={(e) => setSelectedDepartmentId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose a department...</option>
              {data.departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name} ({department.code})
                </option>
              ))}
            </select>
          </div>

          {selectedDepartmentId && (() => {
            const selectedDepartment = data.departments.find(d => d.id === selectedDepartmentId);
            if (!selectedDepartment) return null;

            // Find the HOD user for this department by matching the hod name
            const hodUser = data.users.find(user => 
              user.role === 'staff' && 
              user.departmentCode === selectedDepartment.code &&
              user.name === selectedDepartment.hod
            );

            const hodDesignation = hodUser
              ? data.designations.find(d => d.id === hodUser.designationId)
              : undefined;

            return (
              <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h4 className="text-md font-semibold text-slate-900 mb-3">
                  {selectedDepartment.name} Department
                </h4>
                
                {hodDesignation ? (
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-slate-600">HOD Name:</span>
                      <p className="text-sm text-slate-900 mt-1">{hodUser?.name}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-slate-600">Designation Name:</span>
                      <p className="text-sm text-slate-900 mt-1">{hodDesignation.name}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-slate-600">Description:</span>
                      <p className="text-sm text-slate-900 mt-1">{hodDesignation.description}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-slate-600">Permissions:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {hodDesignation.permissions.map((permission) => (
                          <span key={permission} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {campusPermissionLabels[permission]}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No HOD found for this department.</p>
                )}
              </div>
            );
          })()}
        </Panel>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.55fr)_330px]">
          <div className="space-y-5">
            <Panel className="overflow-hidden border-[#e5ebf3] px-0 py-0">
              <div className="flex flex-col gap-4 border-b border-[#edf2f7] px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Sales analytics</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-950">{activeAdminAnalytics.title}</h3>
                  <p className="mt-2 text-sm text-slate-500">{activeAdminAnalytics.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'placement', label: '1 Placement' },
                    { id: 'pipeline', label: '2 Pipeline' },
                    { id: 'readiness', label: '3 Readiness' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setAdminAnalyticsTab(tab.id as 'placement' | 'pipeline' | 'readiness')}
                      className={classNames(
                        'rounded-[18px] border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition',
                        adminAnalyticsTab === tab.id
                          ? 'border-[#123a66] bg-[#123a66] text-white'
                          : 'border-[#d9e3ed] bg-white text-[#123a66] hover:bg-[#f7fbff]',
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 border-b border-[#edf2f7] bg-[#f8fafc] px-6 py-4 md:grid-cols-4">
                <div className="rounded-[18px] border border-white bg-white px-4 py-3 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.18)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Placed</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">{placedStudents}</p>
                </div>
                <div className="rounded-[18px] border border-white bg-white px-4 py-3 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.18)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Ready</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">{placementReadyStudents}</p>
                </div>
                <div className="rounded-[18px] border border-white bg-white px-4 py-3 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.18)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Departments</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">{data.departments.length}</p>
                </div>
                <div className="rounded-[18px] border border-white bg-white px-4 py-3 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.18)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Live date</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">{headerDateLabel}</p>
                </div>
              </div>

              <div className="h-[340px] px-4 py-5 sm:px-6">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activeAdminAnalytics.data as any} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke="#ebf1f7" vertical={false} strokeDasharray="4 6" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#718095', fontSize: 12 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: '#718095', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '16px',
                        border: '1px solid #e3eaf3',
                        boxShadow: '0 18px 40px -30px rgba(15, 23, 42, 0.35)',
                      }}
                    />
                    {activeAdminAnalytics.series.map((series) => (
                      <Line
                        key={series.key}
                        type="monotone"
                        dataKey={series.key}
                        stroke={series.color}
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 5 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel className="border-[#e5ebf3] p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Application sales</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-950">Drive pipeline</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('placement')}
                  className="inline-flex items-center gap-2 rounded-[18px] border border-[#dce7f1] bg-white px-4 py-2.5 text-sm font-semibold text-[#133b67] transition hover:bg-[#f8fbff]"
                >
                  Open placement
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="mt-5 overflow-hidden rounded-[18px] border border-[#e7edf4]">
                <table className="min-w-full divide-y divide-[#e7edf4]">
                  <thead className="bg-[#f8fafc]">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Application</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Users</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Change</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Package</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eef2f7] bg-white">
                    {pipelineRows.map((company) => (
                      <tr key={company.id} className="hover:bg-[#fbfdff]">
                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-950">{company.name}</p>
                          <p className="mt-1 text-sm text-slate-500">{company.role}</p>
                        </td>
                        <td className="px-4 py-4 text-sm font-medium text-slate-700">{company.applicants}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-20 rounded-full bg-[#eef3f7]">
                              <div
                                className="h-2 rounded-full bg-[linear-gradient(90deg,#ff9b74,#32c7ea)]"
                                style={{ width: `${Math.max(company.shortlistRate, 8)}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-slate-700">{company.shortlistRate}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm font-medium text-slate-700">{company.packageOffered}</td>
                        <td className="px-4 py-4">
                          <span className={classNames('rounded-full px-3 py-1 text-xs font-semibold', statusTone(company.status))}>
                            {company.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>

          <div className="space-y-5">
            <Panel className="border-[#e5ebf3] p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Project stats</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-950">Placement ratio</h3>
                </div>
                <ChartColumn size={18} className="text-slate-400" />
              </div>

              <div className="relative mt-5 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={placementPieData} dataKey="value" innerRadius={72} outerRadius={96} paddingAngle={3}>
                      {placementPieData.map((item) => (
                        <Cell key={item.name} fill={item.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Rate</p>
                    <p className="mt-1 text-4xl font-bold text-[#ef6b4d]">{placementRate}%</p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Current cycle</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                {placementPieData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between rounded-[18px] bg-[#f8fafc] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm font-medium text-slate-700">{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-950">{item.value}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('reports')}
                className="mt-5 flex w-full items-center justify-between rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 shadow-sm"
              >
                Open visual report
                <ChevronRight size={18} />
              </button>
            </Panel>

            {adminSpotlightStudent ? (
              <Panel className="overflow-hidden border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Student spotlight</p>
                <h3 className="mt-3 text-xl font-bold text-slate-900 leading-tight">{adminSpotlightStudent.name}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {adminSpotlightStudent.departmentCode} | {adminSpotlightStudent.year}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">CGPA</p>
                    <p className="mt-1 text-lg font-black text-slate-900 leading-none">{adminSpotlightStudent.cgpa}</p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Attendance</p>
                    <p className="mt-1 text-lg font-black text-slate-900 leading-none">{adminSpotlightStudent.attendance}%</p>
                  </div>
                </div>
                <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 leading-none">{adminSpotlightStudent.status}</p>
                  <p className="mt-1.5 text-xs text-slate-500">{adminSpotlightStudent.skills.slice(0, 3).join(' | ')}</p>
                </div>
              </Panel>
            ) : null}

            <Panel className="border-[#e5ebf3] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">User activity</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-950">Live updates</h3>
                </div>
                <Bell size={18} className="text-slate-400" />
              </div>

              <div className="mt-5 space-y-3">
                {activityFeed.map((announcement) => (
                  <div key={announcement.id} className="flex gap-3 rounded-[18px] border border-[#edf2f7] bg-[#f8fafc] px-4 py-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#e8f5ff] text-[#18a2da]">
                      <Bell size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold text-slate-950">{announcement.title}</p>
                        <span className={classNames('rounded-full px-2.5 py-1 text-[10px] font-semibold', statusTone(announcement.priority))}>
                          {announcement.priority}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{announcement.summary}</p>
                      <div className="mt-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        <span>{announcement.postedBy}</span>
                        <span>{formatDate(announcement.date)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-[18px] bg-[#f8fafc] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Campus load</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-2xl font-bold text-slate-950">{activeStudents}</p>
                    <p className="text-sm text-slate-500">Active students</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-950">{departmentLeaders[0]?.department.code ?? 'NA'}</p>
                    <p className="text-sm text-slate-500">Top department</p>
                  </div>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    );
  };

  const renderStaffDashboard = () => {
    const departmentName = user.departmentCode ? departmentLookup.get(user.departmentCode)?.name ?? 'My Department' : 'My Department';
    const readyStudents = scopeStudents.filter((student) => student.status === 'placement_ready').length;

    return (
      <div className="space-y-6">
        {dashboardHero}

        <div className="flex min-w-0 items-center gap-2 overflow-hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7a93ac]">
          {breadcrumbItems.map((item, index) => (
            <div key={item} className="flex min-w-0 items-center gap-2">
              {index > 0 ? <ChevronRight size={12} className="flex-shrink-0 text-[#9ab1c8]" /> : null}
              <span className="truncate">{item}</span>
            </div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Department Students" value={scopeStudents.length} helper={user.departmentCode ?? 'Dept'} icon={Users} tone="navy" />
          <MetricCard label="Placement Ready" value={readyStudents} helper="Actionable list" icon={ShieldCheck} tone="sky" />
          <MetricCard label="Avg Attendance" value={`${scopedAverageAttendance}%`} helper="Live snapshot" icon={BookOpenCheck} tone="teal" />
          <MetricCard label="Announcements" value={visibleAnnouncements.length} helper="Shared feed" icon={Megaphone} tone="indigo" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Panel className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-950">{departmentName}</h3>
                <p className="mt-2 text-sm text-slate-500">Students you can highlight during department-specific demos.</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('students')}
                className="rounded-[18px] border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Open students
              </button>
            </div>
            <div className="mt-5 space-y-3">
              {scopeStudents.slice(0, 6).map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => {
                    setSelectedStudentId(student.id);
                    setActiveTab('students');
                  }}
                  className="flex w-full items-center justify-between rounded-[18px] border border-slate-100 px-4 py-4 text-left transition hover:border-slate-200 hover:bg-slate-50"
                >
                  <div>
                    <p className="font-semibold text-slate-950">{student.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{student.registrationNumber}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={classNames('rounded-full px-3 py-1 text-xs font-semibold', statusTone(student.status))}>
                      {masterLabel('student_status', student.status)}
                    </span>
                    <ChevronRight size={18} className="text-slate-400" />
                  </div>
                </button>
              ))}
            </div>
          </Panel>

          <Panel className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-950">Readiness trend</h3>
                <p className="mt-2 text-sm text-slate-500">A compact performance chart for staff demos.</p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Team view</span>
            </div>
            <div className="mt-6 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthTrend}>
                  <CartesianGrid stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#475569' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#475569' }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="offers" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="drives" stroke="#7dd3fc" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      </div>
    );
  };

  const renderStudentDashboard = () => {
    if (!currentStudent) {
      return (
        <Panel className="p-8">
          <p className="text-lg font-semibold text-slate-950">Student profile missing</p>
          <p className="mt-2 text-sm text-slate-500">The demo account does not have a linked student profile yet.</p>
        </Panel>
      );
    }

    const appliedCompanies = data.companies.filter((company) => currentStudent.appliedCompanyIds.includes(company.id));

    return (
      <div className="space-y-6">
        <div className="flex min-w-0 items-center gap-2 overflow-hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7a93ac]">
          {breadcrumbItems.map((item, index) => (
            <div key={item} className="flex min-w-0 items-center gap-2">
              {index > 0 ? <ChevronRight size={12} className="flex-shrink-0 text-[#9ab1c8]" /> : null}
              <span className="truncate">{item}</span>
            </div>
          ))}
        </div>

        <Panel className="overflow-hidden bg-white border border-slate-200/80 p-6 shadow-sm">
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-600">
                <GraduationCap size={14} />
                Student dashboard
              </div>
              <h1 className="mt-4 text-2xl font-black text-slate-900">{currentStudent.name}</h1>
              <p className="hidden">
                {currentStudent.registrationNumber} • {currentStudent.departmentCode} • {currentStudent.year}
              </p>
              <p className="mt-1.5 text-sm text-slate-600">
                {currentStudent.registrationNumber} | {currentStudent.departmentCode} | {masterLabel('student_year', currentStudent.year)}
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500">
                Track placements, monitor announcements, and show a polished student journey during demos.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Placement status</p>
                <p className="mt-1.5 text-xl font-black text-slate-900">{masterLabel('student_status', currentStudent.status)}</p>
                <p className="mt-1 text-xs text-slate-500">You already match {eligibleCompanies.length} eligible drives.</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Current applications</p>
                <p className="mt-1.5 text-xl font-black text-slate-900">{appliedCompanies.length}</p>
                <p className="mt-1 text-xs text-slate-500">Use this to show placement momentum clearly.</p>
              </div>
            </div>
          </div>
        </Panel>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="CGPA" value={currentStudent.cgpa.toFixed(1)} helper="Academic score" icon={BookOpenCheck} tone="sky" />
          <MetricCard label="Attendance" value={`${currentStudent.attendance}%`} helper="Latest record" icon={ClipboardList} tone="navy" />
          <MetricCard label="Applications" value={appliedCompanies.length} helper="Submitted" icon={BriefcaseBusiness} tone="emerald" />
          <MetricCard label="Announcements" value={visibleAnnouncements.length} helper="Unread feed" icon={Megaphone} tone="amber" />
        </div>
      </div>
    );
  };

  const renderMastersTab = () => {
    const masterCategoryEntries = Object.entries(campusMasterCategoryLabels) as Array<[CampusMasterCategory, string]>;
    const visibleMasters = masterOptions(activeMasterCategory).filter((master) =>
      matchesHeaderSearch(master.label, master.code, master.description, campusMasterCategoryLabels[master.category]),
    );

    return (
      <div className="space-y-6">
        <SectionHeader
          title="Master data"
          description="Live lookup values that power student, placement, payment, and announcement flows."
          action={
            can('departments.create') ? (
              <button
                type="button"
                onClick={() => openMasterEditor(undefined, activeMasterCategory)}
                className="inline-flex items-center gap-2 rounded-[18px] bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Plus size={16} />
                Add master value
              </button>
            ) : null
          }
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Master values" value={data.masters.length} helper="Live options" icon={BookOpenCheck} tone="navy" />
          <MetricCard label="Master categories" value={masterCategoryEntries.length} helper="Campus lookups" icon={Filter} tone="sky" />
          <MetricCard label="Departments" value={data.departments.length} helper="Entity master" icon={Building2} tone="teal" />
          <MetricCard label="Designations" value={data.designations.length} helper="Entity master" icon={ShieldCheck} tone="amber" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
          <Panel className="p-6">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {masterCategoryEntries.map(([category, label]) => {
                const isActive = activeMasterCategory === category;

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveMasterCategory(category)}
                    className={classNames(
                      'rounded-[18px] border px-4 py-4 text-left transition',
                      isActive
                        ? 'border-[#b7d8ef] bg-[#f3faff] shadow-[0_18px_35px_-30px_rgba(15,23,42,0.28)]'
                        : 'border-[#e7edf4] bg-white hover:border-[#d7e4f0] hover:bg-[#fbfdff]',
                    )}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Category</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">{label}</p>
                    <p className="mt-3 text-2xl font-bold text-[#123a66]">{masterOptions(category).length}</p>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex flex-col gap-3 border-b border-[#edf2f7] pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Selected category</p>
                <h3 className="mt-2 text-2xl font-bold text-slate-950">{campusMasterCategoryLabels[activeMasterCategory]}</h3>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {visibleMasters.length} values
              </span>
            </div>

            <div className="mt-5 overflow-hidden rounded-[18px] border border-[#e7edf4]">
              <table className="min-w-full divide-y divide-[#e7edf4]">
                <thead className="bg-[#f8fafc]">
                  <tr>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Label</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Code</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Description</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Sort</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef2f7] bg-white">
                  {visibleMasters.map((master) => (
                    <tr key={master.id} className="hover:bg-[#fbfdff]">
                      <td className="px-4 py-4 font-semibold text-slate-950">{master.label}</td>
                      <td className="px-4 py-4 text-sm text-slate-500">{master.code}</td>
                      <td className="px-4 py-4 text-sm leading-6 text-slate-600">
                        {master.description || 'No description added yet.'}
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-slate-700">{master.sortOrder}</td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openMasterEditor(master)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-[18px] border border-slate-200 text-slate-700 transition hover:bg-slate-50"
                            aria-label={`Edit ${master.label}`}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteMaster(master)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-[18px] border border-red-200 text-red-600 transition hover:bg-red-50"
                            aria-label={`Delete ${master.label}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visibleMasters.length === 0 ? (
                <div className="border-t border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                  No master values match the current search.
                </div>
              ) : null}
            </div>
          </Panel>

          <div className="space-y-6">
            <Panel className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Entity masters</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-950">Linked modules</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Departments and designations stay live in their own modules because they link directly to staff, students, and access control.
                  </p>
                </div>
                <BookOpenCheck size={18} className="text-slate-400" />
              </div>

              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={() => handleNavSelection('departments')}
                  className="flex w-full items-center justify-between rounded-[18px] border border-[#e7edf4] bg-[#fbfdff] px-4 py-4 text-left transition hover:border-[#d7e4f0]"
                >
                  <div>
                    <p className="font-semibold text-slate-950">Departments</p>
                    <p className="mt-1 text-sm text-slate-500">{data.departments.length} live department records</p>
                  </div>
                  <ChevronRight size={18} className="text-slate-400" />
                </button>
                <button
                  type="button"
                  onClick={() => handleNavSelection('designations')}
                  className="flex w-full items-center justify-between rounded-[18px] border border-[#e7edf4] bg-[#fbfdff] px-4 py-4 text-left transition hover:border-[#d7e4f0]"
                >
                  <div>
                    <p className="font-semibold text-slate-950">Designations</p>
                    <p className="mt-1 text-sm text-slate-500">{data.designations.length} access profiles for staff</p>
                  </div>
                  <ChevronRight size={18} className="text-slate-400" />
                </button>
              </div>
            </Panel>

            <Panel className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Where it is used</p>
              <h3 className="mt-2 text-2xl font-bold text-slate-950">{campusMasterCategoryLabels[activeMasterCategory]}</h3>
              <div className="mt-5 space-y-3">
                {activeMasterCategory === 'student_gender' ? (
                  <div className="rounded-[18px] bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">Shown in student records and student creation forms.</div>
                ) : null}
                {activeMasterCategory === 'student_year' ? (
                  <div className="rounded-[18px] bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">Used by student lists, dashboards, profile cards, and registration data.</div>
                ) : null}
                {activeMasterCategory === 'student_status' ? (
                  <div className="rounded-[18px] bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">Controls placement badges, readiness metrics, and student spotlight cards.</div>
                ) : null}
                {activeMasterCategory === 'payment_status' ? (
                  <div className="rounded-[18px] bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">Powers fee status badges and fee recovery analytics.</div>
                ) : null}
                {activeMasterCategory === 'company_drive_status' ? (
                  <div className="rounded-[18px] bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">Used in placement tables, activity feeds, and open-drive calculations.</div>
                ) : null}
                {activeMasterCategory === 'company_drive_type' ? (
                  <div className="rounded-[18px] bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">Controls placement versus internship labelling throughout the placement module.</div>
                ) : null}
                {activeMasterCategory === 'announcement_audience' ? (
                  <div className="rounded-[18px] bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">Decides who sees each announcement in student, staff, and admin workspaces.</div>
                ) : null}
                {activeMasterCategory === 'announcement_priority' ? (
                  <div className="rounded-[18px] bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">Drives alert colors, live activity urgency, and announcement badges.</div>
                ) : null}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    );
  };

  const renderStudentsTab = () => (
    <div className="space-y-6">
      <SectionHeader
        title="Student module"
        description="Search, filter, and showcase rich student records."
        action={
          can('students.create') ? (
              <button
                type="button"
                onClick={() => openStudentEditor()}
                className="inline-flex items-center gap-2 rounded-[18px] bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Plus size={16} />
              Add student
            </button>
          ) : null
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_360px]">
        <Panel className="p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                value={studentSearch}
                onChange={(event) => setStudentSearch(event.target.value)}
                placeholder="Search student name or registration number"
                className="w-full rounded-[18px] border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="relative">
              <Filter className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <select
                value={departmentFilter}
                onChange={(event) => setDepartmentFilter(event.target.value)}
                className="rounded-[18px] border border-slate-200 bg-slate-50 py-3 pl-11 pr-10 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              >
                <option value="all">All departments</option>
                {data.departments.map((department) => (
                  <option key={department.code} value={department.code}>
                    {department.code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <th className="px-4 pb-2">Name</th>
                  <th className="px-4 pb-2">Department</th>
                  <th className="px-4 pb-2">Year</th>
                  <th className="px-4 pb-2">Status</th>
                  <th className="px-4 pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {pagedStudents.map((student) => (
                  <tr key={student.id} className="rounded-[18px] bg-slate-50 text-sm text-slate-700">
                    <td className="rounded-l-[24px] px-4 py-4">
                      <div>
                        <p className="font-semibold text-slate-950">{student.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{student.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">{student.departmentCode}</td>
                    <td className="px-4 py-4">{student.year}</td>
                    <td className="px-4 py-4">
                      <span className={classNames('rounded-full px-3 py-1 text-xs font-semibold', statusTone(student.status))}>
                        {student.status}
                      </span>
                    </td>
                    <td className="rounded-r-[24px] px-4 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedStudentId(student.id)}
                          className="rounded-[18px] border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
                        >
                          View
                        </button>
                        {can('students.create') ? (
                          <>
                            <button
                              type="button"
                              onClick={() => openStudentEditor(student)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-[18px] border border-slate-200 text-slate-700 transition hover:bg-white"
                              aria-label={`Edit ${student.name}`}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteStudent(student)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-[18px] border border-red-200 text-red-600 transition hover:bg-red-50"
                              aria-label={`Delete ${student.name}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredStudents.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                No students match the current search.
              </div>
            ) : null}
          </div>

          {filteredStudents.length > 0 ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 text-sm text-[#4d6d8f]">
                <p>
                  Showing {studentPageStart + 1}–{studentPageStart + pagedStudents.length} of {filteredStudents.length}
                </p>
                <label className="flex items-center gap-2">
                  <span>Per page</span>
                  <select
                    value={studentsPerPage}
                    onChange={(event) => setStudentsPerPage(Number(event.target.value))}
                    className="h-11 rounded-[10px] border border-slate-200 bg-slate-50 px-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  >
                    {STUDENTS_PER_PAGE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {studentPageCount > 1 ? (
                <nav aria-label="Student pages" className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStudentPage(currentStudentPage - 1)}
                    disabled={currentStudentPage === 1}
                    className="inline-flex h-11 items-center gap-1 rounded-[10px] border border-slate-200 bg-white px-3 text-sm font-semibold text-[#123a66] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft size={16} aria-hidden="true" />
                    Previous
                  </button>
                  <span className="px-1 text-sm text-[#4d6d8f]" aria-current="page">
                    Page {currentStudentPage} of {studentPageCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setStudentPage(currentStudentPage + 1)}
                    disabled={currentStudentPage === studentPageCount}
                    className="inline-flex h-11 items-center gap-1 rounded-[10px] border border-slate-200 bg-white px-3 text-sm font-semibold text-[#123a66] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </nav>
              ) : null}
            </div>
          ) : null}
        </Panel>

        <Panel className="h-fit p-6 xl:self-start">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-950">Student profile</h3>
              <p className="mt-2 text-sm text-slate-500">A strong detail view for demos and internal reviews.</p>
            </div>
            <UserCircle2 size={20} className="text-slate-400" />
          </div>

          {selectedStudent ? (
            <div className="mt-5 space-y-5">
              <div className="rounded-[18px] bg-slate-950 p-5 text-white">
                <p className="text-sm text-slate-300">{selectedStudent.registrationNumber}</p>
                <h4 className="mt-2 text-2xl font-bold">{selectedStudent.name}</h4>
                <p className="mt-2 text-sm text-slate-300">{selectedStudent.departmentCode} • {selectedStudent.year}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[18px] bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">CGPA</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">{selectedStudent.cgpa.toFixed(1)}</p>
                </div>
                <div className="rounded-[18px] bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Attendance</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">{selectedStudent.attendance}%</p>
                </div>
              </div>
              <div className="space-y-3 rounded-[18px] border border-slate-100 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Status</span>
                  <span className={classNames('rounded-full px-3 py-1 text-xs font-semibold', statusTone(selectedStudent.status))}>
                    {selectedStudent.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Fee status</span>
                  <span className={classNames('rounded-full px-3 py-1 text-xs font-semibold', statusTone(selectedStudent.feeStatus))}>
                    {selectedStudent.feeStatus}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Mentor</span>
                  <span className="text-sm font-semibold text-slate-900">{selectedStudent.mentor}</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Skills</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedStudent.skills.map((skill) => (
                    <span key={skill} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-[18px] border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
              Select a student to view the full profile card.
            </div>
          )}
        </Panel>
      </div>
    </div>
  );

  const renderStaffTab = () => (
    <div className="space-y-6">
      <SectionHeader
        title="Staff module"
        description="Faculty coordinators, ownership details, and shareable login access."
        action={
          can('departments.create') ? (
            <button
              type="button"
              onClick={() => openStaffEditor()}
              className="inline-flex items-center gap-2 rounded-[18px] bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Plus size={16} />
              Add staff
            </button>
          ) : null
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel className="p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[18px] bg-slate-50 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Total staff</p>
              <p className="mt-2 text-3xl font-bold text-slate-950">{staffMembers.length}</p>
            </div>
            <div className="rounded-[18px] bg-slate-50 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Visible now</p>
              <p className="mt-2 text-3xl font-bold text-slate-950">{filteredStaffMembers.length}</p>
            </div>
            <div className="rounded-[18px] bg-slate-50 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Departments</p>
              <p className="mt-2 text-3xl font-bold text-slate-950">
                {new Set(staffMembers.map((account) => account.departmentCode).filter(Boolean)).size}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {filteredStaffMembers.map((staff) => {
              const department = departmentLookup.get(staff.departmentCode ?? '');
              const isSelected = selectedStaff?.id === staff.id;

              return (
                <button
                  key={staff.id}
                  type="button"
                  onClick={() => setSelectedStaffId(staff.id)}
                  className={classNames(
                    'flex w-full items-center justify-between rounded-[18px] border px-4 py-4 text-left transition',
                    isSelected
                      ? 'border-[#b7d8ef] bg-[#f3faff] shadow-[0_18px_35px_-30px_rgba(15,23,42,0.28)]'
                      : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50',
                  )}
                >
                  <div>
                    <p className="font-semibold text-slate-950">{staff.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{staff.email}</p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {department?.name ?? staff.departmentCode ?? 'Unassigned'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {staff.designationName ?? staff.title}
                    </span>
                    <ChevronRight size={18} className="text-slate-400" />
                  </div>
                </button>
              );
            })}
            {filteredStaffMembers.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                No staff accounts match the current search.
              </div>
            ) : null}
          </div>
        </Panel>

        <Panel className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-950">Staff profile</h3>
              <p className="mt-2 text-sm text-slate-500">Review department ownership, then edit or remove the account.</p>
            </div>
            <UserCircle2 size={20} className="text-slate-400" />
          </div>

          {selectedStaff ? (
            <div className="mt-5 space-y-5">
              <div className="rounded-[18px] bg-slate-950 p-5 text-white">
                <p className="text-sm text-slate-300">{selectedStaff.departmentCode ?? 'Campus staff'}</p>
                <h4 className="mt-2 text-2xl font-bold">{selectedStaff.name}</h4>
                <p className="mt-2 text-sm text-slate-300">{selectedStaff.email}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[18px] bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Designation</p>
                  <p className="mt-2 text-base font-semibold text-slate-950">{selectedStaff.designationName ?? selectedStaff.title}</p>
                  {selectedStaffDesignation?.description ? (
                    <p className="mt-2 text-sm leading-6 text-slate-500">{selectedStaffDesignation.description}</p>
                  ) : null}
                </div>
                <div className="rounded-[18px] bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Department</p>
                  <p className="mt-2 text-base font-semibold text-slate-950">
                    {departmentLookup.get(selectedStaff.departmentCode ?? '')?.name ?? selectedStaff.departmentCode ?? 'Not set'}
                  </p>
                </div>
              </div>
              <div className="rounded-[18px] border border-slate-100 p-5">
                <p className="text-sm font-semibold text-slate-900">Module access</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(selectedStaffDesignation?.permissions ?? selectedStaff.permissions ?? campusStaffBasePermissions).map((permission) => (
                    <span key={permission} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {campusPermissionLabels[permission]}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-[18px] border border-slate-100 p-5">
                <p className="text-sm font-semibold text-slate-900">Credential sharing</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  When you create a staff account or reset the password, the workspace will show the email and password in a share card so you can send it to the staff member right away.
                </p>
              </div>
              {can('departments.create') ? (
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => openStaffEditor(selectedStaff)}
                    className="inline-flex items-center gap-2 rounded-[18px] bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    <Pencil size={16} />
                    Edit staff
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteStaff(selectedStaff)}
                    disabled={selectedStaff.id === user.id}
                    className="inline-flex items-center gap-2 rounded-[18px] border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                    Delete staff
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-5 rounded-[18px] border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
              Select a staff member to view the account details.
            </div>
          )}
        </Panel>
      </div>
    </div>
  );

  const renderDesignationsTab = () => (
    <div className="space-y-6">
      <SectionHeader
        title="Designation module"
        description="Live access profiles that staff accounts inherit as soon as you assign them."
        action={
          can('departments.create') ? (
            <button
              type="button"
              onClick={() => openDesignationEditor()}
              className="inline-flex items-center gap-2 rounded-[18px] bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Plus size={16} />
              Add designation
            </button>
          ) : null
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Designation Profiles" value={data.designations.length} helper="Live access templates" icon={ShieldCheck} tone="navy" />
        <MetricCard label="Assigned Staff" value={staffMembers.length} helper="Linked to designations" icon={Users} tone="sky" />
        <MetricCard label="Custom Modules" value={campusStaffAssignablePermissions.length} helper="Access controls per role" icon={BookOpenCheck} tone="teal" />
      </div>

      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#e7edf4]">
            <thead className="bg-[#f8fafc]">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Designation</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Description</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Modules</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Staff linked</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef2f7] bg-white">
              {filteredDesignations.map((designation) => (
                <tr key={designation.id} className="hover:bg-[#fbfdff]">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-950">{designation.name}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{designation.slug}</p>
                  </td>
                  <td className="px-4 py-4 text-sm leading-6 text-slate-600">
                    {designation.description || 'No description added yet.'}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      {designation.permissions.map((permission) => (
                        <span key={permission} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          {campusPermissionLabels[permission]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-slate-700">{designation.staffCount}</td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openDesignationEditor(designation)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-[18px] border border-slate-200 text-slate-700 transition hover:bg-slate-50"
                        aria-label={`Edit ${designation.name}`}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteDesignation(designation)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-[18px] border border-red-200 text-red-600 transition hover:bg-red-50"
                        aria-label={`Delete ${designation.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredDesignations.length === 0 ? (
          <div className="border-t border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
            No designations match the current search.
          </div>
        ) : null}
      </Panel>
    </div>
  );

  const renderDepartmentsTab = () => (
    <div className="space-y-6">
      {can('departments.create') && filteredDepartmentStats.length === 0 ? (
        <Panel className="border-dashed border-slate-300 bg-slate-50/50 p-8">
          <div className="text-center">
            <Building2 size={48} className="mx-auto mb-4 text-slate-400" />
            <h3 className="mb-2 text-lg font-semibold text-slate-900">No departments yet</h3>
            <p className="mb-6 text-sm text-slate-600">
              Start by adding staff members, then create departments and assign HODs.
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => openStaffEditor()}
                className="inline-flex items-center gap-2 rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <UserPlus size={16} />
                Add Staff First
              </button>
              <button
                type="button"
                onClick={() => openDepartmentEditor()}
                className="inline-flex items-center gap-2 rounded-[18px] bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Plus size={16} />
                Create Department
              </button>
            </div>
          </div>
        </Panel>
      ) : null}

      <SectionHeader
        title="Department module"
        description="Academic units, HOD ownership, and placement performance."
        action={
          can('departments.create') ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => openStaffEditor()}
                className="inline-flex items-center gap-2 rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <UserPlus size={16} />
                Add Staff
              </button>
              <button
                type="button"
                onClick={() => openDepartmentEditor()}
                className="inline-flex items-center gap-2 rounded-[18px] bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Plus size={16} />
                Create Department
              </button>
            </div>
          ) : null
        }
      />

      <div className="grid gap-4 xl:grid-cols-2">
        {filteredDepartmentStats.map((item) => (
          <Panel key={item.department.id} className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {item.department.code}
                </div>
                <h3 className="mt-4 text-xl font-bold text-slate-950">{item.department.name}</h3>
                <p className="mt-2 text-sm text-slate-500">HOD: {departmentHodLabel(item.department.hod)}</p>
              </div>
              <div className="flex items-start gap-2">
                {can('departments.create') ? (
                  <>
                    <button
                      type="button"
                      onClick={() => openDepartmentEditor(item.department)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-[18px] border border-slate-200 text-slate-700 transition hover:bg-slate-50"
                      aria-label={`Edit ${item.department.name}`}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteDepartment(item.department)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-[18px] border border-red-200 text-red-600 transition hover:bg-red-50"
                      aria-label={`Delete ${item.department.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                ) : null}
                <div className="h-12 w-12 rounded-[18px]" style={{ background: `linear-gradient(145deg, ${item.department.accent}, #24a8e8)` }} />
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[18px] bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Students</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{item.students}</p>
              </div>
              <div className="rounded-[18px] bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Placed</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{item.placed}</p>
              </div>
              <div className="rounded-[18px] bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Rate</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{item.rate}%</p>
              </div>
            </div>
          </Panel>
        ))}
        {filteredDepartmentStats.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 xl:col-span-2">
            No departments match the current search.
          </div>
        ) : null}
      </div>
    </div>
  );

  const renderStudentPlacementTable = () => (
    <div className="space-y-6">
      <SectionHeader title="Placement module" description="Open company drives matched to the current student profile." />
      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#e7edf4]">
            <thead className="bg-[#f8fafc]">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Company</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Type</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Package</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Drive Date</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Location</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Status</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef2f7] bg-white">
              {filteredEligibleCompanies.map((company) => {
                const hasApplied = currentStudent?.appliedCompanyIds.includes(company.id) ?? false;

                return (
                  <tr key={company.id} className="hover:bg-[#fbfdff]">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-950">{company.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{company.role}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">{company.type}</td>
                    <td className="px-4 py-4 text-sm font-medium text-slate-700">{company.packageOffered}</td>
                    <td className="px-4 py-4 text-sm text-slate-700">{formatDate(company.driveDate)}</td>
                    <td className="px-4 py-4 text-sm text-slate-700">{company.location}</td>
                    <td className="px-4 py-4">
                      <span className={classNames('rounded-full px-3 py-1 text-xs font-semibold', statusTone(company.status))}>
                        {company.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => applyToCompany(company.id)}
                        disabled={hasApplied}
                        className={classNames(
                          'rounded-[18px] px-4 py-2.5 text-sm font-semibold transition',
                          hasApplied ? 'bg-slate-100 text-slate-400' : 'bg-slate-950 text-white hover:bg-slate-800',
                        )}
                      >
                        {hasApplied ? 'Applied' : 'Apply'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredEligibleCompanies.length === 0 ? (
          <div className="border-t border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
            No company drives match the current search.
          </div>
        ) : null}
      </Panel>
    </div>
  );

  const renderPlacementManagementTable = () => (
    <div className="space-y-6">
      <SectionHeader
        title="Placement module"
        description="Drive management, applicant momentum, and recruiter readiness."
        action={can('placement.create') ? (
            <button
              type="button"
              onClick={() => openCompanyEditor()}
              className="inline-flex items-center gap-2 rounded-[18px] bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Plus size={16} />
              Add company
            </button>
          ) : null}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Company Drives" value={data.companies.length} helper="All records" icon={Building2} tone="navy" />
        <MetricCard label="Applicants" value={data.companies.reduce((sum, company) => sum + company.applicants, 0)} helper="Live count" icon={Users} tone="sky" />
        <MetricCard label="Shortlisted" value={data.companies.reduce((sum, company) => sum + company.shortlisted, 0)} helper="Pipeline" icon={ShieldCheck} tone="teal" />
        <MetricCard label="Internship Drives" value={data.companies.filter((company) => company.type === 'Internship').length} helper="Blended demo" icon={ClipboardList} tone="amber" />
      </div>

      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#e7edf4]">
            <thead className="bg-[#f8fafc]">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Company</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Type</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Package</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Drive Date</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Applicants</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Shortlisted</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Status</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef2f7] bg-white">
              {filteredPlacementCompanies.map((company) => (
                <tr key={company.id} className="hover:bg-[#fbfdff]">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-950">{company.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{company.role}</p>
                    <p className="mt-1 text-xs text-slate-400">{company.location} | {company.eligibleDepartments.join(', ')}</p>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">{company.type}</td>
                  <td className="px-4 py-4 text-sm font-medium text-slate-700">{company.packageOffered}</td>
                  <td className="px-4 py-4 text-sm text-slate-700">{formatDate(company.driveDate)}</td>
                  <td className="px-4 py-4 text-sm text-slate-700">{company.applicants}</td>
                  <td className="px-4 py-4 text-sm text-slate-700">{company.shortlisted}</td>
                  <td className="px-4 py-4">
                    <span className={classNames('rounded-full px-3 py-1 text-xs font-semibold', statusTone(company.status))}>
                      {company.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    {can('placement.create') ? (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openCompanyEditor(company)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-[18px] border border-slate-200 text-slate-700 transition hover:bg-slate-50"
                          aria-label={`Edit ${company.name}`}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCompany(company)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-[18px] border border-red-200 text-red-600 transition hover:bg-red-50"
                          aria-label={`Delete ${company.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">View only</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredPlacementCompanies.length === 0 ? (
          <div className="border-t border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
            No company drives match the current search.
          </div>
        ) : null}
      </Panel>
    </div>
  );

  const renderPlacementTab = () => {
    if (user.role === 'student' && currentStudent) {
      return renderStudentPlacementTable();
      /*
      return (
        <div className="space-y-6">
          <SectionHeader title="Placement module" description="Open company drives matched to the current student profile." />
          <div className="grid gap-5 xl:grid-cols-2">
            {filteredEligibleCompanies.map((company) => {
              const hasApplied = currentStudent.appliedCompanyIds.includes(company.id);
              return (
                <Panel key={company.id} className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{company.type}</p>
                      <h3 className="mt-2 text-2xl font-bold text-slate-950">{company.name}</h3>
                      <p className="mt-2 text-sm text-slate-500">{company.role}</p>
                    </div>
                    <span className={classNames('rounded-full px-3 py-1 text-xs font-semibold', statusTone(company.status))}>
                      {company.status}
                    </span>
                  </div>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[18px] bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Package</p>
                      <p className="mt-2 font-semibold text-slate-950">{company.packageOffered}</p>
                    </div>
                    <div className="rounded-[18px] bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Drive date</p>
                      <p className="mt-2 font-semibold text-slate-950">{formatDate(company.driveDate)}</p>
                    </div>
                  </div>
                  <p className="mt-5 text-sm leading-6 text-slate-600">
                    Eligible departments: {company.eligibleDepartments.join(', ')} • Location: {company.location}
                  </p>
                  <button
                    type="button"
                    onClick={() => applyToCompany(company.id)}
                    disabled={hasApplied}
                    className={classNames(
                      'mt-5 rounded-[18px] px-4 py-3 text-sm font-semibold transition',
                      hasApplied ? 'bg-slate-100 text-slate-400' : 'bg-slate-950 text-white hover:bg-slate-800',
                    )}
                  >
                    {hasApplied ? 'Application sent' : 'Apply to drive'}
                  </button>
                </Panel>
              );
            })}
            {filteredEligibleCompanies.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 xl:col-span-2">
                No company drives match the current search.
              </div>
            ) : null}
          </div>
        </div>
      );
      */
    }

    return renderPlacementManagementTable();
    /*
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Placement module"
          description="Drive management, applicant momentum, and recruiter readiness."
          action={can('placement.create') ? (
              <button
                type="button"
                onClick={() => openCompanyEditor()}
                className="inline-flex items-center gap-2 rounded-[18px] bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Plus size={16} />
              Add company
            </button>
          ) : null}
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Company Drives" value={data.companies.length} helper="All records" icon={Building2} tone="navy" />
          <MetricCard label="Applicants" value={data.companies.reduce((sum, company) => sum + company.applicants, 0)} helper="Live count" icon={Users} tone="sky" />
          <MetricCard label="Shortlisted" value={data.companies.reduce((sum, company) => sum + company.shortlisted, 0)} helper="Pipeline" icon={ShieldCheck} tone="teal" />
          <MetricCard label="Internship Drives" value={data.companies.filter((company) => company.type === 'Internship').length} helper="Blended demo" icon={ClipboardList} tone="amber" />
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          {filteredFeaturedCompanies.map((company) => (
            <Panel key={company.id} className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{company.type}</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-950">{company.name}</h3>
                  <p className="mt-2 text-sm text-slate-500">{company.role}</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className={classNames('rounded-full px-3 py-1 text-xs font-semibold', statusTone(company.status))}>
                    {company.status}
                  </span>
                  {can('placement.create') ? (
                    <>
                      <button
                        type="button"
                        onClick={() => openCompanyEditor(company)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-[18px] border border-slate-200 text-slate-700 transition hover:bg-slate-50"
                        aria-label={`Edit ${company.name}`}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCompany(company)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-[18px] border border-red-200 text-red-600 transition hover:bg-red-50"
                        aria-label={`Delete ${company.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[18px] bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Package</p>
                  <p className="mt-2 font-semibold text-slate-950">{company.packageOffered}</p>
                </div>
                <div className="rounded-[18px] bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Drive date</p>
                  <p className="mt-2 font-semibold text-slate-950">{formatDate(company.driveDate)}</p>
                </div>
                <div className="rounded-[18px] bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Applicants</p>
                  <p className="mt-2 font-semibold text-slate-950">{company.applicants}</p>
                </div>
                <div className="rounded-[18px] bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Shortlisted</p>
                  <p className="mt-2 font-semibold text-slate-950">{company.shortlisted}</p>
                </div>
              </div>
              <p className="mt-5 text-sm leading-6 text-slate-600">
                Eligible departments: {company.eligibleDepartments.join(', ')} | Location: {company.location}
              </p>
            </Panel>
          ))}
          {filteredFeaturedCompanies.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 xl:col-span-2">
              No company drives match the current search.
            </div>
          ) : null}
        </div>
      </div>
    );
    */
  };

  const renderActivityTab = () => (
    <div className="space-y-6">
      <SectionHeader
        title="Live activity"
        description="Track campus announcements and placement movement in one stream."
        action={
          <div className="flex flex-wrap gap-3">
            {can('announcements.create') ? (
              <button
                type="button"
                onClick={() => openAnnouncementEditor()}
                className="inline-flex items-center gap-2 rounded-[18px] bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Plus size={16} />
                Post update
              </button>
            ) : null}
            {can('placement.view') ? (
              <button
                type="button"
                onClick={() => handleNavSelection('placement')}
                className="inline-flex items-center gap-2 rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <BriefcaseBusiness size={16} />
                Open placement
              </button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardHighlightCard
          label="Feed items"
          value={activityTimeline.length}
          detail="Announcements and live drive alerts combined in one view."
          meta="Live stream"
          icon={Bell}
          tone="navy"
        />
        <DashboardHighlightCard
          label="Announcements"
          value={filteredVisibleAnnouncements.length}
          detail="Campus communication currently visible for this login."
          meta="Campus feed"
          icon={Megaphone}
          tone="sky"
        />
        <DashboardHighlightCard
          label="Drive alerts"
          value={liveActivityCompanies.length}
          detail="Open, upcoming, and closing-soon drives in the active stream."
          meta="Placement"
          icon={BriefcaseBusiness}
          tone="emerald"
        />
        <DashboardHighlightCard
          label="Needs attention"
          value={highPriorityAnnouncements + closingSoonDrives}
          detail="High-priority notices and drives that are close to deadline."
          meta="Action"
          icon={ShieldCheck}
          tone="amber"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel className="p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-950">Activity timeline</h3>
              <p className="mt-2 text-sm text-slate-500">Latest updates across announcements and placement drives.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {activityTimeline.length} items
            </span>
          </div>

          <div className="mt-6 space-y-4">
            {activityTimeline.length ? (
              activityTimeline.map((item) => (
                <div key={item.id} className="rounded-[18px] border border-[#e7edf4] bg-[#fbfdff] p-4">
                  <div className="flex gap-4">
                    <div
                      className={classNames(
                        'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[18px]',
                        item.type === 'Announcement' ? 'bg-[#e8f5ff] text-[#18a2da]' : 'bg-[#e9fbf3] text-[#0f9b6c]',
                      )}
                    >
                      {item.type === 'Announcement' ? <Megaphone size={18} /> : <BriefcaseBusiness size={18} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                              {item.type}
                            </span>
                            <span className={classNames('rounded-full px-3 py-1 text-xs font-semibold', item.badgeClass)}>
                              {item.badge}
                            </span>
                          </div>
                          <h4 className="mt-3 text-lg font-bold text-slate-950">{item.title}</h4>
                          <p className="mt-2 text-sm leading-7 text-slate-600">{item.summary}</p>
                        </div>
                        <div className="rounded-[18px] bg-white px-4 py-3 text-left shadow-[0_14px_28px_-24px_rgba(15,23,42,0.18)] lg:min-w-[116px] lg:text-right">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Date</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDate(item.date)}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                        <span>{item.metaPrimary}</span>
                        <span>{item.metaSecondary}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[18px] border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                No live activity matches the current search.
              </div>
            )}
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-950">Feed summary</h3>
                <p className="mt-2 text-sm text-slate-500">A quick snapshot of what is moving across campus right now.</p>
              </div>
              <Bell size={18} className="text-slate-400" />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[18px] bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Latest update</p>
                <p className="mt-2 text-xl font-bold text-slate-950">
                  {activityTimeline[0] ? formatDate(activityTimeline[0].date) : headerDateLabel}
                </p>
              </div>
              <div className="rounded-[18px] bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">High priority</p>
                <p className="mt-2 text-xl font-bold text-slate-950">{highPriorityAnnouncements}</p>
              </div>
              <div className="rounded-[18px] bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Open drives</p>
                <p className="mt-2 text-xl font-bold text-slate-950">
                  {liveActivityCompanies.filter((company) => company.status === 'Open').length}
                </p>
              </div>
              <div className="rounded-[18px] bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Closing soon</p>
                <p className="mt-2 text-xl font-bold text-slate-950">{closingSoonDrives}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleNavSelection('announcements')}
                className="inline-flex items-center gap-2 rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Megaphone size={16} />
                Open announcements
              </button>
              {can('placement.view') ? (
                <button
                  type="button"
                  onClick={() => handleNavSelection('placement')}
                  className="inline-flex items-center gap-2 rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <BriefcaseBusiness size={16} />
                  View drives
                </button>
              ) : null}
            </div>
          </Panel>

          <Panel className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-950">Upcoming schedule</h3>
                <p className="mt-2 text-sm text-slate-500">Next drive dates visible in this workspace.</p>
              </div>
              <CalendarDays size={18} className="text-slate-400" />
            </div>

            <div className="mt-6 space-y-3">
              {nextActivityDrives.length ? (
                nextActivityDrives.map((company) => (
                  <div key={company.id} className="rounded-[18px] border border-[#e7edf4] bg-[#fbfdff] px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{company.name}</p>
                        <p className="mt-1 text-sm text-slate-500">{company.role}</p>
                      </div>
                      <span className={classNames('rounded-full px-3 py-1 text-xs font-semibold', statusTone(company.status))}>
                        {company.status}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
                      <span>{formatDate(company.driveDate)}</span>
                      <span>{company.packageOffered}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[18px] border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                  No active drive dates are available right now.
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );

  const renderAnnouncementsTab = () => (
    <div className="space-y-6">
      <SectionHeader
        title="Announcement module"
        description="Campus notifications, placement alerts, and admin communication."
        action={
          can('announcements.create') ? (
              <button
                type="button"
                onClick={() => openAnnouncementEditor()}
                className="inline-flex items-center gap-2 rounded-[18px] bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Plus size={16} />
              Add announcement
            </button>
          ) : null
        }
      />

      <div className="grid gap-5 xl:grid-cols-2">
        {filteredVisibleAnnouncements.map((announcement) => (
          <Panel key={announcement.id} className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {announcement.category}
                </span>
                <h3 className="mt-4 text-xl font-bold text-slate-950">{announcement.title}</h3>
              </div>
              <div className="flex items-start gap-2">
                <span className={classNames('rounded-full px-3 py-1 text-xs font-semibold', statusTone(announcement.priority))}>
                  {announcement.priority}
                </span>
                {can('announcements.create') ? (
                  <>
                    <button
                      type="button"
                      onClick={() => openAnnouncementEditor(announcement)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-[18px] border border-slate-200 text-slate-700 transition hover:bg-slate-50"
                      aria-label={`Edit ${announcement.title}`}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteAnnouncement(announcement)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-[18px] border border-red-200 text-red-600 transition hover:bg-red-50"
                      aria-label={`Delete ${announcement.title}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                ) : null}
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-600">{announcement.summary}</p>
            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-slate-500">
              <span>{announcement.postedBy}</span>
              <span>{announcement.audience}</span>
              <span>{formatDate(announcement.date)}</span>
            </div>
          </Panel>
        ))}
        {filteredVisibleAnnouncements.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 xl:col-span-2">
            No announcements match the current search.
          </div>
        ) : null}
      </div>
    </div>
  );

  const renderReportsTab = () => (
    <div className="space-y-6">
      <SectionHeader title="Reports module" description="Charts and KPIs that make the demo feel production-ready." />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Placement Rate" value={`${placementRate}%`} helper="Overall" icon={TrendingUp} tone="navy" />
        <MetricCard label="Fee Recovery" value={`${feeRecoveryRate}%`} helper="Collection" icon={ClipboardList} tone="amber" />
        <MetricCard label="Average Attendance" value={`${scopedAverageAttendance}%`} helper="Academic health" icon={BookOpenCheck} tone="sky" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-950">Monthly placement trend</h3>
              <p className="mt-2 text-sm text-slate-500">Offers and drive activity across the current cycle.</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Growth view</span>
          </div>
          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthTrend}>
                <defs>
                  <linearGradient id="offersGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#24a8e8" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#24a8e8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#475569' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#475569' }} />
                <Tooltip />
                <Area type="monotone" dataKey="offers" stroke="#24a8e8" strokeWidth={3} fill="url(#offersGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-950">Department performance</h3>
              <p className="mt-2 text-sm text-slate-500">Placed, ready, and active counts per department.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">Snapshot</span>
          </div>
          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredDepartmentStats}>
                <CartesianGrid stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="department.code" tickLine={false} axisLine={false} tick={{ fill: '#475569' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#475569' }} />
                <Tooltip />
                <Bar dataKey="students" fill="#cbd5e1" radius={[8, 8, 0, 0]} />
                <Bar dataKey="placed" fill="#24a8e8" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </div>
  );

  const renderProfileTab = () => {
    if (user.role === 'student' && currentStudent) {
      const appliedCompanies = data.companies.filter((company) => currentStudent.appliedCompanyIds.includes(company.id));
      const benchmarkKeywords = buildResumeBenchmarkKeywords(currentStudent, eligibleCompanies);
      const generatedResumeText = buildGeneratedResumeText(currentStudent, resumeDraft);
      const analysisSourceText = resumeDraft.uploadedResumeText.trim() || generatedResumeText;
      const analysisSourceLabel = resumeDraft.uploadedResumeText.trim()
        ? resumeDraft.uploadedResumeFileName || 'Pasted resume text'
        : 'Generated resume';
      const resumeAnalysis = analyzeResumeText(analysisSourceText, benchmarkKeywords, resumeDraft, currentStudent);
      const activeTemplate = resumeTemplateOptions.find((template) => template.id === resumeDraft.template) ?? resumeTemplateOptions[0];

      return (
        <div className="space-y-6">
          <SectionHeader
            title="Profile"
            description="Student profile, ATS-friendly resume studio, and placement readiness."
            action={
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={saveStudentResume}
                  disabled={isResumeSaving}
                  className="inline-flex items-center gap-2 rounded-[18px] bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <BookOpenCheck size={16} />
                  {isResumeSaving ? 'Saving resume...' : 'Save resume'}
                </button>
                <button
                  type="button"
                  onClick={openProfileEditor}
                  className="inline-flex items-center gap-2 rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Pencil size={16} />
                  Edit profile
                </button>
              </div>
            }
          />
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <Panel className="overflow-hidden">
              <div className="bg-[linear-gradient(135deg,#38bdf8,#7dd3fc)] p-7 text-white">
                <p className="text-sm text-blue-100">{user.title}</p>
                <h3 className="mt-2 text-3xl font-bold">{currentStudent.name}</h3>
                <p className="mt-2 text-sm text-blue-100">{user.email}</p>
              </div>
              <div className="space-y-4 p-7">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Registration</span>
                  <span className="font-semibold text-slate-950">{currentStudent.registrationNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Department</span>
                  <span className="font-semibold text-slate-950">{currentStudent.departmentCode}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Status</span>
                  <span className={classNames('rounded-full px-3 py-1 text-xs font-semibold', statusTone(currentStudent.status))}>
                    {masterLabel('student_status', currentStudent.status)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Academic year</span>
                  <span className="font-semibold text-slate-950">{masterLabel('student_year', currentStudent.year)}</span>
                </div>
              </div>
            </Panel>

            <Panel className="p-7">
              <h3 className="text-xl font-bold text-slate-950">Academic and placement snapshot</h3>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-[18px] bg-slate-50 p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">CGPA</p>
                  <p className="mt-2 text-3xl font-bold text-slate-950">{currentStudent.cgpa.toFixed(1)}</p>
                </div>
                <div className="rounded-[18px] bg-slate-50 p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Attendance</p>
                  <p className="mt-2 text-3xl font-bold text-slate-950">{currentStudent.attendance}%</p>
                </div>
              </div>
              <div className="mt-6">
                <p className="text-sm font-semibold text-slate-900">Skills</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {currentStudent.skills.map((skill) => (
                    <span key={skill} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-6 space-y-3">
                {appliedCompanies.map((company) => (
                  <div key={company.id} className="flex items-center justify-between rounded-[18px] border border-slate-100 px-4 py-3">
                    <div>
                      <p className="font-semibold text-slate-950">{company.name}</p>
                      <p className="text-sm text-slate-500">{company.role}</p>
                    </div>
                    <span className={classNames('rounded-full px-3 py-1 text-xs font-semibold', statusTone(company.status))}>
                      {masterLabel('company_drive_status', company.status)}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <Panel className="p-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-950">Resume studio</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Build an ATS-friendly resume from your details, then upload or paste resume text for scoring and analysis.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {resumeDraft.lastUpdated ? `Saved ${formatDate(resumeDraft.lastUpdated)}` : 'Draft not saved'}
                </span>
              </div>

              <div className="mt-6">
                <p className="text-sm font-semibold text-slate-900">ATS-friendly templates</p>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {resumeTemplateOptions.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setResumeDraft((current) => ({ ...current, template: template.id }))}
                      className={classNames(
                        'rounded-[18px] border px-4 py-4 text-left transition',
                        resumeDraft.template === template.id
                          ? 'border-[#b7d8ef] bg-[#f3faff] shadow-[0_18px_35px_-30px_rgba(15,23,42,0.28)]'
                          : 'border-[#e7edf4] bg-white hover:border-[#d7e4f0] hover:bg-[#fbfdff]',
                      )}
                    >
                      <p className="font-semibold text-slate-950">{template.label}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{template.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Headline</span>
                  <input
                    value={resumeDraft.headline}
                    onChange={(event) => setResumeDraft((current) => ({ ...current, headline: event.target.value }))}
                    placeholder="Full-stack student ready for campus placements"
                    className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Target role</span>
                  <input
                    value={resumeDraft.targetRole}
                    onChange={(event) => setResumeDraft((current) => ({ ...current, targetRole: event.target.value }))}
                    placeholder="Software Engineer Intern"
                    className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
                  <span>Professional summary</span>
                  <textarea
                    rows={4}
                    value={resumeDraft.summary}
                    onChange={(event) => setResumeDraft((current) => ({ ...current, summary: event.target.value }))}
                    placeholder="Write a short ATS-friendly summary focused on skills, impact, and target role."
                    className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Location</span>
                  <input
                    value={resumeDraft.location}
                    onChange={(event) => setResumeDraft((current) => ({ ...current, location: event.target.value }))}
                    placeholder="Bengaluru, India"
                    className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Links, one per line</span>
                  <textarea
                    rows={4}
                    value={resumeListToText(resumeDraft.links)}
                    onChange={(event) => handleResumeListChange('links', event.target.value)}
                    placeholder="https://github.com/username&#10;https://linkedin.com/in/username"
                    className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Projects, one bullet per line</span>
                  <textarea
                    rows={5}
                    value={resumeListToText(resumeDraft.projects)}
                    onChange={(event) => handleResumeListChange('projects', event.target.value)}
                    placeholder="Built a placement tracker used by 120+ students&#10;Created a React dashboard with live drive analytics"
                    className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Experience, one bullet per line</span>
                  <textarea
                    rows={5}
                    value={resumeListToText(resumeDraft.experience)}
                    onChange={(event) => handleResumeListChange('experience', event.target.value)}
                    placeholder="Developed reusable UI components during internship&#10;Collaborated with a 4-member team to improve release quality"
                    className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Achievements, one bullet per line</span>
                  <textarea
                    rows={4}
                    value={resumeListToText(resumeDraft.achievements)}
                    onChange={(event) => handleResumeListChange('achievements', event.target.value)}
                    placeholder="Won top 5 in hackathon&#10;Maintained 8.7 CGPA while leading project team"
                    className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Certifications, one per line</span>
                  <textarea
                    rows={4}
                    value={resumeListToText(resumeDraft.certifications)}
                    onChange={(event) => handleResumeListChange('certifications', event.target.value)}
                    placeholder="AWS Cloud Practitioner&#10;Google Data Analytics"
                    className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </label>
              </div>

              <div className="mt-6 rounded-[18px] border border-[#dbe6f0] bg-[#f8fbff] p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Resume upload and score</p>
                    <p className="mt-1 text-sm text-slate-500">Upload a text-based resume or paste resume text to run ATS scoring and AI-style analysis.</p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                    Upload resume text
                    <input type="file" accept=".txt,.md,.rtf,text/plain,text/markdown" onChange={handleResumeUpload} className="hidden" />
                  </label>
                </div>
                <textarea
                  rows={8}
                  value={resumeDraft.uploadedResumeText}
                  onChange={(event) =>
                    setResumeDraft((current) => ({
                      ...current,
                      uploadedResumeText: event.target.value,
                    }))
                  }
                  placeholder="Paste resume text here for ATS scoring. For PDF or DOCX resumes, paste the extracted text into this area."
                  className="mt-4 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
                {resumeUploadNotice ? (
                  <p className="mt-3 text-sm font-medium text-[#0d4f88]">{resumeUploadNotice}</p>
                ) : null}
              </div>
            </Panel>

            <div className="space-y-6">
              <Panel className="p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-950">ATS score and analysis</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">Analysis source: {analysisSourceLabel}</p>
                  </div>
                  <span className={classNames(
                    'rounded-full px-3 py-1 text-xs font-semibold',
                    resumeAnalysis.score >= 80 ? 'bg-emerald-50 text-emerald-700' : resumeAnalysis.score >= 65 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700',
                  )}>
                    {resumeAnalysis.score >= 80 ? 'Strong' : resumeAnalysis.score >= 65 ? 'Needs polish' : 'Needs work'}
                  </span>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-[18px] bg-slate-50 p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">ATS score</p>
                    <p className="mt-2 text-3xl font-bold text-slate-950">{resumeAnalysis.score}</p>
                  </div>
                  <div className="rounded-[18px] bg-slate-50 p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Keyword match</p>
                    <p className="mt-2 text-3xl font-bold text-slate-950">{resumeAnalysis.matchedKeywords.length}</p>
                  </div>
                  <div className="rounded-[18px] bg-slate-50 p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Word count</p>
                    <p className="mt-2 text-3xl font-bold text-slate-950">{resumeAnalysis.wordCount}</p>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Missing sections</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {resumeAnalysis.missingSections.length ? (
                        resumeAnalysis.missingSections.map((item) => (
                          <span key={item} className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                            {item}
                          </span>
                        ))
                      ) : (
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          Core ATS sections look complete
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900">Matched keywords</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {resumeAnalysis.matchedKeywords.slice(0, 10).map((keyword) => (
                        <span key={keyword} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900">Keywords to add</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {resumeAnalysis.missingKeywords.length ? (
                        resumeAnalysis.missingKeywords.map((keyword) => (
                          <span key={keyword} className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                            {keyword}
                          </span>
                        ))
                      ) : (
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          Keyword coverage looks strong
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900">AI-style suggestions</p>
                    <div className="mt-3 space-y-2">
                      {resumeAnalysis.suggestions.map((suggestion) => (
                        <div key={suggestion} className="rounded-[18px] border border-slate-100 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Panel>

              <Panel className={classNames('overflow-hidden p-0', activeTemplate.shellClass)}>
                <div className={classNames('px-6 py-5', activeTemplate.accentClass)}>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">{activeTemplate.label}</p>
                  <h3 className="mt-2 text-2xl font-bold">{currentStudent.name}</h3>
                  <p className="mt-2 text-sm opacity-85">{resumeDraft.headline || `${currentStudent.departmentCode} student`}</p>
                </div>
                <div className="space-y-6 p-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Contact</p>
                    <p className="mt-2 text-sm leading-7 text-slate-700">
                      {[currentStudent.email, currentStudent.phone, resumeDraft.location].filter(Boolean).join(' | ') || 'Add phone or location for a stronger ATS-ready header.'}
                    </p>
                    {resumeDraft.links.length ? (
                      <p className="mt-2 text-sm leading-7 text-slate-500">{resumeDraft.links.join(' | ')}</p>
                    ) : null}
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Summary</p>
                    <p className="mt-2 text-sm leading-7 text-slate-700">{resumeDraft.summary || 'Add a concise professional summary to improve ATS clarity.'}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Education</p>
                    <p className="mt-2 text-sm leading-7 text-slate-700">
                      {currentStudent.departmentCode} | {masterLabel('student_year', currentStudent.year)} | CGPA {currentStudent.cgpa.toFixed(1)} | Attendance {currentStudent.attendance}%
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Skills</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {currentStudent.skills.map((skill) => (
                        <span key={skill} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Projects</p>
                    <div className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
                      {resumeDraft.projects.length ? resumeDraft.projects.map((item) => <p key={item}>• {item}</p>) : <p>Add project bullets to strengthen your resume.</p>}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Experience</p>
                    <div className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
                      {resumeDraft.experience.length ? resumeDraft.experience.map((item) => <p key={item}>• {item}</p>) : <p>Add internship or responsibility bullets here.</p>}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Achievements and certifications</p>
                    <div className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
                      {[...resumeDraft.achievements, ...resumeDraft.certifications].length
                        ? [...resumeDraft.achievements, ...resumeDraft.certifications].map((item) => <p key={item}>• {item}</p>)
                        : <p>Add awards, certifications, or academic highlights for stronger ATS signals.</p>}
                    </div>
                  </div>
                </div>
              </Panel>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <SectionHeader
          title="Profile"
          description="Role profile, ownership, and demo controls."
          action={
            <button
              type="button"
              onClick={openProfileEditor}
              className="inline-flex items-center gap-2 rounded-[18px] bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Pencil size={16} />
              Edit profile
            </button>
          }
        />
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Panel className="overflow-hidden">
            <div className="bg-[linear-gradient(135deg,#38bdf8,#7dd3fc)] p-7 text-white">
              <p className="text-sm text-emerald-100">{user.title}</p>
              <h3 className="mt-2 text-3xl font-bold">{user.name}</h3>
              <p className="mt-2 text-sm text-emerald-100">{user.email}</p>
            </div>
            <div className="space-y-4 p-7">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Access role</span>
                <span className="font-semibold text-slate-950">{campusRoleLabels[user.role]}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-500">Institution</span>
                <span className="text-right font-semibold text-slate-950">
                  {institutionName}
                  {institutionCode ? <span className="ml-1 font-normal text-slate-500">({institutionCode})</span> : null}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Department</span>
                <span className="font-semibold text-slate-950">{user.departmentCode ?? 'All Departments'}</span>
              </div>
            </div>
          </Panel>

          <Panel className="p-7">
            <h3 className="text-xl font-bold text-slate-950">Demo controls and scope</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              This profile view gives you a safe place to explain access levels, operational ownership, and reset the seeded data before the next client conversation.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-[18px] bg-slate-50 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Students in scope</p>
                <p className="mt-2 text-3xl font-bold text-slate-950">{scopeStudents.length}</p>
              </div>
              <div className="rounded-[18px] bg-slate-50 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Announcements</p>
                <p className="mt-2 text-3xl font-bold text-slate-950">{visibleAnnouncements.length}</p>
              </div>
              <div className="rounded-[18px] bg-slate-50 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Open drives</p>
                <p className="mt-2 text-3xl font-bold text-slate-950">{openDrives}</p>
              </div>
            </div>
            {can('demo.reset') ? (
              <div className="mt-6 rounded-[18px] border border-dashed border-slate-200 p-5">
                <p className="text-sm font-semibold text-slate-900">Reset seeded demo data</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Use this before a fresh walkthrough if you want to clear any students, companies, or announcements added during a previous sales call.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    void onResetDemo();
                  }}
                  className="mt-5 inline-flex items-center gap-2 rounded-[18px] border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <RotateCcw size={16} />
                  Reset demo data
                </button>
              </div>
            ) : null}
          </Panel>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return isAdminRole(user.role) ? renderAdminDashboard() : isInstitutionStaffRole(user.role) ? renderStaffDashboard() : renderStudentDashboard();
      case 'activity':
        return renderActivityTab();
      case 'masters':
        return renderMastersTab();
      case 'students':
        return renderStudentsTab();
      case 'staff':
        return renderStaffTab();
      case 'designations':
        return renderDesignationsTab();
      case 'departments':
        return <DepartmentsModule onNavigateToStaff={() => handleNavSelection('staff')} />;
      case 'placement':
        return renderPlacementTab();
      case 'announcements':
        return renderAnnouncementsTab();
      case 'reports':
        return renderReportsTab();
      case 'profile':
        return renderProfileTab();
      case 'courses':
        return <CoursesModule />;
      case 'subjects':
        return <SubjectsModule />;
      case 'academic_years':
        return <AcademicYearModule />;
      case 'timetable':
        return <TimetableModule />;
      case 'classes':
        return <ClassesModule />;
      case 'roles':
        return <RolesPermissionsModule />;
      case 'exams':
        return <ExamsModule />;
      case 'marks':
        return user.role === 'student' ? (
          <StudentResultsView apiConfigured={isCampusApiConfigured()} />
        ) : (
          <MarksWorkflowModule permissions={user.permissions} apiConfigured={isCampusApiConfigured()} />
        );
      case 'fees':
        return <FeesModule />;
      case 'settings':
        return <SystemSettingsModule />;
      case 'department_overview':
        return <DepartmentOverview />;
      case 'hod_staff_management':
        return <HODStaffManagement />;
      case 'hod_reports':
        return <HODReportsAnalytics />;
      case 'placement_officer':
        return <PlacementOfficerModule />;
      case 'exam_coordinator':
        return <ExamCoordinatorModule />;
      case 'student_timetable':
        return <StudentTimetableView />;
      case 'student_assignments':
        return <StudentAssignmentsMaterials />;
      case 'student_notifications':
        return <StudentNotifications />;
      case 'attendance':
        return user.role === 'student'
          ? <StudentAttendanceView />
          : <AttendanceMarking staffRole={isAdminRole(user.role) ? 'admin' : 'faculty'} />;
      default:
        return renderAdminDashboard();
    }
  };

  return (
    <>
      <div className="min-h-screen bg-[#f3f6fb]">
        <header className="fixed inset-x-0 top-0 z-40 border-b border-[#dbe4ee] bg-white/94 backdrop-blur-xl shadow-[0_14px_32px_-28px_rgba(15,23,42,0.22)]">
          <div className="mx-auto flex max-w-[1640px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => setIsSidebarOpen((current) => !current)}
                className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[18px] border border-[#d7e4f0] bg-white text-[#123a66] shadow-[0_14px_28px_-24px_rgba(15,23,42,0.26)] transition hover:border-[#afd8ee] hover:bg-[#f7fbff]"
                aria-label="Toggle sidebar navigation"
              >
                <Menu size={22} />
              </button>

              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[18px] bg-[linear-gradient(145deg,#08284d,#1aa5df)] shadow-[0_18px_35px_-24px_rgba(8,44,86,0.4)]">
                  <img
                    src="/alpha-logo.png"
                    alt="Alpha Grew logo"
                    className="h-9 w-9 object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold uppercase tracking-[0.26em] text-[#4d6d8f]">
                    {campusPortalLabels[user.role]}
                  </p>
                  <h1 className="mt-1 truncate text-lg font-bold text-[#0a2848] sm:text-xl">
                    {activeNavLabel}
                  </h1>
                </div>
              </div>

              <div
                className="hidden min-w-0 items-center gap-2.5 rounded-[14px] border border-[#d5e4f2] bg-[#f8fbff] py-1.5 pl-1.5 pr-3 lg:flex"
                title={institutionCode ? `${institutionName} (${institutionCode})` : institutionName}
              >
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] bg-[#e6f1fb] text-xs font-bold text-[#0b4d88]">
                  {institutionInitials}
                </span>
                <span className="min-w-0">
                  <span className="block max-w-[240px] truncate text-sm font-semibold text-[#0a2342]">{institutionName}</span>
                  {institutionCode ? (
                    <span className="block text-xs text-[#4d6d8f]">Institution code {institutionCode}</span>
                  ) : null}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative" ref={calendarRef}>
                <button
                  type="button"
                  onClick={() => {
                    setCalendarMonth(new Date(selectedCalendarDate.getFullYear(), selectedCalendarDate.getMonth(), 1));
                    setIsCalendarOpen((current) => !current);
                  }}
                  className="inline-flex items-center gap-2 rounded-[18px] border border-[#d9e3ed] bg-white px-3 py-2.5 text-sm font-semibold text-[#123a66] shadow-[0_14px_28px_-24px_rgba(15,23,42,0.14)] transition hover:bg-[#f7fbff] sm:px-4 sm:py-3"
                >
                  <CalendarDays size={16} className="text-[#1a9be2]" />
                  <span>{headerDateLabel}</span>
                </button>

                <AnimatePresence>
                  {isCalendarOpen ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.98 }}
                      className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[310px] rounded-[18px] border border-[#dfe7f0] bg-white p-4 shadow-[0_24px_48px_-30px_rgba(15,23,42,0.35)]"
                    >
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() =>
                            setCalendarMonth(
                              (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1),
                            )
                          }
                          className="inline-flex h-9 w-9 items-center justify-center rounded-[18px] border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                          aria-label="Previous month"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-slate-950">{calendarMonthLabel}</p>
                          <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                            {headerDateLongLabel}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setCalendarMonth(
                              (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1),
                            )
                          }
                          className="inline-flex h-9 w-9 items-center justify-center rounded-[18px] border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                          aria-label="Next month"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>

                      <div className="mt-4 grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        {calendarWeekdays.map((day) => (
                          <span key={day}>{day}</span>
                        ))}
                      </div>

                      <div className="mt-3 grid grid-cols-7 gap-2">
                        {calendarGrid.map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => {
                              setSelectedCalendarDate(item.date);
                              setCalendarMonth(new Date(item.date.getFullYear(), item.date.getMonth(), 1));
                              setIsCalendarOpen(false);
                            }}
                            className={classNames(
                              'flex h-10 items-center justify-center rounded-[18px] text-sm font-semibold transition',
                              item.isSelected
                                ? 'bg-[linear-gradient(135deg,#08284d,#1aa5df)] text-white shadow-[0_16px_26px_-20px_rgba(8,44,86,0.45)]'
                                : item.isCurrentMonth
                                  ? 'text-slate-700 hover:bg-slate-100'
                                  : 'text-slate-300 hover:bg-slate-50',
                              item.isToday && !item.isSelected && 'border border-[#b5d8ef]',
                            )}
                          >
                            {item.date.getDate()}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              <div className="flex items-center">
                <AnimatePresence initial={false}>
                  {isHeaderSearchOpen ? (
                    <motion.div
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 220, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mr-2 overflow-hidden"
                    >
                      <div className="flex h-10 items-center border-b-2 border-[#9ccdea] bg-transparent px-1">
                        <input
                          autoFocus
                          value={headerSearch}
                          onChange={(event) => setHeaderSearch(event.target.value)}
                          placeholder={headerSearchPlaceholder[activeTab] ?? 'Search workspace'}
                          className="w-full bg-transparent px-2 text-sm font-medium text-[#123a66] outline-none placeholder:text-[#7f9ab5]"
                        />
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <button
                  type="button"
                  onClick={() => setIsHeaderSearchOpen((current) => !current)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-[18px] border border-[#d9e3ed] bg-white text-[#123a66] transition hover:bg-[#f7fbff]"
                  aria-label="Search"
                >
                  <Search size={18} />
                </button>
              </div>
              <div className="relative" ref={notificationRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    setIsNotificationOpen((current) => !current);
                  }}
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-[18px] border border-[#d9e3ed] bg-white text-[#123a66] transition hover:bg-[#f7fbff]"
                  aria-label="Notifications"
                  aria-expanded={isNotificationOpen}
                >
                  <Bell size={18} />
                  {activityFeed.length ? (
                    <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff7a5c] px-1 text-[10px] font-bold text-white">
                      {activityFeed.length}
                    </span>
                  ) : null}
                </button>

                {isNotificationOpen ? (
                  <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-[18px] border border-[#dfe7f0] bg-white p-4 shadow-[0_24px_48px_-30px_rgba(15,23,42,0.35)]">
                    <div className="flex items-center justify-between gap-3 border-b border-[#edf2f7] pb-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">User activity</p>
                        <h3 className="mt-1 text-lg font-bold text-slate-950">Live updates</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsNotificationOpen(false);
                          handleNavSelection('activity');
                        }}
                        className="rounded-[18px] border border-[#dce7f1] bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#133b67] transition hover:bg-[#f8fbff]"
                      >
                        Open
                      </button>
                    </div>

                    <div className="mt-4 space-y-3">
                      {activityFeed.length ? (
                        activityFeed.map((announcement) => (
                          <div key={announcement.id} className="flex gap-3 rounded-[18px] border border-[#edf2f7] bg-[#f8fafc] px-3 py-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-[18px] bg-[#e8f5ff] text-[#18a2da]">
                              <Bell size={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <p className="line-clamp-1 font-semibold text-slate-950">{announcement.title}</p>
                                <span className={classNames('rounded-full px-2 py-1 text-[10px] font-semibold', statusTone(announcement.priority))}>
                                  {announcement.priority}
                                </span>
                              </div>
                              <p className="mt-1 line-clamp-2 text-sm text-slate-500">{announcement.summary}</p>
                              <div className="mt-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                <span>{announcement.postedBy}</span>
                                <span>{formatDate(announcement.date)}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-[18px] border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                          No live updates right now.
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
              <span
                className={classNames(
                  'hidden rounded-full px-3 py-1.5 text-xs font-semibold md:inline-flex',
                  roleChipTone[user.role],
                )}
              >
                {campusRoleLabels[user.role]}
              </span>
              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen((current) => !current)}
                  className="inline-flex items-center gap-3 rounded-[18px] border border-[#d9e3ed] bg-white px-2 py-2 pr-3 text-left text-[#123a66] shadow-[0_14px_28px_-24px_rgba(15,23,42,0.14)] transition hover:bg-[#f7fbff]"
                  aria-haspopup="menu"
                  aria-expanded={isProfileMenuOpen}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#08284d,#1aa5df)] text-sm font-bold text-white shadow-[0_16px_30px_-22px_rgba(8,44,86,0.32)]">
                    {userInitials}
                  </span>
                  <span className="hidden min-w-0 sm:block">
                    <span className="block truncate text-sm font-semibold text-[#0a2848]">{user.name}</span>
                    <span className="block truncate text-xs text-[#6a87a4]">{user.title}</span>
                  </span>
                  <ChevronDown
                    size={16}
                    className={classNames('text-[#6a87a4] transition-transform', isProfileMenuOpen && 'rotate-180')}
                  />
                </button>

                {isProfileMenuOpen ? (
                  <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-56 rounded-[18px] border border-[#dfe7f0] bg-white p-2 shadow-[0_24px_48px_-30px_rgba(15,23,42,0.35)]">
                    <button
                      type="button"
                      onClick={() => handleNavSelection('profile')}
                      className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left text-sm font-semibold text-[#123a66] transition hover:bg-[#f4f9ff]"
                    >
                      <UserCircle2 size={18} className="text-[#1a9be2]" />
                      Profile
                    </button>
                    <button
                      type="button"
                      onClick={openProfileEditor}
                      className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left text-sm font-semibold text-[#123a66] transition hover:bg-[#f4f9ff]"
                    >
                      <Pencil size={18} className="text-[#1a9be2]" />
                      Edit profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        void onLogout();
                      }}
                      className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left text-sm font-semibold text-[#123a66] transition hover:bg-[#f4f9ff]"
                    >
                      <LogOut size={18} className="text-[#1a9be2]" />
                      Sign out
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <div
          className={classNames(
            'fixed inset-0 z-30 bg-[#082c56]/28 backdrop-blur-[2px] transition lg:hidden',
            isSidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
          onClick={() => setIsSidebarOpen(false)}
        />

        <div className="mx-auto max-w-[1640px] px-4 pb-6 pt-[100px] sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row">
            <aside
              className={classNames(
                'fixed left-4 top-[88px] z-40 h-[calc(100vh-104px)] w-[262px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-blue-700 bg-blue-600 p-4 shadow-md transition-transform duration-300 [scrollbar-width:none] [&::-webkit-scrollbar]:w-0 lg:sticky lg:top-[100px] lg:h-[calc(100vh-116px)] lg:max-w-none lg:flex-shrink-0 flex flex-col',
                isSidebarOpen ? 'translate-x-0' : '-translate-x-[120%] lg:hidden',
              )}
            >
              <div className="mb-3 flex justify-end lg:hidden flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/12 bg-white/10 text-white transition hover:bg-white/16"
                  aria-label="Close sidebar navigation"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Profile Card on Top */}
              <div className="mb-4 rounded-xl border border-white/10 bg-white/10 p-3 flex items-center gap-3 flex-shrink-0">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/20 font-bold text-white uppercase text-sm border border-white/25">
                  {userInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-bold text-white leading-snug">{user.name}</h3>
                  <p className="truncate text-[10px] text-white/70 font-medium capitalize tracking-wider leading-none mt-0.5">{user.role}</p>
                </div>
              </div>

              {/* Navigation List */}
              <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:w-0">
                <div className="space-y-2">
                  {groupedSidebarNav.map((group) => {
                    const isOpen = sidebarDropdowns[group.id];
                    const hasActiveItem = group.items.some((item) => item.id === activeTab);

                    return (
                      <div key={group.id} className="rounded-xl border border-white/5 bg-white/5 p-1 shadow-sm">
                        <button
                          type="button"
                          onClick={() =>
                            setSidebarDropdowns((current) => ({
                              ...current,
                              [group.id]: !current[group.id],
                            }))
                          }
                          className={classNames(
                            'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-bold transition',
                            hasActiveItem ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white',
                          )}
                        >
                          <span className="flex-1 text-[10px] font-bold uppercase tracking-wider text-white/90">
                            {group.label}
                          </span>
                          <ChevronDown
                            size={14}
                            className={classNames('flex-shrink-0 text-white/80 transition-transform', isOpen ? 'rotate-180' : '')}
                          />
                        </button>

                        {isOpen ? (
                          <div className="mt-1 space-y-0.5">
                            {group.items.map((item) => {
                              const isLocked = isPhase1LockedTab(item.id);

                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => handleNavSelection(item.id)}
                                  disabled={isLocked}
                                  title={isLocked ? 'Complete Phase 1 setup to unlock this module.' : item.label}
                                  className={classNames(
                                    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition',
                                    activeTab === item.id
                                      ? 'bg-white text-blue-600 shadow-sm'
                                      : isLocked
                                        ? 'cursor-not-allowed bg-transparent text-white/30'
                                        : 'bg-transparent text-white/80 hover:bg-white/10 hover:text-white',
                                  )}
                                >
                                  <span
                                    className={classNames(
                                      'flex h-6 w-6 items-center justify-center rounded-md',
                                      activeTab === item.id ? 'bg-blue-50 text-blue-600' : 'bg-white/10 text-white',
                                    )}
                                  >
                                    <item.icon size={14} />
                                  </span>
                                  <span className="flex-1 truncate">{item.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </aside>

            <main className="min-w-0 flex-1 space-y-5">
              {isAdminRole(user.role) && !isPhase1Complete ? (
                <div className="rounded-[18px] border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900 shadow-[0_14px_28px_-24px_rgba(217,119,6,0.35)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Phase 1 Setup</p>
                  <p className="mt-2 text-sm">
                    Complete the foundation first before academic, reporting, and placement modules unlock.
                  </p>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div className={classNames('rounded-[12px] px-3 py-2', phase1Status.departments ? 'bg-emerald-100 text-emerald-800' : 'bg-white text-amber-900')}>
                      {phase1Status.departments ? 'Done' : 'Pending'}: Departments
                    </div>
                    <div className={classNames('rounded-[12px] px-3 py-2', phase1Status.courses ? 'bg-emerald-100 text-emerald-800' : 'bg-white text-amber-900')}>
                      {phase1Status.courses ? 'Done' : 'Pending'}: Courses
                    </div>
                    <div className={classNames('rounded-[12px] px-3 py-2', phase1Status.staffAndDesignations ? 'bg-emerald-100 text-emerald-800' : 'bg-white text-amber-900')}>
                      {phase1Status.staffAndDesignations ? 'Done' : 'Pending'}: Staff + Designations
                    </div>
                    <div className={classNames('rounded-[12px] px-3 py-2', phase1Status.students ? 'bg-emerald-100 text-emerald-800' : 'bg-white text-amber-900')}>
                      {phase1Status.students ? 'Done' : 'Pending'}: Students
                    </div>
                  </div>
                </div>
              ) : null}

              {phase1Notice ? (
                <div className="rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                  {phase1Notice}
                </div>
              ) : null}

              {credentialNotice ? (
                <div className="rounded-[18px] border border-[#cfe6f3] bg-[linear-gradient(135deg,#eff8ff,#f7fcff)] px-5 py-5 text-[#123a66] shadow-[0_18px_35px_-30px_rgba(15,23,42,0.18)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6b8aa5]">
                        {credentialNotice.label}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-4 text-sm">
                        <span>
                          Email: <strong>{credentialNotice.email}</strong>
                        </span>
                        <span>
                          Password: <strong>{credentialNotice.password}</strong>
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-[#6b8aa5]">
                        Share these credentials with the student or staff member so they can sign in.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          void navigator.clipboard?.writeText(
                            `Email: ${credentialNotice.email}\nPassword: ${credentialNotice.password}`,
                          );
                        }}
                        className="inline-flex items-center gap-2 rounded-[18px] border border-[#c6dceb] px-4 py-3 text-sm font-semibold text-[#123a66] transition hover:bg-white"
                      >
                        Copy
                      </button>
                      <button
                        type="button"
                        onClick={() => setCredentialNotice(null)}
                        className="inline-flex items-center gap-2 rounded-[18px] bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {error ? (
                <div className="rounded-[18px] border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
                  {error}
                </div>
              ) : null}

              <AnimatePresence mode="wait">
                <motion.div
                  key={`${user.role}-${activeTab}-${tenantError?.status ?? 'ok'}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.22 }}
                >
                  {tenantError ? (
                    <div className="py-10">
                      <TenantState
                        status={tenantError.status}
                        message={tenantError.message}
                        institutionName={user.institution?.name ?? campusBrand.campusName}
                        actionLabel="Go back"
                        onAction={() => onDismissTenantError?.()}
                      />
                    </div>
                  ) : (
                    renderTabContent()
                  )}
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
        </div>
      </div>

      <>
        <Modal
          open={deleteIntent !== null}
          title={deleteIntent?.title ?? 'Delete item?'}
          description={
            deleteIntent?.description ??
            'This will remove the selected record from the workspace. Please confirm before continuing.'
          }
          onClose={closeDeleteModal}
          compact
        >
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={closeDeleteModal}
              disabled={isDeleteSubmitting}
              className="rounded-[16px] border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={isDeleteSubmitting}
              className="rounded-[16px] bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
            >
              {isDeleteSubmitting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </Modal>

        <Modal
          open={showStudentModal}
          title={editingStudent ? 'Edit student' : 'Add student'}
          description={
            editingStudent
              ? 'Update this student record without leaving the workspace.'
              : 'Create a new student record to enrich the demo and show a realistic admin flow.'
          }
          onClose={closeStudentModal}
        >
          <form onSubmit={submitStudent} className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Full name</span>
              <input
                required
                value={studentDraft.name}
                onChange={(event) => setStudentDraft((current) => ({ ...current, name: event.target.value }))}
                className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Email</span>
              <input
                required
                type="email"
                value={studentDraft.email}
                onChange={(event) => setStudentDraft((current) => ({ ...current, email: event.target.value }))}
                className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Department</span>
              <select
                value={studentDraft.departmentCode}
                onChange={(event) => setStudentDraft((current) => ({ ...current, departmentCode: event.target.value }))}
                disabled={user.role === 'staff'}
                className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                {data.departments.map((department) => (
                  <option key={department.code} value={department.code}>
                    {department.code}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Year</span>
              <select
                value={studentDraft.year}
                onChange={(event) => setStudentDraft((current) => ({ ...current, year: event.target.value }))}
                className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              >
                <option>1st Year</option>
                <option>2nd Year</option>
                <option>3rd Year</option>
                <option>4th Year</option>
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>CGPA</span>
              <input
                required
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={studentDraft.cgpa}
                onChange={(event) => setStudentDraft((current) => ({ ...current, cgpa: event.target.value }))}
                className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Attendance %</span>
              <input
                required
                type="number"
                min="0"
                max="100"
                value={studentDraft.attendance}
                onChange={(event) => setStudentDraft((current) => ({ ...current, attendance: event.target.value }))}
                className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Phone</span>
              <input
                value={studentDraft.phone}
                onChange={(event) => setStudentDraft((current) => ({ ...current, phone: event.target.value }))}
                className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Fee status</span>
              <select
                value={studentDraft.feeStatus}
                onChange={(event) => setStudentDraft((current) => ({ ...current, feeStatus: event.target.value as FeeStatus }))}
                className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              >
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>{editingStudent ? 'New password' : 'Password'}</span>
              <input
                type="text"
                required={!editingStudent}
                value={studentDraft.password}
                onChange={(event) => setStudentDraft((current) => ({ ...current, password: event.target.value }))}
                placeholder={editingStudent ? 'Leave blank to keep the current password' : 'Create a login password'}
                className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
              <span>Skills</span>
              <input
                value={studentDraft.skills}
                onChange={(event) => setStudentDraft((current) => ({ ...current, skills: event.target.value }))}
                placeholder="React, SQL, Communication"
                className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <p className="text-sm leading-6 text-slate-500 md:col-span-2">
              After saving, the workspace will show the student login details so you can share them immediately.
            </p>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-[18px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {editingStudent ? 'Update student' : 'Save student'}
              </button>
            </div>
          </form>
        </Modal>

        <Modal
          open={showDepartmentModal}
          title={editingDepartment ? 'Edit department' : 'Add department'}
          description={
            editingDepartment
              ? 'Update the department details shown across reports and student records.'
              : 'Create a new academic department and assign a Head of Department (HOD) from existing staff. The selected staff member will automatically be assigned the HOD designation.'
          }
          onClose={closeDepartmentModal}
        >
          <form onSubmit={submitDepartment} className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Department name</span>
              <input
                required
                value={departmentDraft.name}
                onChange={(event) => setDepartmentDraft((current) => ({ ...current, name: event.target.value }))}
                className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Code</span>
              <input
                required
                value={departmentDraft.code}
                onChange={(event) => setDepartmentDraft((current) => ({ ...current, code: event.target.value }))}
                className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 uppercase outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>HOD</span>
              <select
                required
                value={departmentDraft.hod}
                onChange={(event) => setDepartmentDraft((current) => ({ ...current, hod: event.target.value }))}
                className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Select HOD (staff designation will be updated automatically)</option>
                {data.users
                  .filter((user) => user.role === 'staff')
                  .map((staff) => (
                    <option key={staff.id} value={staff.name}>
                      {staff.name} ({staff.email})
                    </option>
                  ))}
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
              <span>Description</span>
              <textarea
                value={departmentDraft.description}
                onChange={(event) => setDepartmentDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder="Department description"
                className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                rows={3}
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Staff count</span>
              <input
                required
                type="number"
                value={departmentDraft.staffCount}
                onChange={(event) => setDepartmentDraft((current) => ({ ...current, staffCount: event.target.value }))}
                className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Intake</span>
              <input
                required
                type="number"
                value={departmentDraft.intake}
                onChange={(event) => setDepartmentDraft((current) => ({ ...current, intake: event.target.value }))}
                className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-[18px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {editingDepartment ? 'Update department' : 'Save department'}
              </button>
            </div>
          </form>
        </Modal>

        <Modal
          open={showCompanyModal}
          title={editingCompany ? 'Edit company drive' : 'Add company drive'}
          description={
            editingCompany
              ? 'Update the drive details, timeline, or eligible departments.'
              : 'Create a new placement or internship drive so the placement module stays convincing.'
          }
          onClose={closeCompanyModal}
        >
          <form onSubmit={submitCompany} className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Company name</span>
              <input
                required
                value={companyDraft.name}
                onChange={(event) => setCompanyDraft((current) => ({ ...current, name: event.target.value }))}
                className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Role</span>
              <input
                required
                value={companyDraft.role}
                onChange={(event) => setCompanyDraft((current) => ({ ...current, role: event.target.value }))}
                className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Package</span>
              <input
                required
                value={companyDraft.packageOffered}
                onChange={(event) => setCompanyDraft((current) => ({ ...current, packageOffered: event.target.value }))}
                className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Drive date</span>
              <input
                required
                type="date"
                value={companyDraft.driveDate}
                onChange={(event) => setCompanyDraft((current) => ({ ...current, driveDate: event.target.value }))}
                className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Status</span>
              <select
                value={companyDraft.status}
                onChange={(event) => setCompanyDraft((current) => ({ ...current, status: event.target.value as CompanyStatus }))}
                className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              >
                <option value="Upcoming">Upcoming</option>
                <option value="Open">Open</option>
                <option value="Closing Soon">Closing Soon</option>
                <option value="Closed">Closed</option>
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Location</span>
              <input
                required
                value={companyDraft.location}
                onChange={(event) => setCompanyDraft((current) => ({ ...current, location: event.target.value }))}
                className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Type</span>
              <select
                value={companyDraft.type}
                onChange={(event) => setCompanyDraft((current) => ({ ...current, type: event.target.value as CompanyType }))}
                className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              >
                <option value="Placement">Placement</option>
                <option value="Internship">Internship</option>
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
              <span>Eligible departments</span>
              <input
                required
                value={companyDraft.eligibleDepartments}
                onChange={(event) => setCompanyDraft((current) => ({ ...current, eligibleDepartments: event.target.value }))}
                placeholder="CSE, ECE"
                className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-[18px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {editingCompany ? 'Update company drive' : 'Save company drive'}
              </button>
            </div>
          </form>
        </Modal>

        <Modal
          open={showAnnouncementModal}
          title={editingAnnouncement ? 'Edit announcement' : 'Add announcement'}
          description={
            editingAnnouncement
              ? 'Revise this announcement without creating a duplicate post.'
              : 'Publish a new announcement to keep the demo dashboard feeling active and realistic.'
          }
          onClose={closeAnnouncementModal}
        >
          <form onSubmit={submitAnnouncement} className="grid gap-4">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Title</span>
              <input
                required
                value={announcementDraft.title}
                onChange={(event) => setAnnouncementDraft((current) => ({ ...current, title: event.target.value }))}
                className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Summary</span>
              <textarea
                required
                rows={4}
                value={announcementDraft.summary}
                onChange={(event) => setAnnouncementDraft((current) => ({ ...current, summary: event.target.value }))}
                className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Audience</span>
                <select
                  value={announcementDraft.audience}
                  onChange={(event) => setAnnouncementDraft((current) => ({ ...current, audience: event.target.value as AnnouncementAudience }))}
                  className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                >
                  <option value="All">All</option>
                  <option value="Students">Students</option>
                  <option value="Staff">Staff</option>
                  <option value="Admin">Admin</option>
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Priority</span>
                <select
                  value={announcementDraft.priority}
                  onChange={(event) => setAnnouncementDraft((current) => ({ ...current, priority: event.target.value as AnnouncementPriority }))}
                  className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Category</span>
                <input
                  required
                  value={announcementDraft.category}
                  onChange={(event) => setAnnouncementDraft((current) => ({ ...current, category: event.target.value }))}
                  className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </label>
            </div>
            <div>
              <button
                type="submit"
                className="rounded-[18px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {editingAnnouncement ? 'Update announcement' : 'Save announcement'}
              </button>
            </div>
          </form>
        </Modal>

        <Modal
          open={showMasterModal}
          title={editingMaster ? 'Edit master value' : 'Add master value'}
          description={
            editingMaster
              ? 'Update this shared lookup value without leaving the admin workspace.'
              : 'Create a live master value for student, placement, payment, or announcement records.'
          }
          onClose={closeMasterModal}
        >
          <form onSubmit={submitMaster} className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Category</span>
                <select
                  value={masterDraft.category}
                  onChange={(event) => {
                    const category = event.target.value as CampusMasterCategory;
                    setActiveMasterCategory(category);
                    setMasterDraft({
                      category,
                      label: '',
                      description: '',
                      sortOrder: String(masterOptions(category).length + 1),
                    });
                  }}
                  disabled={Boolean(editingMaster)}
                  className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  {(Object.entries(campusMasterCategoryLabels) as Array<[CampusMasterCategory, string]>).map(([category, label]) => (
                    <option key={category} value={category}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Sort order</span>
                <input
                  required
                  type="number"
                  min="1"
                  value={masterDraft.sortOrder}
                  onChange={(event) => setMasterDraft((current) => ({ ...current, sortOrder: event.target.value }))}
                  className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </label>
            </div>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Label</span>
              <input
                required
                value={masterDraft.label}
                onChange={(event) => setMasterDraft((current) => ({ ...current, label: event.target.value }))}
                placeholder="Placement Ready"
                className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Description</span>
              <textarea
                rows={3}
                value={masterDraft.description}
                onChange={(event) => setMasterDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder="Optional detail shown in the masters table."
                className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <div>
              <button
                type="submit"
                className="rounded-[18px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {editingMaster ? 'Update master value' : 'Save master value'}
              </button>
            </div>
          </form>
        </Modal>

        <Modal
          open={showDesignationModal}
          title={editingDesignation ? 'Edit designation' : 'Add designation'}
          description={
            editingDesignation
              ? 'Update the designation name, description, or access modules for linked staff.'
              : 'Create a reusable designation so staff accounts can inherit the right module access instantly.'
          }
          onClose={closeDesignationModal}
        >
          <form onSubmit={submitDesignation} className="grid gap-4">
            <div className="flex gap-2 border-b border-slate-200 pb-2 sticky top-0 bg-white">
              {[
                { key: 'details' as const, label: 'Basic Details' },
                { key: 'access' as const, label: 'Module Access' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setDesignationModalTab(tab.key)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    designationModalTab === tab.key
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {designationModalTab === 'details' && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    <span>Designation name</span>
                    <input
                      required
                      value={designationDraft.name}
                      onChange={(event) => setDesignationDraft((current) => ({ ...current, name: event.target.value }))}
                      className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    <span>Department</span>
                    <select
                      value={designationDraft.departmentCode}
                      onChange={(event) => setDesignationDraft((current) => ({ ...current, departmentCode: event.target.value }))}
                      className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    >
                      {data.departments.map((department) => (
                        <option key={department.id} value={department.code}>
                          {department.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Description</span>
                  <textarea
                    rows={3}
                    value={designationDraft.description}
                    onChange={(event) => setDesignationDraft((current) => ({ ...current, description: event.target.value }))}
                    className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </label>
              </>
            )}

            {designationModalTab === 'access' && (
              <div className="space-y-4">
                <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Configure module access</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Staff with this designation will inherit these module permissions.
                  </p>
                </div>
                <label className="flex cursor-pointer items-center gap-3 rounded-[18px] border border-slate-200 bg-white p-4 transition hover:border-slate-300">
                  <input
                    type="checkbox"
                    checked={allDesignationPermissionsSelected}
                    ref={(input) => {
                      if (input) {
                        input.indeterminate = hasPartialDesignationPermissionsSelected;
                      }
                    }}
                    onChange={toggleAllDesignationPermissions}
                    className="h-5 w-5"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Select all modules</p>
                    <p className="text-xs text-slate-500">Enable or clear all module permissions in one click.</p>
                  </div>
                </label>
                <div className="grid gap-3 md:grid-cols-2">
                  {campusStaffAssignablePermissions.map((permission) => {
                    const isActive = designationDraft.permissions.includes(permission);
                    return (
                      <label
                        key={permission}
                        className={`flex cursor-pointer items-start gap-3 rounded-[18px] border-2 p-4 transition ${
                          isActive
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={() => toggleDesignationPermission(permission)}
                          className="mt-0.5 h-5 w-5"
                        />
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{campusPermissionLabels[permission]}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-2 rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                  <p className="w-full text-sm font-semibold text-slate-900">Selected modules:</p>
                  {selectedDesignationPermissions.length ? (
                    selectedDesignationPermissions.map((permission) => (
                      <span key={permission} className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                        {campusPermissionLabels[permission]}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500">No modules selected yet.</span>
                  )}
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                className="rounded-[18px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {editingDesignation ? 'Update designation' : 'Save designation'}
              </button>
            </div>
          </form>
        </Modal>

        <Modal
          open={showStaffModal}
          title={editingStaff ? 'Edit staff account' : 'Add staff account'}
          description={
            editingStaff
              ? 'Update this staff member and optionally reset the login password.'
              : 'Create a new staff account and generate credentials you can share right away.'
          }
          onClose={closeStaffModal}
        >
          <form onSubmit={submitStaff} className="space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-slate-200 pb-2 sticky top-0 bg-white">
              {[
                { key: 'basic' as const, label: 'Basic Info' },
                { key: 'academic' as const, label: 'Academic' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStaffModalTab(tab.key)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    staffModalTab === tab.key
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab 1: Basic Info */}
            {staffModalTab === 'basic' && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2 flex items-start justify-between rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Staff photo</p>
                    <p className="mt-1 text-xs text-slate-500">Upload JPG/PNG up to 5MB.</p>
                    <label className="mt-3 inline-flex cursor-pointer items-center rounded-[14px] border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">
                      Choose image
                      <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={handleStaffImageUpload} className="hidden" />
                    </label>
                  </div>
                  <div className="relative h-20 w-20 overflow-hidden rounded-full border border-slate-300 bg-white">
                    {staffDraft.imageUrl ? (
                      <img src={staffDraft.imageUrl} alt="Staff preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-400">No image</div>
                    )}
                  </div>
                </div>
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span className={staffErrors.name ? 'text-red-600' : ''}>Full name *</span>
                  <input
                    required
                    value={staffDraft.name}
                    onChange={(event) => {
                      setStaffDraft((current) => ({ ...current, name: event.target.value }));
                      if (staffErrors.name) setStaffErrors((e) => ({ ...e, name: '' }));
                    }}
                    placeholder="Enter full name"
                    className={`w-full rounded-[18px] border px-4 py-3 outline-none transition focus:bg-white focus:ring-4 ${
                      staffErrors.name
                        ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-100'
                        : 'border-slate-200 bg-slate-50 focus:border-blue-500 focus:ring-blue-100'
                    }`}
                  />
                  {staffErrors.name && <p className="text-xs font-medium text-red-600">{staffErrors.name}</p>}
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span className={staffErrors.email ? 'text-red-600' : ''}>Email *</span>
                  <input
                    required
                    type="email"
                    value={staffDraft.email}
                    onChange={(event) => {
                      setStaffDraft((current) => ({ ...current, email: event.target.value }));
                      if (staffErrors.email) setStaffErrors((e) => ({ ...e, email: '' }));
                    }}
                    placeholder="Enter email address"
                    className={`w-full rounded-[18px] border px-4 py-3 outline-none transition focus:bg-white focus:ring-4 ${
                      staffErrors.email
                        ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-100'
                        : 'border-slate-200 bg-slate-50 focus:border-blue-500 focus:ring-blue-100'
                    }`}
                  />
                  {staffErrors.email && <p className="text-xs font-medium text-red-600">{staffErrors.email}</p>}
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Phone</span>
                  <input
                    type="tel"
                    value={staffDraft.phone || ''}
                    onChange={(event) => setStaffDraft((current) => ({ ...current, phone: event.target.value }))}
                    placeholder="Enter phone number"
                    className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
                  <span>Communication Address</span>
                  <textarea
                    value={staffDraft.communicationAddress || ''}
                    onChange={(event) => setStaffDraft((current) => ({ ...current, communicationAddress: event.target.value }))}
                    placeholder="Enter communication address"
                    rows={3}
                    className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
                  <span>Permanent Address</span>
                  <textarea
                    value={staffDraft.permanentAddress || ''}
                    onChange={(event) => setStaffDraft((current) => ({ ...current, permanentAddress: event.target.value }))}
                    placeholder="Enter permanent address"
                    rows={3}
                    className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Emergency Contact Person</span>
                  <input
                    type="text"
                    value={staffDraft.emergencyContactPerson || ''}
                    onChange={(event) => setStaffDraft((current) => ({ ...current, emergencyContactPerson: event.target.value }))}
                    placeholder="Contact person name"
                    className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Emergency Contact Number</span>
                  <input
                    type="tel"
                    value={staffDraft.emergencyContactNumber || ''}
                    onChange={(event) => setStaffDraft((current) => ({ ...current, emergencyContactNumber: event.target.value }))}
                    placeholder="Contact phone number"
                    className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </label>
              </div>
            )}

            {/* Tab 2: Academic */}
            {staffModalTab === 'academic' && (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
                  <span className={staffErrors.designationId ? 'text-red-600' : ''}>Designation *</span>
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                    <select
                      required
                      value={staffDraft.designationId}
                      onChange={(event) => {
                        handleStaffDesignationSelection(event.target.value);
                        if (staffErrors.designationId) setStaffErrors((e) => ({ ...e, designationId: '' }));
                      }}
                      className={`w-full rounded-[18px] border px-4 py-3 outline-none transition focus:bg-white focus:ring-4 ${
                        staffErrors.designationId
                          ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-100'
                          : 'border-slate-200 bg-slate-50 focus:border-blue-500 focus:ring-blue-100'
                      }`}
                    >
                      {data.designations.length ? (
                        data.designations.map((designation) => (
                          <option key={designation.id} value={designation.id}>
                            {designation.name}
                          </option>
                        ))
                      ) : (
                        <option value="">No designation available</option>
                      )}
                    </select>
                    <button
                      type="button"
                      onClick={() => openDesignationEditor()}
                      className="rounded-[18px] border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Add designation
                    </button>
                  </div>
                  {staffErrors.designationId && <p className="text-xs font-medium text-red-600">{staffErrors.designationId}</p>}
                </label>
                <div className="md:col-span-2 rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Module access from designation</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Module permissions are configured in Designation and auto-applied to staff.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {extractAssignablePermissions(findDesignationById(staffDraft.designationId)?.permissions ?? []).length ? (
                      extractAssignablePermissions(findDesignationById(staffDraft.designationId)?.permissions ?? []).map((permission) => (
                        <span key={permission} className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                          {campusPermissionLabels[permission]}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500">No modules assigned to this designation yet.</span>
                    )}
                  </div>
                </div>
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span className={staffErrors.departmentCode ? 'text-red-600' : ''}>Department *</span>
                  <select
                    required
                    value={staffDraft.departmentCode}
                    onChange={(event) => {
                      setStaffDraft((current) => ({ ...current, departmentCode: event.target.value }));
                      if (staffErrors.departmentCode) setStaffErrors((e) => ({ ...e, departmentCode: '' }));
                    }}
                    className={`w-full rounded-[18px] border px-4 py-3 outline-none transition focus:bg-white focus:ring-4 ${
                      staffErrors.departmentCode
                        ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-100'
                        : 'border-slate-200 bg-slate-50 focus:border-blue-500 focus:ring-blue-100'
                    }`}
                  >
                    {data.departments.map((department) => (
                      <option key={department.code} value={department.code}>
                        {department.name} ({department.code})
                      </option>
                    ))}
                  </select>
                  {staffErrors.departmentCode && <p className="text-xs font-medium text-red-600">{staffErrors.departmentCode}</p>}
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Experience (Years)</span>
                  <input
                    type="number"
                    value={staffDraft.experience || ''}
                    onChange={(event) => {
                      setStaffDraft((current) => ({ ...current, experience: event.target.value }));
                      if (staffErrors.experience) setStaffErrors((e) => ({ ...e, experience: '' }));
                    }}
                    placeholder="e.g., 5"
                    min="0"
                    className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                  {staffErrors.experience && <p className="text-xs font-medium text-red-600">{staffErrors.experience}</p>}
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Specialization</span>
                  <input
                    type="text"
                    value={staffDraft.specialization || ''}
                    onChange={(event) => setStaffDraft((current) => ({ ...current, specialization: event.target.value }))}
                    placeholder="e.g., AI, Data Science"
                    className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Biometric ID</span>
                  <input
                    type="text"
                    value={staffDraft.biometricId || ''}
                    onChange={(event) => setStaffDraft((current) => ({ ...current, biometricId: event.target.value }))}
                    placeholder="Enter biometric ID"
                    className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
                  <span className={staffErrors.password ? 'text-red-600' : ''}>{editingStaff ? 'New password' : 'Password *'}</span>
                  <input
                    type="text"
                    required={!editingStaff}
                    disabled={!data.designations.length}
                    value={staffDraft.password}
                    onChange={(event) => {
                      setStaffDraft((current) => ({ ...current, password: event.target.value }));
                      if (staffErrors.password) setStaffErrors((e) => ({ ...e, password: '' }));
                    }}
                    placeholder={editingStaff ? 'Leave blank to keep the current password' : 'Create a login password'}
                    className={`w-full rounded-[18px] border px-4 py-3 outline-none transition focus:bg-white focus:ring-4 disabled:opacity-50 ${
                      staffErrors.password
                        ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-100'
                        : 'border-slate-200 bg-slate-50 focus:border-blue-500 focus:ring-blue-100'
                    }`}
                  />
                  {staffErrors.password && <p className="text-xs font-medium text-red-600">{staffErrors.password}</p>}
                  <p className="text-sm leading-6 text-slate-500">
                    Saving with a password will open a share card in the workspace so you can pass the credentials to the staff member.
                  </p>
                </label>
              </div>
            )}

            {/* Tab Navigation Buttons */}
            <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-4 sticky bottom-0 bg-white">
              {staffErrors.form && (
                <p className="text-sm font-medium text-red-600">{staffErrors.form}</p>
              )}
              <button
                type="button"
                onClick={() => {
                  if (staffModalTab === 'academic') setStaffModalTab('basic');
                }}
                disabled={staffModalTab === 'basic'}
                className="flex items-center gap-2 rounded-[18px] border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Go to previous tab"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex gap-2">
                {staffModalTab !== 'academic' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (staffModalTab === 'basic') setStaffModalTab('academic');
                    }}
                    className="rounded-[18px] bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Next
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!data.designations.length}
                  className="rounded-[18px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {editingStaff ? 'Update staff account' : 'Save staff account'}
                </button>
              </div>
            </div>
          </form>
        </Modal>

        <Modal
          open={showProfileModal}
          title="Edit profile"
          description="Update your profile details here. Add a new password only when you want to change your login."
          onClose={closeProfileModal}
        >
          <form onSubmit={submitProfile} className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Full name</span>
              <input
                required
                value={profileDraft.name}
                onChange={(event) => setProfileDraft((current) => ({ ...current, name: event.target.value }))}
                className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Email</span>
              <input
                required
                type="email"
                value={profileDraft.email}
                onChange={(event) => setProfileDraft((current) => ({ ...current, email: event.target.value }))}
                className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
              <span>Title</span>
              <input
                required
                value={profileDraft.title}
                onChange={(event) => setProfileDraft((current) => ({ ...current, title: event.target.value }))}
                className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
              <span>New password</span>
              <input
                type="text"
                value={profileDraft.password}
                onChange={(event) => setProfileDraft((current) => ({ ...current, password: event.target.value }))}
                placeholder="Leave blank to keep the current password"
                className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-[18px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Save profile
              </button>
            </div>
          </form>
        </Modal>
      </>
    </>
  );
}


