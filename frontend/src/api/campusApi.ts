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

type AuthResponse = {
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
    const message =
      (payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
        ? payload.message
        : null) ?? 'API request failed.';
    throw new Error(message);
  }

  return payload as T;
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
  const params = staffId ? `?staff_id=${staffId}` : '';
  return request<any>(`/staff/management${params}/workload`, undefined, token);
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
