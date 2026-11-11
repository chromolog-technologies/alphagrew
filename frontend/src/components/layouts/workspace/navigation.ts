/** Workspace navigation: menu items per role, sidebar groups and role chip colours. */
import type { NavItem, SidebarNavGroup } from './types';
import {
  Bell,
  BookOpenCheck,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  Calendar,
  ChartColumn,
  ClipboardList,
  Clock,
  LayoutDashboard,
  Megaphone,
  ShieldCheck,
  Settings,
  UserCircle2,
  Users,
} from 'lucide-react';
import { SlidersHorizontal } from 'lucide-react';
import type { CampusRole } from '../../../campusTypes';

export const roleChipTone: Record<CampusRole, string> = {
  super_admin: 'bg-foreground text-white',
  platform_staff: 'bg-foreground text-white',
  institution_admin: 'bg-primary/10 text-primary',
  placement_officer: 'bg-[#fff4e5] text-[#8a4b00]',
  staff: 'bg-muted text-foreground',
  student: 'bg-[#ecfdf3] text-[#05603a]',
  recruiter: 'bg-muted text-foreground',
};

// Same page sizes as GET /students (per_page up to 100).
export const STUDENTS_PER_PAGE_OPTIONS = [25, 50, 100];

export const baseNavByRole: Record<'admin' | 'staff' | 'student', NavItem[]> = {
  admin: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
    { id: 'activity', label: 'Activity', icon: Bell, permission: 'announcements.view' },
    { id: 'masters', label: 'Masters', icon: BookOpenCheck, permission: 'departments.create' },
    { id: 'departments', label: 'Departments', icon: Building2, permission: 'departments.view' },
    { id: 'courses', label: 'Courses', icon: BookOpen, permission: 'departments.create' },
    { id: 'designations', label: 'Designations', icon: ShieldCheck, permission: 'departments.create' },
    { id: 'staff', label: 'Staff', icon: UserCircle2, permission: 'departments.view' },
    { id: 'students', label: 'Students', icon: Users, permission: 'students.view' },
    { id: 'onboarding', label: 'Onboarding', icon: UserCircle2, permission: 'users.create' },
    { id: 'classes', label: 'Classes', icon: Users, permission: 'departments.create' },
    { id: 'subjects', label: 'Subjects', icon: BookOpen, permission: 'departments.create' },
    { id: 'academic_years', label: 'Academic Years', icon: Calendar, permission: 'departments.create' },
    { id: 'batches', label: 'Batches', icon: Users, permission: 'departments.create' },
    { id: 'campuses', label: 'Campuses', icon: Building2, permission: 'departments.create' },
    { id: 'roles', label: 'Roles & Permissions', icon: ShieldCheck, permission: 'departments.create' },
    { id: 'custom_fields', label: 'Custom Fields', icon: SlidersHorizontal, permission: 'custom_fields.manage' },
    { id: 'attendance', label: 'Attendance', icon: Clock, permission: 'attendance.view' },
    { id: 'timetable', label: 'Timetable', icon: Calendar, permission: 'departments.create' },
    { id: 'exams', label: 'Exams', icon: ClipboardList, permission: 'departments.create' },
    { id: 'marks', label: 'Marks', icon: ChartColumn, permission: 'marks.view' },
    { id: 'fees', label: 'Fees', icon: BriefcaseBusiness, permission: 'departments.create' },
    { id: 'placement', label: 'Placement', icon: BriefcaseBusiness, permission: 'placement.view' },
    { id: 'placement_policy', label: 'Placement Policy', icon: ShieldCheck, permission: 'placement.create' },
    { id: 'student_notifications', label: 'Notifications', icon: Bell, permission: 'profile.view' },
    { id: 'announcements', label: 'Announcements', icon: Megaphone, permission: 'announcements.view' },
    { id: 'reports', label: 'Reports', icon: ChartColumn, permission: 'reports.view' },
    { id: 'settings', label: 'Settings', icon: Settings, permission: 'departments.create' },
    { id: 'audit_log', label: 'Audit Log', icon: ShieldCheck, permission: 'activity.view' },
    { id: 'profile', label: 'Profile', icon: UserCircle2, permission: 'profile.view' },
    { id: 'security', label: 'Sign-in & Security', icon: ShieldCheck, permission: 'profile.view' },
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
    { id: 'student_notifications', label: 'Notifications', icon: Bell, permission: 'profile.view' },
    { id: 'announcements', label: 'Announcements', icon: Megaphone, permission: 'announcements.view' },
    { id: 'reports', label: 'Reports', icon: ChartColumn, permission: 'reports.view' },
    { id: 'profile', label: 'Profile', icon: UserCircle2, permission: 'profile.view' },
    { id: 'security', label: 'Sign-in & Security', icon: ShieldCheck, permission: 'profile.view' },
  ],
  student: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
    { id: 'activity', label: 'Activity', icon: Bell, permission: 'announcements.view' },
    { id: 'timetable', label: 'Timetable', icon: Calendar, permission: 'attendance.view' },
    { id: 'attendance', label: 'Attendance', icon: Clock, permission: 'attendance.view' },
    { id: 'student_assignments', label: 'Materials & Notes', icon: BookOpen, permission: 'attendance.view' },
    { id: 'exams', label: 'Exams', icon: ClipboardList, permission: 'marks.view' },
    { id: 'marks', label: 'Marks', icon: ChartColumn, permission: 'marks.view' },

    { id: 'placement', label: 'Placement', icon: BriefcaseBusiness, permission: 'placement.view' },
    { id: 'student_notifications', label: 'Notifications', icon: Bell, permission: 'profile.view' },
    { id: 'announcements', label: 'Announcements', icon: Megaphone, permission: 'announcements.view' },
    { id: 'profile', label: 'Career & AI Hub', icon: UserCircle2, permission: 'profile.view' },
    { id: 'security', label: 'Sign-in & Security', icon: ShieldCheck, permission: 'profile.view' },
  ],
};

