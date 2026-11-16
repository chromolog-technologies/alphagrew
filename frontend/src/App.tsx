import type { CustomFieldValues } from './api/customFieldsApi';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
// Self-hosted app fonts; imported here so only the signed-in app downloads them.
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import {
  applyToCompanyWithCampusApi,
  createAnnouncementWithCampusApi,
  createCompanyWithCampusApi,
  createDesignationWithCampusApi,
  createDepartmentWithCampusApi,
  createMasterWithCampusApi,
  createStaffWithCampusApi,
  createStudentWithCampusApi,
  deleteAnnouncementWithCampusApi,
  deleteCompanyWithCampusApi,
  deleteDesignationWithCampusApi,
  deleteDepartmentWithCampusApi,
  deleteMasterWithCampusApi,
  deleteStaffWithCampusApi,
  deleteStudentWithCampusApi,
  fetchCampusBootstrap,
  isApiError,
  isCampusApiConfigured,
  isMfaChallenge,
  loginWithCampusApi,
  logoutFromCampusApi,
  resetCampusDemo,
  updateCampusProfile,
  updateAnnouncementWithCampusApi,
  updateCompanyWithCampusApi,
  updateDesignationWithCampusApi,
  updateDepartmentWithCampusApi,
  updateMasterWithCampusApi,
  updateStaffWithCampusApi,
  updateStudentWithCampusApi,
  updateStudentResumeWithCampusApi,
  verifyOwnerMfa,
  SESSION_EXPIRED_EVENT,
  type AuthResponse,
  type LoginPortal,
  type StudentRecordResponse,
} from './api/campusApi';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AcceptInvitationPage, ForgotPasswordPage, RegisterPage, ResetPasswordPage } from './components/auth/AuthPages';
import { createCampusDemoData, getDepartmentAccent } from './campusDemoData';
import { OWNER } from './api/ownerApi';
import { CampusLogin, OwnerLogin } from './components/auth';
import { PageLoading } from './components/shared/RouteStatus';

// Loaded after sign-in, so the sign-in page doesn't download the whole workspace.
const CampusWorkspace = lazy(() => import('./components/layouts/CampusWorkspace'));
const OwnerWorkspace = lazy(() => import('./components/owner/OwnerWorkspace'));
import {
  campusMasterCategoryLabels,
  campusRolePermissions,
  createDefaultCampusStudentResume,
  isInstitutionStaffRole,
  isPlatformRole,
  normalizeCampusStudentResume,
  normalizeStaffPermissions,
  type CampusData,
  type CampusMasterCategory,
  type CampusPermission,
  type CampusStudentResume,
  type TenantError,
} from './campusTypes';
import {
  AUTH_KEY,
  LEGACY_AUTH_TOKEN_KEY,
  DATA_KEY,
  type StoredAuth,
  SESSION_EXPIRED_NOTICE,
  slugifyDesignation,
  slugifyMasterCode,
  upsertById,
  extractAssignablePermissions,
  applyBrandAccents,
  loadInitialData,
  loadStoredAuth,
  toSessionUser,
} from './app/campusSession';
import { AccountNotice, VerifyEmailReminder } from './app/AccountNotices';

