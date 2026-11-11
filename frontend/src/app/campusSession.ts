/**
 * Campus session and data helpers used by App: storage keys, the initial dataset (demo data
 * is kept in localStorage; live records never are), the stored sign-in, and dataset normalising.
 */
import { createCampusDemoData, departmentAccentByCode, getDepartmentAccent } from '../campusDemoData';
import { type DemoAccount } from '../components/auth';
import {
  campusDefaultDesignations,
  campusDefaultMasters,
  campusRolePermissions,
  campusStaffAssignablePermissions,
  isInstitutionStaffRole,
  normalizeCampusMasterValue,
  normalizeCampusRole,
  normalizeCampusStudentResume,
  normalizeStaffPermissions,
  type CampusData,
  type CampusPermission,
  type CampusSession,
} from '../campusTypes';
import { AUTH_STORAGE_KEY, LEGACY_TOKEN_STORAGE_KEY } from '../api/core';

export const AUTH_KEY = AUTH_STORAGE_KEY;
export const LEGACY_AUTH_TOKEN_KEY = LEGACY_TOKEN_STORAGE_KEY;
export const DATA_KEY = 'chromolog-campus-data';

export type StoredAuth = {
  token?: string;
  user: CampusSession;
};

/** Accounts created by backend/database/seeders/CampusDemoSeeder.php. */
export const apiDemoAccounts: DemoAccount[] = [
  { email: 'admin@demo.com', role: 'institution_admin', label: 'Institution Admin' },
  { email: 'placement@demo.com', role: 'placement_officer', label: 'Placement Officer' },
  { email: 'staff@demo.com', role: 'staff', label: 'Staff' },
  { email: 'student@demo.com', role: 'student', label: 'Student' },
];

export const SESSION_EXPIRED_NOTICE = 'Your session has expired. Sign in again to continue.';

export function slugifyDesignation(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function slugifyMasterCode(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function upsertById<T extends { id: number }>(items: T[], record: T): T[] {
  return items.some((item) => item.id === record.id)
    ? items.map((item) => (item.id === record.id ? record : item))
    : [...items, record];
}

export function extractAssignablePermissions(permissions: CampusPermission[]) {
  return normalizeStaffPermissions(permissions).filter((permission) => campusStaffAssignablePermissions.includes(permission));
}

export function applyBrandAccents(dataset: CampusData): CampusData {
  const hasPersistedMasters = Array.isArray((dataset as Partial<CampusData>).masters);
  const masters = (hasPersistedMasters ? dataset.masters : campusDefaultMasters)
    .map((master) => ({
      ...master,
      description: master.description ?? '',
    }))
    .sort((left, right) => left.category.localeCompare(right.category) || left.sortOrder - right.sortOrder || left.label.localeCompare(right.label));
  const hasPersistedDesignations = Array.isArray((dataset as Partial<CampusData>).designations);
  const baseDesignations = (hasPersistedDesignations ? dataset.designations : campusDefaultDesignations).map((designation) => ({
    ...designation,
    description: designation.description ?? '',
    permissions: normalizeStaffPermissions(designation.permissions),
  }));
  const designationById = new Map(baseDesignations.map((designation) => [designation.id, designation]));
  const designationByName = new Map(baseDesignations.map((designation) => [designation.name.trim().toLowerCase(), designation]));
  const normalizedUsers = dataset.users.map((account) => {
    if (account.role !== 'staff') {
      const roleDefaults = campusRolePermissions[account.role as keyof typeof campusRolePermissions] ?? [];
      const mergedRolePermissions = Array.from(
        new Set([...(account.permissions ?? []), ...roleDefaults]),
      ) as CampusPermission[];

      return {
        ...account,
        permissions: mergedRolePermissions,
      };
    }

    const designation =
      (account.designationId ? designationById.get(account.designationId) : undefined) ??
      designationByName.get((account.designationName ?? account.title).trim().toLowerCase());

    return {
      ...account,
      title: designation?.name ?? account.title,
      designationId: designation?.id ?? account.designationId,
      designationName: designation?.name ?? account.designationName ?? account.title,
      permissions: normalizeStaffPermissions(account.permissions ?? designation?.permissions ?? []),
    };
  });
  const designations = baseDesignations.map((designation) => ({
    ...designation,
    staffCount: normalizedUsers.filter(
      (account) =>
        isInstitutionStaffRole(account.role) &&
        (account.designationId === designation.id ||
          (account.designationName ?? account.title).trim().toLowerCase() === designation.name.trim().toLowerCase()),
    ).length,
  }));

  return {
    ...dataset,
    masters,
    users: normalizedUsers,
    designations,
    departments: dataset.departments.map((department) => ({
      ...department,
      accent:
        department.code in departmentAccentByCode
          ? getDepartmentAccent(department.code)
          : department.accent || getDepartmentAccent(),
    })),
    students: dataset.students.map((student) => ({
      ...student,
      year: normalizeCampusMasterValue('student_year', student.year, masters) || 'year_1',
      gender: normalizeCampusMasterValue('student_gender', student.gender ?? 'prefer_not_to_say', masters) || 'prefer_not_to_say',
      status: normalizeCampusMasterValue('student_status', student.status, masters) || 'active',
      feeStatus: normalizeCampusMasterValue('payment_status', student.feeStatus, masters) || 'pending',
      resume: normalizeCampusStudentResume(student.resume, student),
    })),
    companies: dataset.companies.map((company) => ({
      ...company,
      status: normalizeCampusMasterValue('company_drive_status', company.status, masters) || 'upcoming',
      type: normalizeCampusMasterValue('company_drive_type', company.type, masters) || 'placement',
    })),
    announcements: dataset.announcements.map((announcement) => ({
      ...announcement,
      audience: normalizeCampusMasterValue('announcement_audience', announcement.audience, masters) || 'all',
      priority: normalizeCampusMasterValue('announcement_priority', announcement.priority, masters) || 'medium',
    })),
  };
}

/**
 * Initial campus data. Only the offline demo keeps its data in localStorage. With the API
 * configured, the dataset holds real student and staff records, so it lives in memory only;
 * any copy saved by an older build is removed here.
 */
export function loadInitialData(apiConfigured: boolean) {
  if (apiConfigured) {
    localStorage.removeItem(DATA_KEY);
    return applyBrandAccents(createCampusDemoData());
  }

  const stored = localStorage.getItem(DATA_KEY);
  if (!stored) {
    return applyBrandAccents(createCampusDemoData());
  }

  try {
    const parsed = JSON.parse(stored) as CampusData;

    return applyBrandAccents({
      ...parsed,
      users: parsed.users.map((account) => ({ ...account, role: normalizeCampusRole(account.role) })),
    });
  } catch {
    return applyBrandAccents(createCampusDemoData());
  }
}

export function loadStoredAuth() {
  const stored = localStorage.getItem(AUTH_KEY);
  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored) as StoredAuth;

    return { ...parsed, user: { ...parsed.user, role: normalizeCampusRole(parsed.user.role) } };
  } catch {
    return null;
  }
}

export function toSessionUser(account: CampusData['users'][number]): CampusSession {
  const { password: _password, permissions, ...session } = account;

  return {
    ...session,
    permissions: permissions ?? campusRolePermissions[account.role],
  };
}