export const navByRole: Record<CampusRole, NavItem[]> = {
  super_admin: baseNavByRole.admin,
  platform_staff: [],
  institution_admin: baseNavByRole.admin,
  placement_officer: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
    { id: 'activity', label: 'Activity', icon: Bell, permission: 'announcements.view' },
    { id: 'students', label: 'Students', icon: Users, permission: 'students.view' },
    { id: 'placement', label: 'Placement', icon: BriefcaseBusiness, permission: 'placement.view' },
    { id: 'placement_policy', label: 'Placement Policy', icon: ShieldCheck, permission: 'placement.create' },
    { id: 'student_notifications', label: 'Notifications', icon: Bell, permission: 'profile.view' },
    { id: 'announcements', label: 'Announcements', icon: Megaphone, permission: 'announcements.view' },
    { id: 'reports', label: 'Reports', icon: ChartColumn, permission: 'reports.view' },
    { id: 'profile', label: 'Profile', icon: UserCircle2, permission: 'profile.view' },
    { id: 'security', label: 'Sign-in & Security', icon: ShieldCheck, permission: 'profile.view' },
  ],
  staff: baseNavByRole.staff,
  student: baseNavByRole.student,
  // Recruiters cannot sign in yet; the recruiter portal is a later phase.
  recruiter: [],
};

/** Every page id any role can open; used to tell "no access" from "no such page". */
export const workspaceTabIds = new Set(Object.values(navByRole).flat().map((item) => item.id));

export const sidebarNavGroups: SidebarNavGroup[] = [
  { id: 'overview', label: 'Overview', itemIds: ['dashboard', 'activity', 'student_notifications'] },
  { id: 'master_data', label: 'Master Data', itemIds: ['masters', 'departments', 'courses', 'designations', 'academic_years', 'batches', 'campuses', 'custom_fields'] },
  { id: 'users_roles', label: 'Users & Roles', itemIds: ['staff', 'students', 'onboarding', 'roles', 'hod_staff_management'] },
  { id: 'academic', label: 'Academic', itemIds: ['classes', 'subjects', 'attendance', 'exams', 'marks', 'fees', 'timetable', 'student_timetable', 'student_assignments'] },

  { id: 'finance', label: 'Finance', itemIds: [] },
  { id: 'placement', label: 'Placement', itemIds: ['placement', 'placement_officer', 'placement_policy'] },
  { id: 'other', label: 'Other', itemIds: ['announcements', 'reports', 'settings', 'audit_log', 'profile', 'security', 'student_notifications', 'department_overview', 'hod_reports', 'exam_coordinator'] },
];