export default function App() {
  const apiConfigured = isCampusApiConfigured();
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState<CampusData>(() => loadInitialData(apiConfigured));
  const [auth, setAuth] = useState<StoredAuth | null>(loadStoredAuth);
  const [error, setError] = useState('');
  const [loginErrorCode, setLoginErrorCode] = useState<string | undefined>(undefined);
  // Informational message on the login screen (expired session, recruiter or inactive institution).
  const [loginNotice, setLoginNotice] = useState('');
  const [mfaChallengeToken, setMfaChallengeToken] = useState<string | null>(null);
  const [tenantError, setTenantError] = useState<TenantError | null>(null);
  const prevPathnameRef = useRef(location.pathname);

  useEffect(() => {
    if (prevPathnameRef.current !== location.pathname) {
      prevPathnameRef.current = location.pathname;
      if (!auth?.user) {
        setError('');
        setLoginErrorCode(undefined);
        setLoginNotice('');
        setMfaChallengeToken(null);
      }
    }
  }, [location.pathname, auth?.user]);

  // 401 signs the user out; 403 and 404 replace the current tab; anything else shows the error banner.
  const reportApiError = (apiError: unknown, fallbackMessage: string) => {
    if (isApiError(apiError) && apiError.status === 401) {
      setAuth(null);
      setLoginNotice(SESSION_EXPIRED_NOTICE);
      setError('');
      setLoginErrorCode(undefined);
      setMfaChallengeToken(null);
      return;
    }

    if (isApiError(apiError) && (apiError.status === 403 || apiError.status === 404)) {
      setTenantError({ status: apiError.status, message: apiError.message });
      setError('');
      return;
    }

    setError(apiError instanceof Error ? apiError.message : fallbackMessage);
  };

  useEffect(() => {
    // Real records are never written to browser storage (shared lab computers, DPDP).
    if (apiConfigured) return;
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
  }, [apiConfigured, data]);

  useEffect(() => {
    if (auth) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
      if (auth.token) {
        localStorage.setItem(LEGACY_AUTH_TOKEN_KEY, auth.token);
      } else {
        localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
      }
      return;
    }

    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
  }, [auth]);

  useEffect(() => {
    const handleSessionExpired = () => {
      setAuth(null);
      setMfaChallengeToken(null);
      setLoginErrorCode(undefined);
      setError('Your session has expired. Please sign in again.');
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, []);

  // The email verification link redirects here with ?verified=1 (or =invalid).
  const [notice, setNotice] = useState(() => {
    const verified = new URLSearchParams(window.location.search).get('verified');
    if (verified === '1') return 'Your email address is verified.';
    if (verified === 'invalid') return 'That verification link is not valid. Sign in and request a new one.';
    return '';
  });
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('verified')) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!apiConfigured || !auth?.token) {
      return;
    }

    fetchCampusBootstrap(auth.token)
      .then((response) => {
        setData(applyBrandAccents(response.data));
        setAuth((current) => (current ? { ...current, user: response.user } : current));
        setError('');
      })
      .catch((apiError) => {
        setAuth(null);
        if (isApiError(apiError) && apiError.status === 401) {
          setLoginNotice(SESSION_EXPIRED_NOTICE);
          setError('');
          return;
        }
        setError(apiError instanceof Error ? apiError.message : 'Unable to restore your session.');
      });
  }, [apiConfigured, auth?.token]);

  const completeAuth = (response: AuthResponse) => {
    setData(applyBrandAccents(response.data));
    setAuth({ token: response.token, user: response.user });
    setError('');
    setLoginErrorCode(undefined);
    setLoginNotice('');
    setMfaChallengeToken(null);
    setTenantError(null);
  };

  const handlePortalLogin = async (
    portal: LoginPortal,
    { email, password }: { email: string; password: string },
  ) => {
    if (apiConfigured) {
      try {
        const response = await loginWithCampusApi(email, password, portal);
        if (isMfaChallenge(response)) {
          setMfaChallengeToken(response.challengeToken);
          setError('');
          setLoginErrorCode(undefined);
          setLoginNotice('');
          return;
        }
        completeAuth(response);
      } catch (apiError) {
        // Portal-mismatch 403 renders the actionable switch link; non-portal 403s show the notice banner.
        if (isApiError(apiError) && apiError.status === 403) {
          if (apiError.code === 'use_owner_login' || apiError.code === 'use_campus_login') {
            setError(apiError.message);
            setLoginErrorCode(apiError.code);
            setLoginNotice('');
            return;
          }
          setLoginNotice(apiError.message);
          setError('');
          setLoginErrorCode(undefined);
          return;
        }
        setLoginNotice('');
        setLoginErrorCode(isApiError(apiError) ? apiError.code : undefined);
        setError(apiError instanceof Error ? apiError.message : 'Laravel API login failed.');
      }
      return;
    }

    if (portal === 'owner') {
      if (email.toLowerCase() === 'owner@demo.com' && password === 'demo123') {
        setAuth({
          user: {
            id: 900,
            name: 'Platform Owner',
            email: 'owner@demo.com',
            role: 'super_admin',
            title: 'Platform Owner',
            permissions: [],
            ownerPermissions: Object.values(OWNER),
            platformRole: 'Platform Owner',
            mfaEnabled: false,
            emailVerified: true,
          },
        });
        setError('');
        setLoginErrorCode(undefined);
        setLoginNotice('');
        setMfaChallengeToken(null);
        setTenantError(null);
        return;
      }

      const campusAccount = data.users.find(
        (candidate) => candidate.email.toLowerCase() === email.toLowerCase() && candidate.password === password,
      );
      if (campusAccount && !isPlatformRole(campusAccount.role)) {
        setLoginNotice('');
        setLoginErrorCode('use_campus_login');
        setError('Institution accounts must sign in through the Campus Workspace (/login).');
        return;
      }

      setLoginNotice('');
      setLoginErrorCode(undefined);
      setError('Use the demo owner account (owner@demo.com / demo123).');
      return;
    }

    if (email.toLowerCase() === 'owner@demo.com' && password === 'demo123') {
      setLoginNotice('');
      setLoginErrorCode('use_owner_login');
      setError('Platform owner accounts must sign in through the Owner Console (/owner/login).');
      return;
    }

    const account = data.users.find(
      (candidate) => candidate.email.toLowerCase() === email.toLowerCase() && candidate.password === password,
    );

    if (!account) {
      setLoginNotice('');
      setLoginErrorCode(undefined);
      setError('Use one of the demo accounts and the password demo123.');
      return;
    }

    if (isPlatformRole(account.role)) {
      setLoginNotice('');
      setLoginErrorCode('use_owner_login');
      setError('Platform owner accounts must sign in through the Owner Console (/owner/login).');
      return;
    }

    setAuth({ user: toSessionUser(account) });
    setError('');
    setLoginErrorCode(undefined);
    setLoginNotice('');
    setMfaChallengeToken(null);
    setTenantError(null);
  };

  const handleVerifyMfa = async (challengeToken: string, code: string) => {
    try {
      const response = await verifyOwnerMfa(challengeToken, code);
      completeAuth(response);
    } catch (apiError) {
      setLoginNotice('');
      setLoginErrorCode(isApiError(apiError) ? apiError.code : undefined);
      setError(apiError instanceof Error ? apiError.message : 'Two-factor verification failed.');
    }
  };

  const requireToken = () => {
    if (!auth?.token) {
      throw new Error('Your session has expired. Please sign in again.');
    }

    return auth.token;
  };

  const replaceDataFromApi = async (work: (token: string) => Promise<{ data: CampusData }>) => {
    const token = requireToken();
    const response = await work(token);
    setData(applyBrandAccents(response.data));
    setError('');
  };

  // Merge a single student (and, for admins, its login account) instead of reloading the whole dataset.
  const applyStudentRecord = (response: StudentRecordResponse) => {
    setData((current) =>
      applyBrandAccents({
        ...current,
        students: upsertById(current.students, response.student),
        users: response.user ? upsertById(current.users, response.user) : current.users,
      }),
    );
    setError('');
  };

  const handleResetDemo = async () => {
    if (apiConfigured) {
      try {
        const response = await resetCampusDemo(requireToken());
        setData(applyBrandAccents(response.data));
        setAuth((current) => (current ? { ...current, user: response.user } : current));
        setError('');
      } catch (apiError) {
        reportApiError(apiError, 'Unable to reset Laravel demo data.');
      }
      return;
    }

    const freshData = applyBrandAccents(createCampusDemoData());
    setData(freshData);

    if (auth?.user) {
      const refreshedUser = freshData.users.find((candidate) => candidate.email === auth.user.email);
      setAuth(refreshedUser ? { user: toSessionUser(refreshedUser) } : null);
    }
  };

  const handleCreateStudent = async (payload: {
    name: string;
    email: string;
    departmentCode?: string;
    year: string;
    gender: string;
    status: string;
    cgpa: number;
    attendance: number;
    phone?: string;
    feeStatus: string;
    password?: string;
    skills: string[];
  }) => {
    if (apiConfigured) {
      try {
        applyStudentRecord(await createStudentWithCampusApi(requireToken(), payload));
      } catch (apiError) {
        reportApiError(apiError, 'Unable to create the student.');
        throw apiError;
      }
      return;
    }

    const user = auth?.user;
    if (!user) {
      return;
    }

    const duplicateAccount = data.users.find((candidate) => candidate.email.toLowerCase() === payload.email.toLowerCase());
    if (duplicateAccount) {
      const duplicateError = new Error('An account with this email already exists.');
      setError(duplicateError.message);
      throw duplicateError;
    }

    const nextId = Math.max(0, ...data.students.map((student) => student.id)) + 1;
    const nextUserId = Math.max(0, ...data.users.map((account) => account.id)) + 1;
    const departmentCode = user.role === 'staff' ? user.departmentCode ?? payload.departmentCode ?? 'CSE' : payload.departmentCode ?? 'CSE';
    const mentor =
      user.role === 'staff'
        ? user.name
        : data.departments.find((department) => department.code === departmentCode)?.hod ?? user.name;

    setData((current) =>
      applyBrandAccents({
        ...current,
        users: [
          ...current.users,
          {
            id: nextUserId,
            name: payload.name,
            email: payload.email,
            password: payload.password,
            role: 'student',
            title: 'Student Applicant',
            departmentCode,
            studentId: nextId,
            permissions: [...campusRolePermissions.student],
          },
        ],
        students: [
          {
            id: nextId,
            name: payload.name,
            email: payload.email,
            registrationNumber: `BIT26${departmentCode}${String(nextId).padStart(3, '0')}`,
            departmentCode,
            year: payload.year,
            gender: payload.gender,
            status: payload.status,
            cgpa: payload.cgpa,
            attendance: payload.attendance,
            phone: payload.phone || '+1 555-0199',
            mentor,
            feeStatus: payload.feeStatus,
            appliedCompanyIds: [],
            skills: payload.skills,
            resume: createDefaultCampusStudentResume({
              departmentCode,
              skills: payload.skills,
              phone: payload.phone || '+1 555-0199',
              name: payload.name,
              email: payload.email,
            }),
          },
          ...current.students,
        ],
      }),
    );
    setError('');
  };

  const handleUpdateStudent = async (
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
      feeStatus: string;
      password?: string;
      skills: string[];
    },
  ) => {
    if (apiConfigured) {
      try {
        applyStudentRecord(await updateStudentWithCampusApi(requireToken(), studentId, payload));
      } catch (apiError) {
        reportApiError(apiError, 'Unable to update the student.');
        throw apiError;
      }
      return;
    }

    const existingStudent = data.students.find((student) => student.id === studentId);
    if (!existingStudent) {
      const missingError = new Error('Student record not found.');
      setError(missingError.message);
      throw missingError;
    }

    const duplicateAccount = data.users.find(
      (candidate) => candidate.email.toLowerCase() === payload.email.toLowerCase() && candidate.studentId !== studentId,
    );
    if (duplicateAccount) {
      const duplicateError = new Error('An account with this email already exists.');
      setError(duplicateError.message);
      throw duplicateError;
    }

    const duplicateStudent = data.students.find(
      (candidate) => candidate.email.toLowerCase() === payload.email.toLowerCase() && candidate.id !== studentId,
    );
    if (duplicateStudent) {
      const duplicateError = new Error('A student with this email already exists.');
      setError(duplicateError.message);
      throw duplicateError;
    }

    const departmentCode = payload.departmentCode ?? existingStudent.departmentCode;
    const mentor = data.departments.find((department) => department.code === departmentCode)?.hod ?? existingStudent.mentor;

    setData((current) =>
      applyBrandAccents({
        ...current,
        students: current.students.map((student) =>
          student.id === studentId
            ? {
                ...student,
                name: payload.name,
                email: payload.email,
                departmentCode,
                year: payload.year,
                gender: payload.gender,
                status: payload.status,
                cgpa: payload.cgpa,
                attendance: payload.attendance,
                phone: payload.phone || '',
                mentor,
                feeStatus: payload.feeStatus,
                skills: payload.skills,
              }
            : student,
        ),
        users: current.users.map((account) =>
          account.studentId === studentId || account.email.toLowerCase() === existingStudent.email.toLowerCase()
            ? {
                ...account,
                name: payload.name,
                email: payload.email,
                departmentCode,
                ...(payload.password ? { password: payload.password } : {}),
              }
            : account,
        ),
      }),
    );
    setError('');
  };

  const handleDeleteStudent = async (studentId: number) => {
    if (apiConfigured) {
      try {
        await deleteStudentWithCampusApi(requireToken(), studentId);
        setData((current) => ({
          ...current,
          students: current.students.filter((student) => student.id !== studentId),
          users: current.users.filter((account) => account.studentId !== studentId),
        }));
        setError('');
      } catch (apiError) {
        reportApiError(apiError, 'Unable to delete the student.');
        throw apiError;
      }
      return;
    }

    const existingStudent = data.students.find((student) => student.id === studentId);
    if (!existingStudent) {
      const missingError = new Error('Student record not found.');
      setError(missingError.message);
      throw missingError;
    }

    setData((current) => ({
      ...current,
      students: current.students.filter((student) => student.id !== studentId),
      users: current.users.filter(
        (account) => account.studentId !== studentId && account.email.toLowerCase() !== existingStudent.email.toLowerCase(),
      ),
      companies: current.companies.map((company) =>
        existingStudent.appliedCompanyIds.includes(company.id)
          ? { ...company, applicants: Math.max(company.applicants - 1, 0) }
          : company,
      ),
    }));
    setError('');
  };

  const handleCreateDepartment = async (payload: {
    name: string;
    code: string;
    description: string;
    hod: string;
    staffCount: number;
    intake: number;
  }) => {
    if (apiConfigured) {
      try {
        await replaceDataFromApi((token) => createDepartmentWithCampusApi(token, payload));
      } catch (apiError) {
        reportApiError(apiError, 'Unable to create the department.');
        throw apiError;
      }
      return;
    }

    const nextId = Math.max(0, ...data.departments.map((department) => department.id)) + 1;

    setData((current) => {
      // Find the HOD designation
      const hodDesignation = current.designations.find((d) => d.name.toLowerCase().includes('head of department') || d.name.toLowerCase().includes('hod'));
      
      return {
        ...current,
        departments: [
          ...current.departments,
          {
            id: nextId,
            name: payload.name,
            code: payload.code.trim().toUpperCase(),
            description: payload.description,
            hod: payload.hod,
            staffCount: payload.staffCount,
            intake: payload.intake,
            accent: getDepartmentAccent(payload.code.trim().toUpperCase()),
          },
        ],
        users: current.users.map((account) => {
          // Update staff designation if they are the HOD
          if (account.role === 'staff' && account.name === payload.hod && hodDesignation) {
            return {
              ...account,
              designationId: hodDesignation.id,
              designationName: hodDesignation.name,
              permissions: hodDesignation.permissions,
              departmentCode: payload.code.trim().toUpperCase(),
            };
          }
          return account;
        }),
      };
    });
    setError('');
  };

  const handleUpdateDepartment = async (
    departmentId: number,
    payload: {
      name: string;
      code: string;
      description: string;
      hod: string;
      staffCount: number;
      intake: number;
    },
  ) => {
    if (apiConfigured) {
      try {
        await replaceDataFromApi((token) => updateDepartmentWithCampusApi(token, departmentId, payload));
      } catch (apiError) {
        reportApiError(apiError, 'Unable to update the department.');
        throw apiError;
      }
      return;
    }

    const existingDepartment = data.departments.find((department) => department.id === departmentId);
    if (!existingDepartment) {
      const missingError = new Error('Department record not found.');
      setError(missingError.message);
      throw missingError;
    }

    const nextCode = payload.code.trim().toUpperCase();
    const duplicateDepartment = data.departments.find(
      (department) => department.code === nextCode && department.id !== departmentId,
    );
    if (duplicateDepartment) {
      const duplicateError = new Error('A department with this code already exists.');
      setError(duplicateError.message);
      throw duplicateError;
    }

    setData((current) => {
      // Find the HOD designation
      const hodDesignation = current.designations.find((d) => d.name.toLowerCase().includes('head of department') || d.name.toLowerCase().includes('hod'));
      
      return {
        ...current,
        departments: current.departments.map((department) =>
          department.id === departmentId
            ? {
                ...department,
                name: payload.name,
                code: nextCode,
                description: payload.description,
                hod: payload.hod,
                staffCount: payload.staffCount,
                intake: payload.intake,
                accent: getDepartmentAccent(nextCode),
              }
            : department,
        ),
        students: current.students.map((student) =>
          student.departmentCode === existingDepartment.code
            ? {
                ...student,
                departmentCode: nextCode,
                mentor: payload.hod,
              }
            : student,
        ),
        users: current.users.map((account) => {
          // Update staff designation if they are the new HOD
          if (account.role === 'staff' && account.name === payload.hod && hodDesignation) {
            return {
              ...account,
              designationId: hodDesignation.id,
              designationName: hodDesignation.name,
              permissions: hodDesignation.permissions,
              departmentCode: nextCode,
            };
          }
          // Update department code for staff in this department
          if (account.departmentCode === existingDepartment.code) {
            return {
              ...account,
              departmentCode: nextCode,
            };
          }
          return account;
        }),
        companies: current.companies.map((company) =>
          company.eligibleDepartments.includes(existingDepartment.code)
            ? {
                ...company,
                eligibleDepartments: company.eligibleDepartments.map((code) =>
                  code === existingDepartment.code ? nextCode : code,
                ),
              }
            : company,
        ),
      };
    });
    setError('');
  };

  const handleDeleteDepartment = async (departmentId: number) => {
    if (apiConfigured) {
      try {
        await replaceDataFromApi((token) => deleteDepartmentWithCampusApi(token, departmentId));
      } catch (apiError) {
        reportApiError(apiError, 'Unable to delete the department.');
        throw apiError;
      }
      return;
    }

    const existingDepartment = data.departments.find((department) => department.id === departmentId);
    if (!existingDepartment) {
      const missingError = new Error('Department record not found.');
      setError(missingError.message);
      throw missingError;
    }

    const inUse =
      data.students.some((student) => student.departmentCode === existingDepartment.code) ||
      data.users.some((account) => account.departmentCode === existingDepartment.code) ||
      data.companies.some((company) => company.eligibleDepartments.includes(existingDepartment.code));

    if (inUse) {
      const inUseError = new Error('This department is still in use. Reassign linked students or drives before deleting it.');
      setError(inUseError.message);
      throw inUseError;
    }

    setData((current) => ({
      ...current,
      departments: current.departments.filter((department) => department.id !== departmentId),
    }));
    setError('');
  };

  const handleCreateCompany = async (payload: {
    name: string;
    role: string;
    packageOffered: string;
    driveDate: string;
    status: string;
    location: string;
    type: string;
    eligibleDepartments: string[];
  }) => {
    if (apiConfigured) {
      try {
        await replaceDataFromApi((token) => createCompanyWithCampusApi(token, payload));
      } catch (apiError) {
        reportApiError(apiError, 'Unable to create the company drive.');
        throw apiError;
      }
      return;
    }

    const nextId = Math.max(0, ...data.companies.map((company) => company.id)) + 1;

    setData((current) =>
      applyBrandAccents({
        ...current,
        companies: [
          {
            id: nextId,
            name: payload.name,
            role: payload.role,
            packageOffered: payload.packageOffered,
            driveDate: payload.driveDate,
            status: payload.status,
            location: payload.location,
            type: payload.type,
            applicants: 0,
            shortlisted: 0,
            eligibleDepartments: payload.eligibleDepartments,
          },
          ...current.companies,
        ],
      }),
    );
    setError('');
  };

  const handleUpdateCompany = async (
    companyId: number,
    payload: {
      name: string;
      role: string;
      packageOffered: string;
      driveDate: string;
      status: string;
      location: string;
      type: string;
      eligibleDepartments: string[];
    },
  ) => {
    if (apiConfigured) {
      try {
        await replaceDataFromApi((token) => updateCompanyWithCampusApi(token, companyId, payload));
      } catch (apiError) {
        reportApiError(apiError, 'Unable to update the company drive.');
        throw apiError;
      }
      return;
    }

    setData((current) =>
      applyBrandAccents({
        ...current,
        companies: current.companies.map((company) =>
          company.id === companyId
            ? {
                ...company,
                name: payload.name,
                role: payload.role,
                packageOffered: payload.packageOffered,
                driveDate: payload.driveDate,
                status: payload.status,
                location: payload.location,
                type: payload.type,
                eligibleDepartments: payload.eligibleDepartments,
              }
            : company,
        ),
      }),
    );
    setError('');
  };

  const handleDeleteCompany = async (companyId: number) => {
    if (apiConfigured) {
      try {
        await replaceDataFromApi((token) => deleteCompanyWithCampusApi(token, companyId));
      } catch (apiError) {
        reportApiError(apiError, 'Unable to delete the company drive.');
        throw apiError;
      }
      return;
    }

    setData((current) => ({
      ...current,
      companies: current.companies.filter((company) => company.id !== companyId),
      students: current.students.map((student) => ({
        ...student,
        appliedCompanyIds: student.appliedCompanyIds.filter((id) => id !== companyId),
      })),
    }));
    setError('');
  };

  const handleCreateAnnouncement = async (payload: {
    title: string;
    summary: string;
    audience: string;
    priority: string;
    category: string;
  }) => {
    if (apiConfigured) {
      try {
        await replaceDataFromApi((token) => createAnnouncementWithCampusApi(token, payload));
      } catch (apiError) {
        reportApiError(apiError, 'Unable to create the announcement.');
        throw apiError;
      }
      return;
    }

    const nextId = Math.max(0, ...data.announcements.map((announcement) => announcement.id)) + 1;

    setData((current) =>
      applyBrandAccents({
        ...current,
        announcements: [
          {
            id: nextId,
            title: payload.title,
            summary: payload.summary,
            audience: payload.audience,
            priority: payload.priority,
            postedBy: auth?.user.name ?? 'Campus Team',
            date: '2026-04-05',
            category: payload.category,
          },
          ...current.announcements,
        ],
      }),
    );
    setError('');
  };

  const handleUpdateAnnouncement = async (
    announcementId: number,
    payload: {
      title: string;
      summary: string;
      audience: string;
      priority: string;
      category: string;
    },
  ) => {
    if (apiConfigured) {
      try {
        await replaceDataFromApi((token) => updateAnnouncementWithCampusApi(token, announcementId, payload));
      } catch (apiError) {
        reportApiError(apiError, 'Unable to update the announcement.');
        throw apiError;
      }
      return;
    }

    setData((current) =>
      applyBrandAccents({
        ...current,
        announcements: current.announcements.map((announcement) =>
          announcement.id === announcementId
            ? {
                ...announcement,
                title: payload.title,
                summary: payload.summary,
                audience: payload.audience,
                priority: payload.priority,
                category: payload.category,
              }
            : announcement,
        ),
      }),
    );
    setError('');
  };

  const handleDeleteAnnouncement = async (announcementId: number) => {
    if (apiConfigured) {
      try {
        await replaceDataFromApi((token) => deleteAnnouncementWithCampusApi(token, announcementId));
      } catch (apiError) {
        reportApiError(apiError, 'Unable to delete the announcement.');
        throw apiError;
      }
      return;
    }

    setData((current) => ({
      ...current,
      announcements: current.announcements.filter((announcement) => announcement.id !== announcementId),
    }));
    setError('');
  };

  const handleUpdateProfile = async (payload: { name: string; email: string; title: string; password?: string }) => {
    if (!auth?.user) {
      return;
    }

    if (apiConfigured) {
      try {
        const response = await updateCampusProfile(requireToken(), payload);
        setData(applyBrandAccents(response.data));
        setAuth((current) => (current ? { ...current, user: response.user } : current));
        setError('');
      } catch (apiError) {
        reportApiError(apiError, 'Unable to update your profile.');
        throw apiError;
      }
      return;
    }

    const duplicateAccount = data.users.find(
      (candidate) => candidate.email.toLowerCase() === payload.email.toLowerCase() && candidate.id !== auth.user.id,
    );
    if (duplicateAccount) {
      const duplicateError = new Error('An account with this email already exists.');
      setError(duplicateError.message);
      throw duplicateError;
    }

    setData((current) => ({
      ...current,
      users: current.users.map((account) =>
        account.id === auth.user.id
          ? {
              ...account,
              name: payload.name,
              email: payload.email,
              title: payload.title,
              ...(payload.password ? { password: payload.password } : {}),
            }
          : account,
      ),
      students: current.students.map((student) =>
        student.id === auth.user.studentId
          ? {
              ...student,
              name: payload.name,
              email: payload.email,
            }
          : student,
      ),
    }));
    setAuth((current) =>
      current
        ? {
            ...current,
            user: {
              ...current.user,
              name: payload.name,
              email: payload.email,
              title: payload.title,
            },
          }
        : current,
    );
    setError('');
  };

  const handleUpdateStudentResume = async (payload: CampusStudentResume) => {
    if (!auth?.user?.studentId) {
      return;
    }

    if (apiConfigured) {
      try {
        await replaceDataFromApi((token) => updateStudentResumeWithCampusApi(token, payload));
      } catch (apiError) {
        reportApiError(apiError, 'Unable to save the resume profile.');
        throw apiError;
      }
      return;
    }

    setData((current) =>
      applyBrandAccents({
        ...current,
        students: current.students.map((student) =>
          student.id === auth.user.studentId
            ? {
                ...student,
                resume: normalizeCampusStudentResume(payload, student),
              }
            : student,
        ),
      }),
    );
    setError('');
  };

  const handleCreateStaff = async (payload: {
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
  }) => {
    if (apiConfigured) {
      try {
        await replaceDataFromApi((token) =>
          createStaffWithCampusApi(token, {
            ...payload,
            permissions: extractAssignablePermissions(payload.permissions),
          }),
        );
      } catch (apiError) {
        reportApiError(apiError, 'Unable to create the staff account.');
        throw apiError;
      }
      return;
    }

    const duplicateAccount = data.users.find((candidate) => candidate.email.toLowerCase() === payload.email.toLowerCase());
    if (duplicateAccount) {
      const duplicateError = new Error('An account with this email already exists.');
      setError(duplicateError.message);
      throw duplicateError;
    }

    const designation = data.designations.find((candidate) => candidate.id === payload.designationId);
    if (!designation) {
      const designationError = new Error('Choose a valid designation before saving the staff account.');
      setError(designationError.message);
      throw designationError;
    }

    const nextUserId = Math.max(0, ...data.users.map((account) => account.id)) + 1;

    setData((current) =>
      applyBrandAccents({
        ...current,
        users: [
          ...current.users,
          {
            id: nextUserId,
            name: payload.name,
            email: payload.email,
            password: payload.password,
            role: 'staff',
            title: designation.name,
            departmentCode: payload.departmentCode,
            designationId: designation.id,
            designationName: designation.name,
            permissions: normalizeStaffPermissions(payload.permissions),
          },
        ],
      }),
    );
    setError('');
  };

  const handleUpdateStaff = async (
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
  ) => {
    if (apiConfigured) {
      try {
        await replaceDataFromApi((token) =>
          updateStaffWithCampusApi(token, staffId, {
            ...payload,
            permissions: extractAssignablePermissions(payload.permissions),
          }),
        );
      } catch (apiError) {
        reportApiError(apiError, 'Unable to update the staff account.');
        throw apiError;
      }
      return;
    }

    const duplicateAccount = data.users.find(
      (candidate) => candidate.email.toLowerCase() === payload.email.toLowerCase() && candidate.id !== staffId,
    );
    if (duplicateAccount) {
      const duplicateError = new Error('An account with this email already exists.');
      setError(duplicateError.message);
      throw duplicateError;
    }

    const designation = data.designations.find((candidate) => candidate.id === payload.designationId);
    if (!designation) {
      const designationError = new Error('Choose a valid designation before saving the staff account.');
      setError(designationError.message);
      throw designationError;
    }

    setData((current) =>
      applyBrandAccents({
        ...current,
        users: current.users.map((account) =>
          account.id === staffId
            ? {
                ...account,
                name: payload.name,
                email: payload.email,
                title: designation.name,
                departmentCode: payload.departmentCode,
                designationId: designation.id,
                designationName: designation.name,
                permissions: normalizeStaffPermissions(payload.permissions),
                ...(payload.password ? { password: payload.password } : {}),
              }
            : account,
        ),
      }),
    );
    setError('');
  };

  const handleDeleteStaff = async (staffId: number) => {
    if (apiConfigured) {
      try {
        await replaceDataFromApi((token) => deleteStaffWithCampusApi(token, staffId));
      } catch (apiError) {
        reportApiError(apiError, 'Unable to delete the staff account.');
        throw apiError;
      }
      return;
    }

    setData((current) =>
      applyBrandAccents({
        ...current,
        users: current.users.filter((account) => account.id !== staffId),
      }),
    );
    setError('');
  };

  const handleCreateDesignation = async (payload: {
    name: string;
    departmentCode?: string;
    description?: string;
    permissions: CampusPermission[];
    customFields?: CustomFieldValues;
  }) => {
    if (apiConfigured) {
      try {
        const selectedDepartment = payload.departmentCode
          ? data.departments.find(
              (department) => department.code.trim().toUpperCase() === payload.departmentCode?.trim().toUpperCase(),
            )
          : undefined;

        await replaceDataFromApi((token) =>
          createDesignationWithCampusApi(token, {
            ...payload,
            department_id: selectedDepartment?.id ?? null,
            permissions: extractAssignablePermissions(payload.permissions),
          }),
        );
      } catch (apiError) {
        reportApiError(apiError, 'Unable to create the designation.');
        throw apiError;
      }
      return;
    }

    const name = payload.name.trim();
    const slug = slugifyDesignation(name);
    const duplicateDesignation = data.designations.find(
      (candidate) =>
        candidate.name.trim().toLowerCase() === name.toLowerCase() || candidate.slug.trim().toLowerCase() === slug,
    );
    if (duplicateDesignation) {
      const duplicateError = new Error('A designation with this name already exists.');
      setError(duplicateError.message);
      throw duplicateError;
    }

    const nextDesignationId = Math.max(0, ...data.designations.map((designation) => designation.id)) + 1;

    setData((current) =>
      applyBrandAccents({
        ...current,
        designations: [
          {
            id: nextDesignationId,
            name,
            slug,
            description: payload.description?.trim() ?? '',
            permissions: normalizeStaffPermissions(payload.permissions),
            staffCount: 0,
          },
          ...current.designations,
        ],
      }),
    );
    setError('');
  };

  const handleUpdateDesignation = async (
    designationId: number,
    payload: {
      name: string;
      departmentCode?: string;
      description?: string;
      permissions: CampusPermission[];
      customFields?: CustomFieldValues;
    },
  ) => {
    if (apiConfigured) {
      try {
        const selectedDepartment = payload.departmentCode
          ? data.departments.find(
              (department) => department.code.trim().toUpperCase() === payload.departmentCode?.trim().toUpperCase(),
            )
          : undefined;

        await replaceDataFromApi((token) =>
          updateDesignationWithCampusApi(token, designationId, {
            ...payload,
            department_id: selectedDepartment?.id ?? null,
            permissions: extractAssignablePermissions(payload.permissions),
          }),
        );
      } catch (apiError) {
        reportApiError(apiError, 'Unable to update the designation.');
        throw apiError;
      }
      return;
    }

    const existingDesignation = data.designations.find((designation) => designation.id === designationId);
    if (!existingDesignation) {
      const missingError = new Error('Designation record not found.');
      setError(missingError.message);
      throw missingError;
    }

    const name = payload.name.trim();
    const slug = slugifyDesignation(name);
    const duplicateDesignation = data.designations.find(
      (candidate) =>
        candidate.id !== designationId &&
        (candidate.name.trim().toLowerCase() === name.toLowerCase() || candidate.slug.trim().toLowerCase() === slug),
    );
    if (duplicateDesignation) {
      const duplicateError = new Error('A designation with this name already exists.');
      setError(duplicateError.message);
      throw duplicateError;
    }

    const nextPermissions = normalizeStaffPermissions(payload.permissions);

    setData((current) =>
      applyBrandAccents({
        ...current,
        designations: current.designations.map((designation) =>
          designation.id === designationId
            ? {
                ...designation,
                name,
                slug,
                description: payload.description?.trim() ?? '',
                permissions: nextPermissions,
              }
            : designation,
        ),
        users: current.users.map((account) =>
          isInstitutionStaffRole(account.role) && account.designationId === designationId
            ? {
                ...account,
                title: name,
                designationName: name,
                permissions: nextPermissions,
              }
            : account,
        ),
      }),
    );
    setError('');
  };

  const handleDeleteDesignation = async (designationId: number) => {
    if (apiConfigured) {
      try {
        await replaceDataFromApi((token) => deleteDesignationWithCampusApi(token, designationId));
      } catch (apiError) {
        reportApiError(apiError, 'Unable to delete the designation.');
        throw apiError;
      }
      return;
    }

    const existingDesignation = data.designations.find((designation) => designation.id === designationId);
    if (!existingDesignation) {
      const missingError = new Error('Designation record not found.');
      setError(missingError.message);
      throw missingError;
    }

    // Placement officers keep their designation as a job title, so they count as linked staff too.
    const linkedStaff = data.users.some(
      (account) => isInstitutionStaffRole(account.role) && account.designationId === designationId,
    );
    if (linkedStaff) {
      const inUseError = new Error('This designation is still assigned to staff accounts. Reassign those staff members before deleting it.');
      setError(inUseError.message);
      throw inUseError;
    }

    setData((current) =>
      applyBrandAccents({
        ...current,
        designations: current.designations.filter((designation) => designation.id !== designationId),
      }),
    );
    setError('');
  };

  const handleCreateMaster = async (payload: {
    category: CampusMasterCategory;
    label: string;
    description?: string;
    sortOrder: number;
  }) => {
    if (apiConfigured) {
      try {
        await replaceDataFromApi((token) => createMasterWithCampusApi(token, payload));
      } catch (apiError) {
        reportApiError(apiError, 'Unable to create the master option.');
        throw apiError;
      }
      return;
    }

    const code = slugifyMasterCode(payload.label);
    const duplicateMaster = data.masters.find(
      (master) => master.category === payload.category && (master.code === code || master.label.trim().toLowerCase() === payload.label.trim().toLowerCase()),
    );
    if (duplicateMaster) {
      const duplicateError = new Error(`A value with this label already exists in ${campusMasterCategoryLabels[payload.category]}.`);
      setError(duplicateError.message);
      throw duplicateError;
    }

    const nextMasterId = Math.max(0, ...data.masters.map((master) => master.id)) + 1;
    setData((current) =>
      applyBrandAccents({
        ...current,
        masters: [
          ...current.masters,
          {
            id: nextMasterId,
            category: payload.category,
            code,
            label: payload.label.trim(),
            description: payload.description?.trim() ?? '',
            sortOrder: payload.sortOrder,
          },
        ],
      }),
    );
    setError('');
  };

  const handleUpdateMaster = async (
    masterId: number,
    payload: {
      category: CampusMasterCategory;
      label: string;
      description?: string;
      sortOrder: number;
    },
  ) => {
    if (apiConfigured) {
      try {
        await replaceDataFromApi((token) => updateMasterWithCampusApi(token, masterId, payload));
      } catch (apiError) {
        reportApiError(apiError, 'Unable to update the master option.');
        throw apiError;
      }
      return;
    }

    const existingMaster = data.masters.find((master) => master.id === masterId);
    if (!existingMaster) {
      const missingError = new Error('Master option not found.');
      setError(missingError.message);
      throw missingError;
    }

    const duplicateMaster = data.masters.find(
      (master) =>
        master.id !== masterId &&
        master.category === existingMaster.category &&
        master.label.trim().toLowerCase() === payload.label.trim().toLowerCase(),
    );
    if (duplicateMaster) {
      const duplicateError = new Error(`A value with this label already exists in ${campusMasterCategoryLabels[existingMaster.category]}.`);
      setError(duplicateError.message);
      throw duplicateError;
    }

    setData((current) =>
      applyBrandAccents({
        ...current,
        masters: current.masters.map((master) =>
          master.id === masterId
            ? {
                ...master,
                label: payload.label.trim(),
                description: payload.description?.trim() ?? '',
                sortOrder: payload.sortOrder,
              }
            : master,
        ),
      }),
    );
    setError('');
  };

  const handleDeleteMaster = async (masterId: number) => {
    if (apiConfigured) {
      try {
        await replaceDataFromApi((token) => deleteMasterWithCampusApi(token, masterId));
      } catch (apiError) {
        reportApiError(apiError, 'Unable to delete the master option.');
        throw apiError;
      }
      return;
    }

    const existingMaster = data.masters.find((master) => master.id === masterId);
    if (!existingMaster) {
      const missingError = new Error('Master option not found.');
      setError(missingError.message);
      throw missingError;
    }

    const masterInUse =
      (existingMaster.category === 'student_gender' && data.students.some((student) => student.gender === existingMaster.code)) ||
      (existingMaster.category === 'student_year' && data.students.some((student) => student.year === existingMaster.code)) ||
      (existingMaster.category === 'student_status' && data.students.some((student) => student.status === existingMaster.code)) ||
      (existingMaster.category === 'payment_status' && data.students.some((student) => student.feeStatus === existingMaster.code)) ||
      (existingMaster.category === 'company_drive_status' && data.companies.some((company) => company.status === existingMaster.code)) ||
      (existingMaster.category === 'company_drive_type' && data.companies.some((company) => company.type === existingMaster.code)) ||
      (existingMaster.category === 'announcement_audience' && data.announcements.some((announcement) => announcement.audience === existingMaster.code)) ||
      (existingMaster.category === 'announcement_priority' && data.announcements.some((announcement) => announcement.priority === existingMaster.code));

    if (masterInUse) {
      const inUseError = new Error('This master option is still used by campus records. Update those records before deleting it.');
      setError(inUseError.message);
      throw inUseError;
    }

    setData((current) =>
      applyBrandAccents({
        ...current,
        masters: current.masters.filter((master) => master.id !== masterId),
      }),
    );
    setError('');
  };

  const handleApplyToCompany = async (companyId: number) => {
    if (apiConfigured) {
      try {
        await replaceDataFromApi((token) => applyToCompanyWithCampusApi(token, companyId));
      } catch (apiError) {
        reportApiError(apiError, 'Unable to submit the application.');
        throw apiError;
      }
      return;
    }

    const currentUser = auth?.user;
    const currentStudent = currentUser?.studentId
      ? data.students.find((student) => student.id === currentUser.studentId) ?? null
      : null;

    if (!currentStudent || currentStudent.appliedCompanyIds.includes(companyId)) {
      return;
    }

    setData((current) => ({
      ...current,
      students: current.students.map((student) =>
        student.id === currentStudent.id
          ? { ...student, appliedCompanyIds: [...student.appliedCompanyIds, companyId] }
          : student,
      ),
      companies: current.companies.map((company) =>
        company.id === companyId ? { ...company, applicants: company.applicants + 1 } : company,
      ),
    }));
    setError('');
  };

  const handleLogout = async () => {
    const wasPlatform = auth?.user ? isPlatformRole(auth.user.role) : false;

    if (apiConfigured && auth?.token) {
      try {
        await logoutFromCampusApi(auth.token);
      } catch {
        // Clear the local session even if the token is already invalid server-side.
      }
    }

    setAuth(null);
    if (apiConfigured) {
      // Drop the signed-in user's campus records from memory too.
      setData(applyBrandAccents(createCampusDemoData()));
    }
    setMfaChallengeToken(null);
    setError('');
    setLoginErrorCode(undefined);
    setLoginNotice('');
    navigate(wasPlatform ? '/owner/login' : '/login', { replace: true });
  };

  const handleInvitationAccepted = (response: AuthResponse) => {
    completeAuth(response);
  };

  if (!auth?.user) {
    const campusLoginElement = (
      <>
        <CampusLogin
          error={error}
          notice={loginNotice}
          errorCode={loginErrorCode}
          onLogin={(credentials) => handlePortalLogin('campus', credentials)}
        />
        <AccountNotice message={notice} onDismiss={() => setNotice('')} />
      </>
    );

    const ownerLoginElement = (
      <>
        <OwnerLogin
          error={error}
          notice={loginNotice}
          errorCode={loginErrorCode}
          mfaChallengeToken={mfaChallengeToken}
          onLogin={(credentials) => handlePortalLogin('owner', credentials)}
          onVerifyMfa={handleVerifyMfa}
          onCancelMfa={() => {
            setMfaChallengeToken(null);
            setError('');
            setLoginErrorCode(undefined);
          }}
        />
        <AccountNotice message={notice} onDismiss={() => setNotice('')} />
      </>
    );

    // Signed out: separate entry pages for Campus Workspace (/login, campus deep links)
    // and Owner Console (/owner/login, /owner/*). Deep links stay in the address bar and open right after signing in.
    return (
      <Routes>
        <Route path="/owner/login" element={ownerLoginElement} />
        <Route path="/owner/*" element={ownerLoginElement} />
        <Route path="/login" element={campusLoginElement} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/invitations/accept" element={<AcceptInvitationPage onSignedIn={handleInvitationAccepted} />} />
        <Route path="*" element={campusLoginElement} />
      </Routes>
    );
  }

  if (isPlatformRole(auth.user.role)) {
    return (
      <>
        <AccountNotice message={notice} onDismiss={() => setNotice('')} />
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/invitations/accept" element={<AcceptInvitationPage onSignedIn={handleInvitationAccepted} />} />
          <Route path="/owner/login" element={<Navigate to="/owner/overview" replace />} />
          <Route path="/owner" element={<Navigate to="/owner/overview" replace />} />
          <Route
            path="/owner/:section/:id"
            element={
              <Suspense fallback={<PageLoading />}>
                <OwnerWorkspace user={auth.user} onLogout={handleLogout} />
              </Suspense>
            }
          />
          <Route
            path="/owner/:section"
            element={
              <Suspense fallback={<PageLoading />}>
                <OwnerWorkspace user={auth.user} onLogout={handleLogout} />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/owner/overview" replace />} />
        </Routes>
      </>
    );
  }

  const workspace = (
    <>
    <AccountNotice message={notice} onDismiss={() => setNotice('')} />
    {apiConfigured && auth.user.emailVerified === false ? <VerifyEmailReminder email={auth.user.email} /> : null}
    <CampusWorkspace
      error={error}
      tenantError={tenantError}
      onDismissTenantError={() => setTenantError(null)}
      user={auth.user}
      data={data}
      onLogout={handleLogout}
      onResetDemo={handleResetDemo}
      onCreateStudent={handleCreateStudent}
      onUpdateStudent={handleUpdateStudent}
      onDeleteStudent={handleDeleteStudent}
      onCreateDepartment={handleCreateDepartment}
      onUpdateDepartment={handleUpdateDepartment}
      onDeleteDepartment={handleDeleteDepartment}
      onCreateCompany={handleCreateCompany}
      onUpdateCompany={handleUpdateCompany}
      onDeleteCompany={handleDeleteCompany}
      onCreateAnnouncement={handleCreateAnnouncement}
      onUpdateAnnouncement={handleUpdateAnnouncement}
      onDeleteAnnouncement={handleDeleteAnnouncement}
      onUpdateProfile={handleUpdateProfile}
      onUpdateStudentResume={handleUpdateStudentResume}
      onCreateMaster={handleCreateMaster}
      onUpdateMaster={handleUpdateMaster}
      onDeleteMaster={handleDeleteMaster}
      onCreateDesignation={handleCreateDesignation}
      onUpdateDesignation={handleUpdateDesignation}
      onDeleteDesignation={handleDeleteDesignation}
      onCreateStaff={handleCreateStaff}
      onUpdateStaff={handleUpdateStaff}
      onDeleteStaff={handleDeleteStaff}
      onApplyToCompany={handleApplyToCompany}
    />
    </>
  );

  // Signed in: every page lives at /app/<page>; anything else opens the dashboard.
  return (
    <Routes>
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/invitations/accept" element={<AcceptInvitationPage onSignedIn={handleInvitationAccepted} />} />
      <Route path="/app/:tab" element={<Suspense fallback={<PageLoading />}>{workspace}</Suspense>} />
      <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
    </Routes>
  );
}

/** A dismissible status message, e.g. after following an email verification link. */
