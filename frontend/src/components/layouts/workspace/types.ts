/** Props and form-draft types for CampusWorkspace. */
import { LayoutDashboard } from 'lucide-react';
import type { CustomFieldValues } from '../../../api/customFieldsApi';
import type {
  AnnouncementAudience,
  AnnouncementPriority,
  CampusData,
  CampusMasterCategory,
  CampusPermission,
  CampusSession,
  CampusStudentResume,
  TenantError,
  CompanyStatus,
  CompanyType,
  FeeStatus,
} from '../../../campusTypes';

export interface CampusWorkspaceProps {
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
    customFields?: CustomFieldValues;
  }) => Promise<void> | void;
  onUpdateDesignation: (
    designationId: number,
    payload: {
      name: string;
      departmentCode?: string;
      description?: string;
      permissions: CampusPermission[];
      customFields?: CustomFieldValues;
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
    customFields?: CustomFieldValues;
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
      customFields?: CustomFieldValues;
    },
  ) => Promise<void> | void;
  onDeleteStaff: (staffId: number) => Promise<void> | void;
  onApplyToCompany: (companyId: number) => Promise<void> | void;
}

export type StudentDraft = {
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

export type DepartmentDraft = {
  name: string;
  code: string;
  hod: string;
  description: string;
  staffCount: string;
  intake: string;
};

export type CompanyDraft = {
  name: string;
  role: string;
  packageOffered: string;
  driveDate: string;
  status: CompanyStatus;
  location: string;
  type: CompanyType;
  eligibleDepartments: string;
};

export type AnnouncementDraft = {
  title: string;
  summary: string;
  audience: AnnouncementAudience;
  priority: AnnouncementPriority;
  category: string;
};

export type StaffDraft = {
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

export type DesignationDraft = {
  name: string;
  departmentCode: string;
  description: string;
  permissions: CampusPermission[];
};

export type MasterDraft = {
  category: CampusMasterCategory;
  label: string;
  description: string;
  sortOrder: string;
};

export type ProfileDraft = {
  name: string;
  email: string;
  title: string;
  password: string;
};

export type DeleteIntent =
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

export type NavItem = {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission: CampusPermission;
};

export type SidebarNavGroup = {
  id: string;
  label: string;
  itemIds: string[];
};

export type CardTone = 'navy' | 'sky' | 'teal' | 'amber' | 'indigo' | 'emerald';

// Header role chip colours from documentation/frontend/roles-tenancy-design.md (D5).
