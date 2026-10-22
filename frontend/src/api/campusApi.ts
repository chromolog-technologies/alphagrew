import type {
  AnnouncementAudience,
  AnnouncementPriority,
  CampusAccount,
  CampusData,
  CampusMasterCategory,
  CampusPermission,
  CampusSession,
  CampusStudent,
  CampusStudentResume,
  CompanyStatus,
  CompanyType,
  FeeStatus,
} from '../campusTypes';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '') ?? '';

export type AuthResponse = {
  token: string;
  user: CampusSession;
  data: CampusData;
};

type BootstrapResponse = {
  user: CampusSession;
  data: CampusData;
};

type ProfileResponse = {
  user: CampusSession;
  data: CampusData;
};

type DataResponse = {
  data: CampusData;
};

export type StudentRecordResponse = {
  student: CampusStudent;
  /** Linked login account; only returned to admins, whose dataset lists other users. */
  user: CampusAccount | null;
};

export type StudentPage = {
  data: CampusStudent[];
  meta: { currentPage: number; perPage: number; total: number; lastPage: number };
};

type StudentPayload = {
  name: string;
  email: string;
  departmentCode?: string;
  year: string;
  gender: string;
  status?: string;
  cgpa: number;
  attendance: number;
  phone?: string;
  feeStatus: FeeStatus;
  password?: string;
  skills: string[];
};

type StaffPayload = {
  name: string;
  email: string;
  designationId: number;
  departmentCode: string;
  password?: string;
  phone?: string;
  communicationAddress?: string;
  permanentAddress?: string;
  emergencyContactPerson?: string;
  emergencyContactNumber?: string;
  biometricId?: string;
  experienceYears?: number;
  specialization?: string;
  imageFile?: File;
  permissions: CampusPermission[];
};

type DesignationPayload = {
  name: string;
  description?: string;
  department_id?: number | null;
  permissions: CampusPermission[];
};

type MasterPayload = {
  category: CampusMasterCategory;
  label: string;
  description?: string;
  sortOrder: number;
};

type DepartmentPayload = {
  name: string;
  code: string;
  hod: string;
  staffCount: number;
  intake: number;
};

type CompanyPayload = {
  name: string;
  role: string;
  packageOffered: string;
  driveDate: string;
  status: CompanyStatus;
  location: string;
  type: CompanyType;
  eligibleDepartments: string[];
};

type AnnouncementPayload = {
  title: string;
  summary: string;
  audience: AnnouncementAudience;
  priority: AnnouncementPriority;
  category: string;
};

type StudentResumePayload = CampusStudentResume;

async function request<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  if (!apiBaseUrl) {
    throw new Error('Campus API is not configured.');
  }

  const isFormData = init?.body instanceof FormData;

  const requestHeaders: HeadersInit = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init?.headers ?? {}),
  };

  if (!isFormData && !(requestHeaders as Record<string, string>)['Content-Type']) {
    (requestHeaders as Record<string, string>)['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: requestHeaders,
  });

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    if (response.status === 401 && token) {
      notifySessionExpired();
    }

    const message =
      (payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
        ? payload.message
        : null) ?? 'API request failed.';
    throw new Error(message);
  }

  return payload as T;
}

/** Fired when the API rejects the stored token (expired or revoked); App signs the user out. */
export const SESSION_EXPIRED_EVENT = 'campus:session-expired';

