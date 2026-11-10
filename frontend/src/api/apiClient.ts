/**
 * Generic API Client for ALphaGrew
 * This client handles API requests with authentication tokenautomatically retrieved from localStorage
 */

import { ApiError, apiErrorFromResponse } from './apiError';
import { notifySessionExpired } from './campusApi';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '') ?? '';

interface RequestOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
}

/**
 * Get the stored authentication token from localStorage
 */
export function getStoredToken(): string | null {
  try {
    const legacy = localStorage.getItem('auth_token');
    if (legacy) return legacy;
    const stored = localStorage.getItem('chromolog-campus-auth');
    if (!stored) return null;
    const auth = JSON.parse(stored);
    return auth.token || null;
  } catch {
    return null;
  }
}


/**
 * Make an authenticated API request
 * @param path - The API endpoint path (e.g., '/courses'), relative to VITE_API_BASE_URL
 * @param method - HTTP method (GET, POST, PUT, DELETE)
 * @param data - Request body data (for POST/PUT requests)
 * @returns Promise with the response data
 */
export async function apiCall(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: any
): Promise<any> {
  if (!apiBaseUrl) {
    throw new Error('API is not configured. Please set VITE_API_BASE_URL.');
  }

  const token = getStoredToken();
  if (!token) {
    throw new ApiError('Your session has expired. Please log in again.', 401);
  }

  const url = `${apiBaseUrl}${path}`;
  const options: RequestOptions = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    if (response.status === 401) {
      notifySessionExpired();
    }
    throw apiErrorFromResponse(response.status, payload, `API request failed with status ${response.status}`);
  }

  return payload;
}

/**
 * Course API calls
 */
export const courseApi = {
  list: (filters?: { department_id?: number; search?: string }) => {
    const params = new URLSearchParams();
    if (filters?.department_id) params.append('department_id', filters.department_id.toString());
    if (filters?.search) params.append('search', filters.search);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiCall(`/courses${query}`, 'GET');
  },
  get: (id: number) => apiCall(`/courses/${id}`, 'GET'),
  create: (data: any) => apiCall('/courses', 'POST', data),
  update: (id: number, data: any) => apiCall(`/courses/${id}`, 'PUT', data),
  delete: (id: number) => apiCall(`/courses/${id}`, 'DELETE'),
  getDepartments: () => apiCall('/courses/list/departments', 'GET'),
  getSelectList: () => apiCall('/courses/list/select', 'GET'),
};

/**
 * Subject API calls
 */
export const subjectApi = {
  list: (filters?: { course_id?: number; search?: string }) => {
    const params = new URLSearchParams();
    if (filters?.course_id) params.append('course_id', filters.course_id.toString());
    if (filters?.search) params.append('search', filters.search);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiCall(`/subjects${query}`, 'GET');
  },
  get: (id: number) => apiCall(`/subjects/${id}`, 'GET'),
  create: (data: any) => apiCall('/subjects', 'POST', data),
  update: (id: number, data: any) => apiCall(`/subjects/${id}`, 'PUT', data),
  delete: (id: number) => apiCall(`/subjects/${id}`, 'DELETE'),
  getCourses: () => apiCall('/subjects/list/courses', 'GET'),
};

/**
 * Semester API calls
 */
export const semesterApi = {
  list: (filters?: { academic_year_id?: number; search?: string }) => {
    const params = new URLSearchParams();
    if (filters?.academic_year_id) params.append('academic_year_id', filters.academic_year_id.toString());
    if (filters?.search) params.append('search', filters.search);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiCall(`/semesters${query}`, 'GET');
  },
  get: (id: number) => apiCall(`/semesters/${id}`, 'GET'),
  create: (data: any) => apiCall('/semesters', 'POST', data),
  update: (id: number, data: any) => apiCall(`/semesters/${id}`, 'PUT', data),
  delete: (id: number) => apiCall(`/semesters/${id}`, 'DELETE'),
  getAcademicYears: () => apiCall('/semesters/list/academic-years', 'GET'),
  getSemesterOptions: () => apiCall('/semesters/list/options', 'GET'),
};

/**
 * Exam API calls
 */
export const examApi = {
  list: (filters?: { semester_id?: number; subject_id?: number; search?: string }) => {
    const params = new URLSearchParams();
    if (filters?.semester_id) params.append('semester_id', filters.semester_id.toString());
    if (filters?.subject_id) params.append('subject_id', filters.subject_id.toString());
    if (filters?.search) params.append('search', filters.search);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiCall(`/exams${query}`, 'GET');
  },
};

/**
 * Attendance API calls (real V1 /attendance endpoints)
 */
export const attendanceApi = {
  list: (filters?: { subject_id?: number; student_id?: number; from_date?: string; to_date?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.subject_id) params.append('subject_id', filters.subject_id.toString());
    if (filters?.student_id) params.append('student_id', filters.student_id.toString());
    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);
    if (filters?.status) params.append('status', filters.status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiCall(`/attendance${query}`, 'GET');
  },
  mark: (data: { subject_id: number; attendance_date: string; attendance_data: Array<{ student_id: number; status: string }>; remarks?: string }) =>
    apiCall('/attendance/mark', 'POST', data),
  getStudentsForSubject: (subjectId: number) =>
    apiCall(`/attendance/subject/${subjectId}/students`, 'GET'),
  getStudentReport: (studentId: number) =>
    apiCall(`/attendance/student/${studentId}/report`, 'GET'),
  getSubjectReport: (subjectId: number) =>
    apiCall(`/attendance/subject/${subjectId}/report`, 'GET'),
  approve: (data: any) =>
    apiCall('/attendance/approve', 'POST', data),
};

/**
 * Timetable API calls (real V1 /student/timetable endpoints)
 */
export const timetableApi = {
  getStudentTimetable: () => apiCall('/student/timetable', 'GET'),
  getStudentTimetableByDay: (day: string) => apiCall(`/student/timetable/day?day=${encodeURIComponent(day)}`, 'GET'),
};

/**
 * Generic typed HTTP request helpers
 */
export const api = {
  get: <T = any>(path: string) => apiCall(path, 'GET') as Promise<T>,
  post: <T = any>(path: string, data?: any) => apiCall(path, 'POST', data) as Promise<T>,
  put: <T = any>(path: string, data?: any) => apiCall(path, 'PUT', data) as Promise<T>,
  delete: <T = any>(path: string) => apiCall(path, 'DELETE') as Promise<T>,
};