export function notifySessionExpired() {
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

export function isCampusApiConfigured() {
  return Boolean(apiBaseUrl);
}

export function loginWithCampusApi(email: string, password: string) {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function registerWithCampusApi(payload: {
  name: string;
  email: string;
  password: string;
  institutionCode: string;
  departmentCode: string;
}) {
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateCampusProfile(
  token: string,
  payload: { name: string; email: string; title: string; password?: string },
) {
  return request<ProfileResponse>(
    '/auth/profile',
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function fetchCampusBootstrap(token: string) {
  return request<BootstrapResponse>('/campus/bootstrap', undefined, token);
}

export function logoutFromCampusApi(token: string) {
  return request<{ message: string }>('/auth/logout', { method: 'POST' }, token);
}

export function resetCampusDemo(token: string) {
  return request<BootstrapResponse>('/campus/reset', { method: 'POST' }, token);
}

export function fetchStudentsPage(token: string, page = 1, perPage = 25) {
  return request<StudentPage>(`/students?page=${page}&per_page=${perPage}`, undefined, token);
}

export function createStudentWithCampusApi(token: string, payload: StudentPayload) {
  return request<StudentRecordResponse>(
    '/students',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function updateStudentWithCampusApi(token: string, studentId: number, payload: StudentPayload) {
  return request<StudentRecordResponse>(
    `/students/${studentId}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function updateStudentResumeWithCampusApi(token: string, payload: StudentResumePayload) {
  return request<DataResponse>(
    '/students/me/resume',
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function deleteStudentWithCampusApi(token: string, studentId: number) {
  return request<null>(
    `/students/${studentId}`,
    {
      method: 'DELETE',
    },
    token,
  );
}

export function fetchStaffWithCampusApi(token: string) {
  return request<CampusAccount[]>('/staff', undefined, token);
}

export function createDesignationWithCampusApi(token: string, payload: DesignationPayload) {
  return request<DataResponse>(
    '/designations',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function updateDesignationWithCampusApi(token: string, designationId: number, payload: DesignationPayload) {
  return request<DataResponse>(
    `/designations/${designationId}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function deleteDesignationWithCampusApi(token: string, designationId: number) {
  return request<DataResponse>(
    `/designations/${designationId}`,
    {
      method: 'DELETE',
    },
    token,
  );
}

export function createMasterWithCampusApi(token: string, payload: MasterPayload) {
  return request<DataResponse>(
    '/masters',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function updateMasterWithCampusApi(token: string, masterId: number, payload: MasterPayload) {
  return request<DataResponse>(
    `/masters/${masterId}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function deleteMasterWithCampusApi(token: string, masterId: number) {
  return request<DataResponse>(
    `/masters/${masterId}`,
    {
      method: 'DELETE',
    },
    token,
  );
}

export function createStaffWithCampusApi(token: string, payload: StaffPayload) {
  const body = new FormData();
  body.append('name', payload.name);
  body.append('email', payload.email);
  body.append('designationId', String(payload.designationId));
  body.append('departmentCode', payload.departmentCode);
  if (payload.password) body.append('password', payload.password);
  if (payload.phone) body.append('phone', payload.phone);
  if (payload.communicationAddress) body.append('communicationAddress', payload.communicationAddress);
  if (payload.permanentAddress) body.append('permanentAddress', payload.permanentAddress);
  if (payload.emergencyContactPerson) body.append('emergencyContactPerson', payload.emergencyContactPerson);
  if (payload.emergencyContactNumber) body.append('emergencyContactNumber', payload.emergencyContactNumber);
  if (payload.biometricId) body.append('biometricId', payload.biometricId);
  if (payload.experienceYears !== undefined) body.append('experienceYears', String(payload.experienceYears));
  if (payload.specialization) body.append('specialization', payload.specialization);
  if (payload.imageFile) body.append('image', payload.imageFile);
  payload.permissions.forEach((permission) => body.append('permissions[]', permission));

  return request<DataResponse>(
    '/staff',
    {
      method: 'POST',
      body,
    },
    token,
  );
}

export function updateStaffWithCampusApi(token: string, staffId: number, payload: StaffPayload) {
  const body = new FormData();
  body.append('_method', 'PUT');
  body.append('name', payload.name);
  body.append('email', payload.email);
  body.append('designationId', String(payload.designationId));
  body.append('departmentCode', payload.departmentCode);
  if (payload.password) body.append('password', payload.password);
  if (payload.phone) body.append('phone', payload.phone);
  if (payload.communicationAddress) body.append('communicationAddress', payload.communicationAddress);
  if (payload.permanentAddress) body.append('permanentAddress', payload.permanentAddress);
  if (payload.emergencyContactPerson) body.append('emergencyContactPerson', payload.emergencyContactPerson);
  if (payload.emergencyContactNumber) body.append('emergencyContactNumber', payload.emergencyContactNumber);
  if (payload.biometricId) body.append('biometricId', payload.biometricId);
  if (payload.experienceYears !== undefined) body.append('experienceYears', String(payload.experienceYears));
  if (payload.specialization) body.append('specialization', payload.specialization);
  if (payload.imageFile) body.append('image', payload.imageFile);
  payload.permissions.forEach((permission) => body.append('permissions[]', permission));

  return request<DataResponse>(
    `/staff/${staffId}`,
    {
      method: 'POST',
      body,
    },
    token,
  );
}

export function deleteStaffWithCampusApi(token: string, staffId: number) {
  return request<DataResponse>(
    `/staff/${staffId}`,
    {
      method: 'DELETE',
    },
    token,
  );
}

export function createDepartmentWithCampusApi(token: string, payload: DepartmentPayload) {
  return request<DataResponse>(
    '/departments',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function updateDepartmentWithCampusApi(token: string, departmentId: number, payload: DepartmentPayload) {
  return request<DataResponse>(
    `/departments/${departmentId}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function deleteDepartmentWithCampusApi(token: string, departmentId: number) {
  return request<DataResponse>(
    `/departments/${departmentId}`,
    {
      method: 'DELETE',
    },
    token,
  );
}

export function createCompanyWithCampusApi(token: string, payload: CompanyPayload) {
  return request<DataResponse>(
    '/companies',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function updateCompanyWithCampusApi(token: string, companyId: number, payload: CompanyPayload) {
  return request<DataResponse>(
    `/companies/${companyId}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function deleteCompanyWithCampusApi(token: string, companyId: number) {
  return request<DataResponse>(
    `/companies/${companyId}`,
    {
      method: 'DELETE',
    },
    token,
  );
}

export function createAnnouncementWithCampusApi(token: string, payload: AnnouncementPayload) {
  return request<DataResponse>(
    '/announcements',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function updateAnnouncementWithCampusApi(token: string, announcementId: number, payload: AnnouncementPayload) {
  return request<DataResponse>(
    `/announcements/${announcementId}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function deleteAnnouncementWithCampusApi(token: string, announcementId: number) {
  return request<DataResponse>(
    `/announcements/${announcementId}`,
    {
      method: 'DELETE',
    },
    token,
  );
}

export function applyToCompanyWithCampusApi(token: string, companyId: number) {
  return request<DataResponse>(
    `/companies/${companyId}/apply`,
    {
      method: 'POST',
    },
    token,
  );
}

// Student API Routes

export function fetchStudentAttendance(token: string) {
  return request<any>(
    '/student/attendance',
    undefined,
    token,
  );
}

export function fetchStudentAttendanceDetailed(token: string, subjectId?: number) {
  const params = subjectId ? `?subject_id=${subjectId}` : '';
  return request<any>(
    `/student/attendance/detailed${params}`,
    undefined,
    token,
  );
}

export function fetchStudentAttendanceStats(token: string) {
  return request<any>(
    '/student/attendance/statistics',
    undefined,
    token,
  );
}

export function fetchStudentMarks(token: string, examId?: number, subjectId?: number) {
  const params = new URLSearchParams();
  if (examId) params.append('exam_id', examId.toString());
  if (subjectId) params.append('subject_id', subjectId.toString());
  const queryString = params.toString() ? `?${params.toString()}` : '';
  
  return request<any>(
    `/student/marks${queryString}`,
    undefined,
    token,
  );
}

export function fetchStudentMarksStats(token: string) {
  return request<any>(
    '/student/marks/statistics',
    undefined,
    token,
  );
}

export function fetchStudentTimetable(token: string) {
  return request<any>(
    '/student/timetable',
    undefined,
    token,
  );
}

export function fetchStudentTimetableByDay(token: string, day: string) {
  return request<any>(
    `/student/timetable/day?day=${day}`,
    undefined,
    token,
  );
}

export function fetchStudentMaterials(token: string, type?: string) {
  const params = type ? `?type=${type}` : '';
  return request<any>(
    `/student/materials${params}`,
    undefined,
    token,
  );
}

export function fetchStudentAssignments(token: string, status?: string, courseId?: string) {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (courseId) params.append('course_id', courseId);
  const queryString = params.toString() ? `?${params.toString()}` : '';
  
  return request<any>(
    `/student/assignments${queryString}`,
    undefined,
    token,
  );
}

export function submitStudentAssignment(token: string, assignmentId: number, formData: FormData) {
  if (!apiBaseUrl) {
    throw new Error('Campus API is not configured.');
  }

  const form = new FormData();
  form.append('assignment_id', assignmentId.toString());
  
  // Copy file from original formData
  for (const [key, value] of formData) {
    if (key === 'file' && value instanceof File) {
      form.append('file', value);
    }
  }

  return fetch(`${apiBaseUrl}/student/assignments/submit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  }).then(async (response) => {
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.message ?? 'Assignment submission failed');
    }
    return payload;
  });
}

export function fetchStudentNotifications(token: string, type?: string, unreadOnly?: boolean, search?: string) {
  const params = new URLSearchParams();
  if (type) params.append('type', type);
  if (unreadOnly) params.append('unread_only', 'true');
  if (search) params.append('search', search);
  const queryString = params.toString() ? `?${params.toString()}` : '';

  return request<any>(
    `/student/notifications${queryString}`,
    undefined,
    token,
  );
}

export function markNotificationAsRead(token: string, notificationId: number) {
  return request<any>(
    '/student/notifications/mark-as-read',
    {
      method: 'POST',
      body: JSON.stringify({ notification_id: notificationId }),
    },
    token,
  );
}

export function markAllNotificationsAsRead(token: string) {
  return request<any>(
    '/student/notifications/mark-all-as-read',
    {
      method: 'POST',
    },
    token,
  );
}

export function deleteNotification(token: string, notificationId: number) {
  return request<any>(
    '/student/notifications/delete',
    {
      method: 'DELETE',
      body: JSON.stringify({ notification_id: notificationId }),
    },
    token,
  );
}

export function deleteAllNotifications(token: string) {
  return request<any>(
    '/student/notifications/delete-all',
    {
      method: 'DELETE',
    },
    token,
  );
}

export function getNotificationPreferences(token: string) {
  return request<any>(
    '/student/notifications/preferences',
    undefined,
    token,
  );
}

export function updateNotificationPreferences(
  token: string,
  preferences: {
    announcements?: boolean;
    assignments?: boolean;
    grades?: boolean;
    attendance?: boolean;
    events?: boolean;
  },
) {
  return request<any>(
    '/student/notifications/preferences',
    {
      method: 'PUT',
      body: JSON.stringify(preferences),
    },
    token,
  );
}

// Staff API Routes

// Staff Attendance Routes
export function fetchStaffAttendanceStudents(token: string, classId?: number, subjectId?: number, date?: string) {
  const params = new URLSearchParams();
  if (classId) params.append('class_id', classId.toString());
  if (subjectId) params.append('subject_id', subjectId.toString());
  if (date) params.append('date', date);
  const queryString = params.toString() ? `?${params.toString()}` : '';

  return request<any>(`/staff/attendance/students${queryString}`, undefined, token);
}

export function submitStaffAttendance(token: string, payload: any) {
  return request<any>(
    '/staff/attendance/submit',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function fetchAttendanceHistory(token: string, classId?: number, subjectId?: number, startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (classId) params.append('class_id', classId.toString());
  if (subjectId) params.append('subject_id', subjectId.toString());
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  const queryString = params.toString() ? `?${params.toString()}` : '';

  return request<any>(`/staff/attendance/history${queryString}`, undefined, token);
}

export function fetchStaffClasses(token: string) {
  return request<any>('/staff/attendance/classes', undefined, token);
}

export function fetchSubjectsForClass(token: string, classId?: number) {
  const params = classId ? `?class_id=${classId}` : '';
  return request<any>(`/staff/attendance/subjects${params}`, undefined, token);
}

// Staff Marks Routes
export function fetchStaffMarksStudents(token: string, classId?: number, examId?: number, subjectId?: number, totalMarks?: number) {
  const params = new URLSearchParams();
  if (classId) params.append('class_id', classId.toString());
  if (examId) params.append('exam_id', examId.toString());
  if (subjectId) params.append('subject_id', subjectId.toString());
  if (totalMarks) params.append('total_marks', totalMarks.toString());
  const queryString = params.toString() ? `?${params.toString()}` : '';

  return request<any>(`/staff/marks/students${queryString}`, undefined, token);
}

export function submitStaffMarks(token: string, payload: any) {
  return request<any>(
    '/staff/marks/submit',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function fetchExamsListForMarks(token: string) {
  return request<any>('/staff/marks/exams', undefined, token);
}

export function fetchMarksStatistics(token: string, classId?: number, examId?: number, subjectId?: number) {
  const params = new URLSearchParams();
  if (classId) params.append('class_id', classId.toString());
  if (examId) params.append('exam_id', examId.toString());
  if (subjectId) params.append('subject_id', subjectId.toString());
  const queryString = params.toString() ? `?${params.toString()}` : '';

  return request<any>(`/staff/marks/statistics${queryString}`, undefined, token);
}

export function downloadMarksTemplate(token: string, examId?: number, subjectId?: number, classId?: number) {
  const params = new URLSearchParams();
  if (examId) params.append('exam_id', examId.toString());
  if (subjectId) params.append('subject_id', subjectId.toString());
  if (classId) params.append('class_id', classId.toString());
  const queryString = params.toString() ? `?${params.toString()}` : '';

  return request<any>(`/staff/marks/template${queryString}`, undefined, token);
}

export function uploadMarksFromFile(token: string, file: File, examId: number, subjectId: number, classId: number) {
  if (!apiBaseUrl) {
    throw new Error('Campus API is not configured.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('exam_id', examId.toString());
  formData.append('subject_id', subjectId.toString());
  formData.append('class_id', classId.toString());

  return fetch(`${apiBaseUrl}/staff/marks/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  }).then(async (response) => {
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.message ?? 'Marks upload failed');
    }
    return payload;
  });
}

// Staff Management Routes (HOD)
export function fetchAllStaffMembers(token: string, departmentId?: number, designationId?: number) {
  const params = new URLSearchParams();
  if (departmentId) params.append('department_id', departmentId.toString());
  if (designationId) params.append('designation_id', designationId.toString());
  const queryString = params.toString() ? `?${params.toString()}` : '';

  return request<any>(`/staff/management${queryString}`, undefined, token);
}

export function fetchStaffMemberById(token: string, staffId: number) {
  return request<any>(`/staff/management/${staffId}`, undefined, token);
}

export function createNewStaffMember(token: string, payload: any) {
  return request<any>(
    '/staff/management',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function updateStaffMember(token: string, staffId: number, payload: any) {
  return request<any>(
    `/staff/management/${staffId}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function deleteStaffMember(token: string, staffId: number) {
  return request<any>(
    `/staff/management/${staffId}`,
    {
      method: 'DELETE',
    },
    token,
  );
}

export function assignClassesToStaff(token: string, staffId: number, classes: number[]) {
  return request<any>(
    `/staff/management/${staffId}/assign-classes`,
    {
      method: 'POST',
      body: JSON.stringify({ classes }),
    },
    token,
  );
}

export function fetchStaffWorkload(token: string, staffId?: number) {
  return request<any>(`/staff/management/${staffId ?? 'me'}/workload`, undefined, token);
}

export function fetchDepartmentsListForStaff(token: string) {
  return request<any>('/staff/management/list/departments', undefined, token);
}

export function fetchDesignationsListForStaff(token: string) {
  return request<any>('/staff/management/list/designations', undefined, token);
}

// Placement Routes
export function fetchPlacementDrives(token: string, status?: string) {
  const params = status ? `?status=${status}` : '';
  return request<any>(`/staff/placement/drives${params}`, undefined, token);
}

export function fetchDriveApplications(token: string, driveId?: number, status?: string) {
  const params = new URLSearchParams();
  if (driveId) params.append('drive_id', driveId.toString());
  if (status) params.append('status', status);
  const queryString = params.toString() ? `?${params.toString()}` : '';

  return request<any>(`/staff/placement/applications${queryString}`, undefined, token);
}

export function createPlacementDrive(token: string, payload: any) {
  return request<any>(
    '/staff/placement/drives',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function updatePlacementDrive(token: string, driveId: number, payload: any) {
  return request<any>(
    `/staff/placement/drives/${driveId}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function fetchPlacementStatistics(token: string) {
  return request<any>('/staff/placement/statistics', undefined, token);
}

export function fetchPlacementResultsByBatch(token: string, batch?: string) {
  const params = batch ? `?batch=${batch}` : '';
  return request<any>(`/staff/placement/results-by-batch${params}`, undefined, token);
}

export function exportPlacementReport(token: string) {
  return request<any>('/staff/placement/report', undefined, token);
}

// Exam Coordinator Routes
export function fetchExams(token: string, semester?: number, status?: string) {
  const params = new URLSearchParams();
  if (semester) params.append('semester', semester.toString());
  if (status) params.append('status', status);
  const queryString = params.toString() ? `?${params.toString()}` : '';

  return request<any>(`/staff/exam${queryString}`, undefined, token);
}

export function fetchExamDetails(token: string, examId: number) {
  return request<any>(`/staff/exam/${examId}`, undefined, token);
}

export function createExam(token: string, payload: any) {
  return request<any>(
    '/staff/exam',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function assignExamInvigilators(token: string, examId: number, payload: any) {
  return request<any>(
    `/staff/exam/${examId}/assign-invigilators`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function assignExamClassrooms(token: string, examId: number, payload: any) {
  return request<any>(
    `/staff/exam/${examId}/assign-classrooms`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function fetchExamProgress(token: string, examId: number) {
  return request<any>(`/staff/exam/${examId}/progress`, undefined, token);
}

export function declareExamResults(token: string, examId: number, payload: any) {
  return request<any>(
    `/staff/exam/${examId}/declare-results`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function fetchExamSeatingArrangement(token: string, examId?: number, date?: string) {
  const params = new URLSearchParams();
  if (examId) params.append('exam_id', examId.toString());
  if (date) params.append('date', date);
  const queryString = params.toString() ? `?${params.toString()}` : '';

  return request<any>(`/staff/exam/seating-arrangement${queryString}`, undefined, token);
}

export function generateExamReport(token: string, examId?: number) {
  const params = examId ? `?exam_id=${examId}` : '';
  return request<any>(`/staff/exam/report${params}`, undefined, token);
}

// Department Overview Routes (HOD)
export function fetchDepartmentOverview(token: string, departmentId?: number) {
  const params = departmentId ? `?department_id=${departmentId}` : '';
  return request<any>(`/staff/department/overview${params}`, undefined, token);
}

export function fetchDepartmentStaff(token: string, departmentId?: number) {
  const params = departmentId ? `?department_id=${departmentId}` : '';
  return request<any>(`/staff/department/staff${params}`, undefined, token);
}

export function fetchDepartmentClasses(token: string, departmentId?: number) {
  const params = departmentId ? `?department_id=${departmentId}` : '';
  return request<any>(`/staff/department/classes${params}`, undefined, token);
}

export function fetchDepartmentPerformance(token: string) {
  return request<any>('/staff/department/performance', undefined, token);
}

export function fetchDepartmentBudget(token: string, year?: string) {
  const params = year ? `?year=${year}` : '';
  return request<any>(`/staff/department/budget${params}`, undefined, token);
}

export function fetchDepartmentAnnouncements(token: string, departmentId?: number) {
  const params = departmentId ? `?department_id=${departmentId}` : '';
  return request<any>(`/staff/department/announcements${params}`, undefined, token);
}

export function fetchDepartmentInfrastructure(token: string) {
  return request<any>('/staff/department/infrastructure', undefined, token);
}

// Reports & Analytics Routes (HOD)
export function fetchAcademicPerformanceReport(token: string, semester?: number) {
  const params = semester ? `?semester=${semester}` : '';
  return request<any>(`/staff/reports/academic-performance${params}`, undefined, token);
}

export function fetchAttendanceReportForDept(token: string, semester?: number, startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (semester) params.append('semester', semester.toString());
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  const queryString = params.toString() ? `?${params.toString()}` : '';

  return request<any>(`/staff/reports/attendance${queryString}`, undefined, token);
}

export function fetchPlacementAnalyticsReport(token: string) {
  return request<any>('/staff/reports/placement', undefined, token);
}

export function fetchResearchReport(token: string) {
  return request<any>('/staff/reports/research', undefined, token);
}

export function fetchResourceUtilizationReport(token: string) {
  return request<any>('/staff/reports/resource-utilization', undefined, token);
}

export function generateCustomReport(token: string, payload: any) {
  return request<any>(
    '/staff/reports/generate',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

// ---------------------------------------------------------------------------
// AI Interview Journey API (documentation/ai-interview-journey-backend-spec.md)
// ---------------------------------------------------------------------------

export type ResumeRecord = {
  id: number;
  title: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  status: 'uploaded' | 'parsing' | 'parsed' | 'failed';
  isDefault: boolean;
  parseError?: string | null;
  createdAt: string;
  analysis?: ResumeAnalysisRecord | null;
};

export type ResumeDetailRecord = ResumeRecord & {
  parsedData: {
    education?: Array<{ institution?: string; degree?: string; graduationYear?: number; score?: string }>;
    skills?: Array<{ name: string; category?: string; proficiencyHint?: string }>;
    experience?: Array<{ organisation?: string; role?: string; startDate?: string; highlights?: string[] }>;
    projects?: Array<{ title?: string; techStack?: string[]; description?: string; metrics?: string }>;
  } | null;
};

export type ResumeAnalysisRecord = {
  overallScore: number;
  atsCompatibilityScore: number;
  sectionScores: Record<string, number>;
  strengths: string[];
  improvements: string[];
  extractedSkills: Array<{ name: string; category?: string }>;
  modelVersion: string;
};

export type InterviewSession = {
  id: number;
  mode: 'technical' | 'hr' | 'resume_deep_dive' | 'system_design' | 'mixed';
  targetRole: string;
  targetExperienceLevel: 'fresher' | 'junior' | 'intermediate';
  baseDifficulty: number;
  currentDifficulty: number;
  status: 'planned' | 'in_progress' | 'evaluating' | 'completed' | 'abandoned' | 'failed';
  timeLimitMinutes: number;
  plan: {
    totalTargetTurns: number | null;
    competencies: Array<{ name: string; weight: number; plannedTurns: number }>;
  };
  resumeId: number | null;
  jobPostingId: number | null;
  endReason: string | null;
  consentGivenAt: string | null;
  startedAt: string | null;
  endsAt: string | null;
  endedAt: string | null;
  overallScore?: number | null;
  createdAt: string;
};

export type InterviewTurn = {
  id: number;
  sequence: number;
  kind: 'question' | 'follow_up' | 'clarification' | 'system_hint';
  competency: string;
  difficulty: number;
  questionText: string;
  questionAudioUrl: string | null;
  askedAt: string;
  answerText: string | null;
  answeredAt: string | null;
  answerDurationSeconds: number | null;
  quickSignal?: {
    relevance: number;
    depth: 'shallow' | 'adequate' | 'profound';
    technicalScore: number;
    claimDetected?: boolean;
  } | null;
};

export type InterviewDetail = InterviewSession & {
  turns: InterviewTurn[];
};

export type InterviewEvaluation = {
  interviewId: number;
  overallScore: number;
  dimensionScores: Record<string, number>;
  dimensionWeights: Record<string, number>;
  competencyBreakdown: Array<{ competency: string; score: number; summary: string }>;
  strengths: string[];
  weaknesses: string[];
  perTurnEvaluations: Array<{ turnId: number; sequence: number; question: string; answer: string; score: number; feedback: string }>;
  recommendations: string[];
  rubricVersion: string;
  modelName: string;
  evaluatedAt: string;
  note: string;
};

export type SkillGapReport = {
  id: number;
  interviewId: number | null;
  targetRole: string;
  overallMatchPercentage: number;
  competencies: Array<{
    skill: string;
    expectedLevel: string;
    demonstratedLevel: string;
    status: 'exceeds' | 'meets' | 'gap' | 'missing';
    remediation?: string;
  }>;
  generatedAt: string;
};

export type AiRecommendation = {
  id: number;
  type: string;
  title: string;
  detail: string;
  skill: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'done' | 'dismissed';
  sourceType: string;
  sourceId: number | null;
  createdAt: string;
};

export type StudentReadiness = {
  overall: number;
  components: {
    resumeScore?: number;
    academicSummary?: number;
    assessmentAttempts?: number;
    interviewEvaluation?: number;
  };
  calculatedAt: string;
  history: Array<{ overall: number; trigger: string; calculatedAt: string }>;
  note: string;
};

export const resumeApi = {
  list(token: string) {
    return request<{ data: ResumeRecord[] }>('/students/me/resumes', undefined, token);
  },
  upload(token: string, file: File, title: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    return request<{ data: ResumeRecord }>(
      '/students/me/resumes',
      {
        method: 'POST',
        body: formData,
      },
      token,
    );
  },
  get(token: string, resumeId: number) {
    return request<{ data: ResumeDetailRecord }>(`/students/me/resumes/${resumeId}`, undefined, token);
  },
  getAnalysis(token: string, resumeId: number) {
    return request<{ data: ResumeAnalysisRecord }>(`/students/me/resumes/${resumeId}/analysis`, undefined, token);
  },
  getDownloadUrl(token: string, resumeId: number) {
    return request<{ data: { url: string; expiresAt: string } }>(`/students/me/resumes/${resumeId}/download`, undefined, token);
  },
  queueAnalysis(token: string, resumeId: number) {
    return request<{ data: { status: string } }>(
      `/students/me/resumes/${resumeId}/analysis`,
      { method: 'POST' },
      token,
    );
  },
  delete(token: string, resumeId: number) {
    return request<{ message: string }>(
      `/students/me/resumes/${resumeId}`,
      { method: 'DELETE' },
      token,
    );
  },
};

export const interviewApi = {
  create(
    token: string,
    payload: {
      mode: 'technical' | 'hr' | 'resume_deep_dive' | 'system_design' | 'mixed';
      targetRole?: string;
      targetExperienceLevel?: 'fresher' | 'junior' | 'intermediate';
      baseDifficulty?: number;
      resumeId?: number | null;
      jobPostingId?: number | null;
      timeLimitMinutes?: number;
    },
  ) {
    return request<{ data: InterviewSession }>(
      '/students/me/interviews',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token,
    );
  },
  history(token: string, params?: { status?: string; page?: number; perPage?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.perPage) searchParams.append('perPage', params.perPage.toString());
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request<{ data: InterviewSession[]; meta?: any }>(`/students/me/interviews${qs}`, undefined, token);
  },
  get(token: string, interviewId: number) {
    return request<{ data: InterviewDetail }>(`/interviews/${interviewId}`, undefined, token);
  },
  start(token: string, interviewId: number) {
    return request<{ data: { firstTurn: InterviewTurn } }>(
      `/interviews/${interviewId}/start`,
      {
        method: 'POST',
        body: JSON.stringify({ consentAccepted: true }),
      },
      token,
    );
  },
  answerTurn(
    token: string,
    interviewId: number,
    turnId: number,
    answerText?: string,
    audio?: File,
  ) {
    if (audio) {
      const formData = new FormData();
      formData.append('audio', audio);
      if (answerText) formData.append('answerText', answerText);
      return request<{ data: { nextTurn: InterviewTurn | null; isCompleted: boolean } }>(
        `/interviews/${interviewId}/turns/${turnId}/answer`,
        {
          method: 'POST',
          body: formData,
        },
        token,
      );
    }
    return request<{ data: { nextTurn: InterviewTurn | null; isCompleted: boolean } }>(
      `/interviews/${interviewId}/turns/${turnId}/answer`,
      {
        method: 'POST',
        body: JSON.stringify({ answerText }),
      },
      token,
    );
  },
  finish(token: string, interviewId: number, reason?: string) {
    return request<{ data: { status: string } }>(
      `/interviews/${interviewId}/finish`,
      {
        method: 'POST',
        body: JSON.stringify({ reason: reason ?? 'user_ended' }),
      },
      token,
    );
  },
  getEvaluation(token: string, interviewId: number) {
    return request<{ data: InterviewEvaluation }>(`/interviews/${interviewId}/evaluation`, undefined, token);
  },
  getSkillGap(token: string, interviewId: number) {
    return request<{ data: SkillGapReport }>(`/interviews/${interviewId}/skill-gap`, undefined, token);
  },
  getRecommendations(token: string, status?: 'open' | 'done' | 'dismissed') {
    const qs = status ? `?status=${status}` : '';
    return request<{ data: AiRecommendation[] }>(`/students/me/recommendations${qs}`, undefined, token);
  },
  updateRecommendation(token: string, recommendationId: number, status: 'open' | 'done' | 'dismissed') {
    return request<{ data: AiRecommendation }>(
      `/students/me/recommendations/${recommendationId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      },
      token,
    );
  },
  getReadinessScore(token: string) {
    return request<{ data: StudentReadiness }>('/students/me/readiness-score', undefined, token);
  },
  getReadinessHistory(token: string) {
    return request<{ data: Array<{ overall: number; trigger: string; calculatedAt: string }> }>(
      '/students/me/readiness/history',
      undefined,
      token,
    );
  },
};

// ============================================
// Academic Results & Marks Lifecycle (Stages 1–6)
// documentation/academic-results-backend-spec.md
// ============================================

// Stage 1: Grade Rules & Mark Schemes
export function fetchGradeRules(token: string) {
  return request<any>('/grade-rules', undefined, token);
}

export function setupDefaultGradeRules(token: string) {
  return request<any>('/grade-rules/setup-defaults', { method: 'POST' }, token);
}

export function saveGradeRule(token: string, payload: any, id?: number) {
  return request<any>(
    id ? `/grade-rules/${id}` : '/grade-rules',
    {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function deleteGradeRule(token: string, id: number) {
  return request<any>(`/grade-rules/${id}`, { method: 'DELETE' }, token);
}

export function fetchMarkSchemes(token: string, semesterId?: number, subjectId?: number) {
  const params = new URLSearchParams();
  if (semesterId) params.append('semesterId', semesterId.toString());
  if (subjectId) params.append('subjectId', subjectId.toString());
  const qs = params.toString() ? `?${params.toString()}` : '';
  return request<any>(`/mark-schemes${qs}`, undefined, token);
}

export function saveMarkScheme(token: string, payload: any, id?: number) {
  return request<any>(
    id ? `/mark-schemes/${id}` : '/mark-schemes',
    {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

// Stage 2 & 3: Faculty Marks Entry & Submission
export function fetchMarkEntries(token: string, examId?: number, subjectId?: number, status?: string) {
  const params = new URLSearchParams();
  if (examId) params.append('examId', examId.toString());
  if (subjectId) params.append('subjectId', subjectId.toString());
  if (status) params.append('status', status);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return request<any>(`/mark-entries${qs}`, undefined, token);
}

export function fetchMarkRoster(token: string, examId: number, subjectId: number) {
  return request<any>(`/mark-entries/get-students?examId=${examId}&subjectId=${subjectId}`, undefined, token);
}

export function saveDraftMarks(token: string, payload: {
  examId: number;
  subjectId: number;
  entries: Array<{
    studentId: number;
    internalMarks?: number | null;
    externalMarks?: number | null;
    extraMarks?: number;
    isAbsent?: boolean;
    remarks?: string;
  }>;
}) {
  return request<any>(
    '/mark-entries/save-draft',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function submitMarksForReview(token: string, payload: {
  examId: number;
  subjectId: number;
  declarationConfirmed?: boolean;
}) {
  return request<any>(
    '/mark-entries/submit',
    {
      method: 'POST',
      body: JSON.stringify({ declarationConfirmed: true, ...payload }),
    },
    token,
  );
}

// Stage 4: Review, Moderation & Approval
export function fetchReviewQueue(token: string, examId?: number, subjectId?: number, status?: string | string[]) {
  const params = new URLSearchParams();
  if (examId) params.append('examId', examId.toString());
  if (subjectId) params.append('subjectId', subjectId.toString());
  if (status) {
    if (Array.isArray(status)) {
      status.forEach(s => params.append('status[]', s));
    } else {
      params.append('status', status);
    }
  }
  const qs = params.toString() ? `?${params.toString()}` : '';
  return request<any>(`/mark-review/get-submitted-marks${qs}`, undefined, token);
}

export function fetchExamSummary(token: string, examId: number, subjectId: number) {
  return request<any>(`/mark-review/exam-summary?examId=${examId}&subjectId=${subjectId}`, undefined, token);
}

export function verifyMarkEntry(token: string, markEntryId: number, payload?: { remarks?: string; adjustments?: Record<string, any> }) {
  return request<any>(
    `/mark-review/${markEntryId}/verify`,
    {
      method: 'POST',
      body: JSON.stringify(payload ?? {}),
    },
    token,
  );
}

export function approveMarkEntry(token: string, markEntryId: number) {
  return request<any>(
    `/mark-review/${markEntryId}/approve`,
    {
      method: 'POST',
    },
    token,
  );
}

export function rejectMarkEntry(token: string, markEntryId: number, payload: { remarks?: string; reason?: string }) {
  return request<any>(
    `/mark-review/${markEntryId}/reject`,
    {
      method: 'POST',
      body: JSON.stringify({ remarks: payload.remarks || payload.reason, reason: payload.reason || payload.remarks }),
    },
    token,
  );
}

export function bulkApproveMarks(token: string, payload: { examId: number; subjectId: number }) {
  return request<any>(
    '/mark-review/bulk-approve',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

// Stage 5: Result Publishing & Locking
export function fetchPublishingStatus(token: string, semesterId: number) {
  return request<any>(`/result-publishing/status?semesterId=${semesterId}`, undefined, token);
}

export function publishSemesterResults(token: string, semesterId: number) {
  return request<any>(
    '/result-publishing/publish',
    {
      method: 'POST',
      body: JSON.stringify({ semesterId }),
    },
    token,
  );
}

export function unlockSemesterResults(token: string, semesterId: number, reason: string) {
  return request<any>(
    '/result-publishing/unlock',
    {
      method: 'POST',
      body: JSON.stringify({ semesterId, reason }),
    },
    token,
  );
}

export function fetchPublishingLogs(token: string, semesterId?: number) {
  const qs = semesterId ? `?semesterId=${semesterId}` : '';
  return request<any>(`/result-publishing/logs${qs}`, undefined, token);
}

// Stage 6: Student Published Results
export function fetchStudentPublishedSemesters(token: string) {
  return request<any>('/student/results/semesters', undefined, token);
}

export function fetchStudentSemesterGradeCard(token: string, semesterId: number) {
  return request<any>(`/student/results/semester/${semesterId}`, undefined, token);
}

export function fetchStudentAllResults(token: string) {
  return request<any>('/student/results/all', undefined, token);
}

export function fetchStudentAcademicSummary(token: string, studentId: number) {
  return request<any>(`/students/${studentId}/academic-summary`, undefined, token);
}

// ============================================
// Student Journey API (Steps 2, 3, 6)
// documentation/student-journey-backend-spec.md
// ============================================

// Step 2: Student Career Profile
export function fetchMyProfile(token: string) {
  return request<any>('/students/me/profile', undefined, token);
}

export function updateMyProfile(token: string, payload: {
  headline?: string;
  about?: string;
  dateOfBirth?: string;
  phone?: string;
  alternateEmail?: string;
  city?: string;
  state?: string;
  country?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  preferredRoles?: string[];
  preferredLocations?: string[];
  willingToRelocate?: boolean;
  visibility?: Record<string, boolean>;
}) {
  return request<any>(
    '/students/me/profile',
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function uploadMyProfilePhoto(token: string, photo: File) {
  const formData = new FormData();
  formData.append('photo', photo);
  return request<any>(
    '/students/me/profile/photo',
    {
      method: 'POST',
      body: formData,
    },
    token,
  );
}

// Step 2 Sub-resources: Projects, Certifications, Experience
export function fetchMyProjects(token: string) {
  return request<any>('/students/me/projects', undefined, token);
}

export function saveMyProject(token: string, payload: {
  title: string;
  description?: string;
  techStack: string[];
  url?: string;
  startDate: string;
  endDate?: string;
}, id?: number) {
  return request<any>(
    id ? `/students/me/projects/${id}` : '/students/me/projects',
    {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function deleteMyProject(token: string, id: number) {
  return request<any>(`/students/me/projects/${id}`, { method: 'DELETE' }, token);
}

export function fetchMyCertifications(token: string) {
  return request<any>('/students/me/certifications', undefined, token);
}

export function saveMyCertification(token: string, payload: {
  name: string;
  issuer: string;
  issuedOn: string;
  expiresOn?: string;
  credentialUrl?: string;
}, id?: number) {
  return request<any>(
    id ? `/students/me/certifications/${id}` : '/students/me/certifications',
    {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function deleteMyCertification(token: string, id: number) {
  return request<any>(`/students/me/certifications/${id}`, { method: 'DELETE' }, token);
}

export function fetchMyExperience(token: string) {
  return request<any>('/students/me/experience', undefined, token);
}

export function saveMyExperience(token: string, payload: {
  type: 'internship' | 'job' | 'freelance';
  organisation: string;
  role: string;
  startDate: string;
  endDate?: string;
  description?: string;
}, id?: number) {
  return request<any>(
    id ? `/students/me/experience/${id}` : '/students/me/experience',
    {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function deleteMyExperience(token: string, id: number) {
  return request<any>(`/students/me/experience/${id}`, { method: 'DELETE' }, token);
}

// Step 3: Prior Education & Derived Academic Summary
export function fetchMyAcademics(token: string) {
  return request<any>('/students/me/academics', undefined, token);
}

export function saveMyEducation(token: string, payload: {
  level: 'class_10' | 'class_12' | 'diploma' | 'ug' | 'pg';
  boardOrUniversity: string;
  institutionName: string;
  yearOfPassing: number;
  scoreType: 'percentage' | 'cgpa';
  score: number;
}, id?: number) {
  return request<any>(
    id ? `/students/me/education/${id}` : '/students/me/education',
    {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function deleteMyEducation(token: string, id: number) {
  return request<any>(`/students/me/education/${id}`, { method: 'DELETE' }, token);
}

export function fetchStaffStudentAcademics(token: string, studentId: number) {
  return request<any>(`/students/${studentId}/academics`, undefined, token);
}

export function verifyStudentEducation(token: string, studentId: number, educationId: number, payload: {
  verified: boolean;
  remarks?: string;
}) {
  return request<any>(
    `/students/${studentId}/education/${educationId}/verify`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function recalculateStudentAcademics(token: string, studentId: number) {
  return request<any>(`/students/${studentId}/academics/recalculate`, { method: 'POST' }, token);
}

// Step 6: Skills Catalogue & Student Skills Profile
export function fetchSkillsCatalogue(token: string, search?: string, category?: string) {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (category) params.append('category', category);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return request<any>(`/skills${qs}`, undefined, token);
}

export function fetchMySkills(token: string) {
  return request<any>('/students/me/skills', undefined, token);
}

export function updateMySkills(token: string, skills: Array<{ skillId: number; level: number }>) {
  return request<any>(
    '/students/me/skills',
    {
      method: 'PUT',
      body: JSON.stringify({ skills }),
    },
    token,
  );
}

export function deleteMySkill(token: string, skillId: number) {
  return request<any>(`/students/me/skills/${skillId}`, { method: 'DELETE' }, token);
}

