<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\Company;
use App\Models\CompanyApplication;
use App\Models\Department;
use App\Models\Designation;
use App\Models\MasterOption;
use App\Models\Student;
use App\Models\User;
use App\Support\Campus\CampusPermission;
use App\Support\Campus\CampusDataService;
use App\Support\Campus\CampusMasterCatalog;
use App\Support\Campus\CampusStaffAccess;
use Database\Seeders\CampusDemoSeeder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CampusController extends Controller
{
    public function bootstrap(Request $request, CampusDataService $campusData): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'user' => $campusData->authenticatedUser($user),
            'data' => $campusData->buildForUser($user),
        ]);
    }

    public function reset(Request $request, CampusDataService $campusData): JsonResponse
    {
        abort_unless(
            config('app.demo_reset_enabled'),
            403,
            'Demo reset is disabled in this environment.'
        );

        /** @var User $actor */
        $actor = $request->user();

        Artisan::call('db:seed', [
            '--class' => CampusDemoSeeder::class,
            '--force' => true,
        ]);

        $user = User::query()
            ->with('student:id,user_id')
            ->findOrFail($actor->id);

        return response()->json([
            'user' => $campusData->authenticatedUser($user),
            'data' => $campusData->buildForUser($user),
        ]);
    }

    public function departments(Request $request, CampusDataService $campusData): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json($campusData->buildForUser($user)['departments']);
    }

    public function masters(Request $request, CampusDataService $campusData): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        abort_unless($user->role === 'admin', 403, 'Only admins can manage campus masters.');

        return response()->json($campusData->buildForUser($user)['masters']);
    }

    public function storeMaster(Request $request, CampusDataService $campusData): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        abort_unless($user->role === 'admin', 403, 'Only admins can manage campus masters.');

        $payload = $request->validate([
            'category' => ['required', Rule::in(CampusMasterCatalog::allowedCategories())],
            'label' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:255'],
            'sortOrder' => ['nullable', 'integer', 'min:1', 'max:999'],
        ]);

        $code = Str::slug($payload['label'], '_');
        abort_if(
            MasterOption::query()->where('category', $payload['category'])->where('code', $code)->exists(),
            422,
            'A master option with this label already exists in the selected category.'
        );

        MasterOption::query()->create([
            'category' => $payload['category'],
            'code' => $code,
            'label' => trim($payload['label']),
            'description' => $payload['description'] ?? null,
            'sort_order' => $payload['sortOrder'] ?? 1,
        ]);

        return response()->json([
            'data' => $campusData->buildForUser($user),
        ], 201);
    }

    public function updateMaster(Request $request, MasterOption $master, CampusDataService $campusData): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        abort_unless($user->role === 'admin', 403, 'Only admins can manage campus masters.');

        $payload = $request->validate([
            'label' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:255'],
            'sortOrder' => ['nullable', 'integer', 'min:1', 'max:999'],
        ]);

        $master->update([
            'label' => trim($payload['label']),
            'description' => $payload['description'] ?? null,
            'sort_order' => $payload['sortOrder'] ?? $master->sort_order,
        ]);

        return response()->json([
            'data' => $campusData->buildForUser($user),
        ]);
    }

    public function destroyMaster(Request $request, MasterOption $master, CampusDataService $campusData): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        abort_unless($user->role === 'admin', 403, 'Only admins can manage campus masters.');
        abort_if(
            $this->masterUsageCount($master) > 0,
            422,
            'This master option is still used by campus records. Update those records before deleting it.'
        );

        $master->delete();

        return response()->json([
            'data' => $campusData->buildForUser($user),
        ]);
    }

    public function designations(Request $request, CampusDataService $campusData): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        abort_unless($user->role === 'admin', 403, 'Only admins can manage designations.');

        return response()->json($campusData->buildForUser($user)['designations']);
    }

    public function storeDesignation(Request $request, CampusDataService $campusData): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        abort_unless($user->role === 'admin', 403, 'Only admins can manage designations.');

        $payload = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('designations', 'name')],
            'description' => ['nullable', 'string', 'max:1000'],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', Rule::in(CampusStaffAccess::assignablePermissions())],
        ]);

        $name = trim($payload['name']);
        $slug = Str::slug($name);
        abort_if(Designation::query()->where('slug', $slug)->exists(), 422, 'A designation with this name already exists.');

        $normalized = CampusStaffAccess::normalize($payload['permissions'] ?? []);

        Designation::query()->create([
            'name' => $name,
            'slug' => $slug,
            'description' => $payload['description'] ?? null,
            'permissions' => $normalized,
        ]);

        return response()->json([
            'data' => $campusData->buildForUser($user),
        ], 201);
    }

    public function updateDesignation(Request $request, Designation $designation, CampusDataService $campusData): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        abort_unless($user->role === 'admin', 403, 'Only admins can manage designations.');

        $payload = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('designations', 'name')->ignore($designation->id)],
            'description' => ['nullable', 'string', 'max:1000'],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', Rule::in(CampusStaffAccess::assignablePermissions())],
        ]);

        $name = trim($payload['name']);
        $slug = Str::slug($name);
        abort_if(
            Designation::query()->where('slug', $slug)->whereKeyNot($designation->id)->exists(),
            422,
            'A designation with this name already exists.'
        );

        DB::transaction(function () use ($designation, $payload, $name, $slug): void {
            $permissions = CampusStaffAccess::normalize($payload['permissions'] ?? []);

            $designation->update([
                'name' => $name,
                'slug' => $slug,
                'description' => $payload['description'] ?? null,
                'permissions' => $permissions,
            ]);

            $assignedStaff = User::query()
                ->where('designation_id', $designation->id)
                ->get();

            if ($assignedStaff->isNotEmpty()) {
                User::query()
                    ->whereKey($assignedStaff->pluck('id'))
                    ->update([
                        'title' => $name,
                    ]);
            }

            $assignedStaff->each(function (User $staff) use ($permissions): void {
                $rolePermissions = CampusPermission::byRole()[$staff->role] ?? [];
                $staff->syncPermissions(array_unique(array_merge($rolePermissions, $permissions)));
            });
        });

        return response()->json([
            'data' => $campusData->buildForUser($user),
        ]);
    }

    public function destroyDesignation(Request $request, Designation $designation, CampusDataService $campusData): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        abort_unless($user->role === 'admin', 403, 'Only admins can manage designations.');
        abort_if(
            User::query()->where('designation_id', $designation->id)->exists(),
            422,
            'This designation is still assigned to staff accounts. Reassign those staff members before deleting it.'
        );

        $designation->delete();

        return response()->json([
            'data' => $campusData->buildForUser($user),
        ]);
    }

    public function storeDepartment(Request $request, CampusDataService $campusData): JsonResponse
    {
        $payload = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:20', 'alpha_dash', Rule::unique('departments', 'code')],
            'hod' => ['required', 'string', 'max:255'],
            'staffCount' => ['required', 'integer', 'min:1'],
            'intake' => ['required', 'integer', 'min:1'],
        ]);

        Department::query()->create([
            'name' => $payload['name'],
            'code' => strtoupper($payload['code']),
            'hod' => $payload['hod'],
            'staff_count' => $payload['staffCount'],
            'intake' => $payload['intake'],
            'accent' => '#2563eb',
        ]);

        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'data' => $campusData->buildForUser($user),
        ], 201);
    }

    public function updateDepartment(Request $request, Department $department, CampusDataService $campusData): JsonResponse
    {
        $payload = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:20', 'alpha_dash', Rule::unique('departments', 'code')->ignore($department->id)],
            'hod' => ['required', 'string', 'max:255'],
            'staffCount' => ['required', 'integer', 'min:1'],
            'intake' => ['required', 'integer', 'min:1'],
        ]);

        $previousCode = $department->code;
        $nextCode = strtoupper($payload['code']);

        DB::transaction(function () use ($department, $payload, $previousCode, $nextCode): void {
            $department->update([
                'name' => $payload['name'],
                'code' => $nextCode,
                'hod' => $payload['hod'],
                'staff_count' => $payload['staffCount'],
                'intake' => $payload['intake'],
            ]);

            if ($previousCode === $nextCode) {
                return;
            }

            Student::query()->where('department_code', $previousCode)->update([
                'department_code' => $nextCode,
            ]);

            User::query()->where('department_code', $previousCode)->update([
                'department_code' => $nextCode,
            ]);

            Company::query()->get()->each(function (Company $company) use ($previousCode, $nextCode): void {
                $eligibleDepartments = $company->eligible_departments ?? [];

                if (! in_array($previousCode, $eligibleDepartments, true)) {
                    return;
                }

                $company->update([
                    'eligible_departments' => array_values(array_unique(array_map(
                        static fn (string $code) => $code === $previousCode ? $nextCode : $code,
                        $eligibleDepartments,
                    ))),
                ]);
            });
        });

        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'data' => $campusData->buildForUser($user),
        ]);
    }

    public function destroyDepartment(Request $request, Department $department, CampusDataService $campusData): JsonResponse
    {
        $code = $department->code;
        $hasStudents = Student::query()->where('department_code', $code)->exists();
        $hasUsers = User::query()->where('department_code', $code)->exists();
        $hasCompanies = Company::query()
            ->get()
            ->contains(fn (Company $company) => in_array($code, $company->eligible_departments ?? [], true));

        abort_if(
            $hasStudents || $hasUsers || $hasCompanies,
            422,
            'This department is still in use. Reassign linked students or drives before deleting it.'
        );

        $department->delete();

        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'data' => $campusData->buildForUser($user),
        ]);
    }

    public function students(Request $request, CampusDataService $campusData): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json($campusData->buildForUser($user)['students']);
    }

    public function storeStudent(Request $request, CampusDataService $campusData): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $payload = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', Rule::unique('students', 'email'), Rule::unique('users', 'email')],
            'departmentCode' => ['nullable', 'string', 'max:20', Rule::exists('departments', 'code')],
            'year' => ['required', Rule::in($this->masterCodes(CampusMasterCatalog::STUDENT_YEAR))],
            'gender' => ['required', Rule::in($this->masterCodes(CampusMasterCatalog::STUDENT_GENDER))],
            'status' => ['nullable', Rule::in($this->masterCodes(CampusMasterCatalog::STUDENT_STATUS))],
            'cgpa' => ['required', 'numeric', 'min:0', 'max:10'],
            'attendance' => ['required', 'integer', 'min:0', 'max:100'],
            'phone' => ['nullable', 'string', 'max:50'],
            'feeStatus' => ['required', Rule::in($this->masterCodes(CampusMasterCatalog::PAYMENT_STATUS))],
            'password' => ['required', 'string', 'min:6'],
            'skills' => ['nullable', 'array'],
            'skills.*' => ['string', 'max:100'],
        ]);

        $departmentCode = $user->role === 'staff'
            ? $user->department_code
            : ($payload['departmentCode'] ?? null);

        abort_unless($departmentCode, 422, 'A department is required for new students.');

        $department = Department::query()->where('code', $departmentCode)->firstOrFail();
        $nextId = (int) Student::query()->max('id') + 1;

        DB::transaction(function () use ($payload, $departmentCode, $department, $nextId, $user): void {
            $studentUser = User::query()->create([
                'name' => $payload['name'],
                'email' => $payload['email'],
                'password' => $payload['password'],
                'role' => 'student',
                'title' => 'Student Applicant',
                'department_code' => $departmentCode,
                'email_verified_at' => now(),
            ]);
            $studentUser->syncRoles(['student']);

            Student::query()->create([
                'id' => $nextId,
                'user_id' => $studentUser->id,
                'name' => $payload['name'],
                'email' => $payload['email'],
                'registration_number' => sprintf('BIT%s%s%03d', now()->format('y'), $departmentCode, $nextId),
                'department_code' => $departmentCode,
                'year' => $payload['year'],
                'gender' => $payload['gender'],
                'status' => $payload['status'] ?? 'active',
                'cgpa' => $payload['cgpa'],
                'attendance' => $payload['attendance'],
                'phone' => $payload['phone'] ?? null,
                'mentor' => $user->role === 'staff' ? $user->name : $department->hod,
                'fee_status' => $payload['feeStatus'],
                'skills' => $payload['skills'] ?? [],
            ]);
        });

        return response()->json([
            'data' => $campusData->buildForUser($user),
        ], 201);
    }

    public function updateStudent(Request $request, Student $student, CampusDataService $campusData): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $student->loadMissing('user');

        if ($user->role === 'staff' && $user->department_code !== $student->department_code) {
            abort(403, 'You can only manage students in your own department.');
        }

        $emailRules = [
            'required',
            'email',
            Rule::unique('students', 'email')->ignore($student->id),
        ];
        $emailRules[] = $student->user
            ? Rule::unique('users', 'email')->ignore($student->user->id)
            : Rule::unique('users', 'email');

        $payload = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => $emailRules,
            'departmentCode' => ['nullable', 'string', 'max:20', Rule::exists('departments', 'code')],
            'year' => ['required', Rule::in($this->masterCodes(CampusMasterCatalog::STUDENT_YEAR))],
            'gender' => ['required', Rule::in($this->masterCodes(CampusMasterCatalog::STUDENT_GENDER))],
            'status' => ['nullable', Rule::in($this->masterCodes(CampusMasterCatalog::STUDENT_STATUS))],
            'cgpa' => ['required', 'numeric', 'min:0', 'max:10'],
            'attendance' => ['required', 'integer', 'min:0', 'max:100'],
            'phone' => ['nullable', 'string', 'max:50'],
            'feeStatus' => ['required', Rule::in($this->masterCodes(CampusMasterCatalog::PAYMENT_STATUS))],
            'password' => ['nullable', 'string', 'min:6'],
            'skills' => ['nullable', 'array'],
            'skills.*' => ['string', 'max:100'],
        ]);

        $departmentCode = $user->role === 'staff'
            ? $user->department_code
            : ($payload['departmentCode'] ?? $student->department_code);

        abort_unless($departmentCode, 422, 'A department is required for this student.');

        $department = Department::query()->where('code', $departmentCode)->firstOrFail();

        DB::transaction(function () use ($student, $payload, $departmentCode, $department, $user): void {
            $student->update([
                'name' => $payload['name'],
                'email' => $payload['email'],
                'department_code' => $departmentCode,
                'year' => $payload['year'],
                'gender' => $payload['gender'],
                'status' => $payload['status'] ?? $student->status,
                'cgpa' => $payload['cgpa'],
                'attendance' => $payload['attendance'],
                'phone' => $payload['phone'] ?? null,
                'mentor' => $user->role === 'staff' ? $user->name : $department->hod,
                'fee_status' => $payload['feeStatus'],
                'skills' => $payload['skills'] ?? [],
            ]);

            if ($student->user) {
                $student->user->update([
                    'name' => $payload['name'],
                    'email' => $payload['email'],
                    'department_code' => $departmentCode,
                    ...(! empty($payload['password']) ? ['password' => $payload['password']] : []),
                ]);
            }
        });

        return response()->json([
            'data' => $campusData->buildForUser($user),
        ]);
    }

    public function updateMyResume(Request $request, CampusDataService $campusData): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        abort_unless($user->role === 'student' && $user->student, 403, 'Only student accounts can manage resume profiles.');

        $payload = $request->validate([
            'template' => ['required', Rule::in(['classic_ats', 'modern_ats', 'compact_ats'])],
            'headline' => ['nullable', 'string', 'max:255'],
            'summary' => ['nullable', 'string', 'max:2500'],
            'targetRole' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'links' => ['nullable', 'array'],
            'links.*' => ['string', 'max:255'],
            'certifications' => ['nullable', 'array'],
            'certifications.*' => ['string', 'max:255'],
            'achievements' => ['nullable', 'array'],
            'achievements.*' => ['string', 'max:500'],
            'projects' => ['nullable', 'array'],
            'projects.*' => ['string', 'max:500'],
            'experience' => ['nullable', 'array'],
            'experience.*' => ['string', 'max:500'],
            'uploadedResumeText' => ['nullable', 'string', 'max:50000'],
            'uploadedResumeFileName' => ['nullable', 'string', 'max:255'],
        ]);

        $resumeProfile = [
            'template' => $payload['template'],
            'headline' => trim((string) ($payload['headline'] ?? '')),
            'summary' => trim((string) ($payload['summary'] ?? '')),
            'targetRole' => trim((string) ($payload['targetRole'] ?? '')),
            'location' => trim((string) ($payload['location'] ?? '')),
            'links' => array_values(array_filter(array_map('trim', $payload['links'] ?? []))),
            'certifications' => array_values(array_filter(array_map('trim', $payload['certifications'] ?? []))),
            'achievements' => array_values(array_filter(array_map('trim', $payload['achievements'] ?? []))),
            'projects' => array_values(array_filter(array_map('trim', $payload['projects'] ?? []))),
            'experience' => array_values(array_filter(array_map('trim', $payload['experience'] ?? []))),
            'uploadedResumeText' => trim((string) ($payload['uploadedResumeText'] ?? '')),
            'uploadedResumeFileName' => trim((string) ($payload['uploadedResumeFileName'] ?? '')),
            'lastUpdated' => now()->toIso8601String(),
        ];

        $user->student->update([
            'resume_profile' => $resumeProfile,
        ]);

        return response()->json([
            'data' => $campusData->buildForUser($user->fresh(['student:id,user_id'])),
        ]);
    }

    public function staff(Request $request, CampusDataService $campusData): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        abort_unless($user->role === 'admin', 403, 'Only admins can manage staff accounts.');

        return response()->json(
            User::query()
                ->with('designation:id,name')
                ->where('role', 'staff')
                ->orderBy('name')
                ->get()
                ->map(fn (User $staffMember) => [
                    'id' => $staffMember->id,
                    'name' => $staffMember->name,
                    'email' => $staffMember->email,
                    'role' => $staffMember->role,
                    'title' => $staffMember->title,
                    'designationId' => $staffMember->designation_id,
                    'designationName' => $staffMember->designation?->name,
                    'departmentCode' => $staffMember->department_code,
                    'permissions' => $campusData->permissionsFor($staffMember),
                ])
                ->values()
                ->all()
        );
    }

    public function storeStaff(Request $request, CampusDataService $campusData): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        abort_unless($user->role === 'admin', 403, 'Only admins can manage staff accounts.');

        $payload = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'designationId' => ['required', Rule::exists('designations', 'id')],
            'departmentCode' => ['required', 'string', 'max:20', Rule::exists('departments', 'code')],
            'password' => ['required', 'string', 'min:6'],
            'phone' => ['nullable', 'string', 'max:30'],
            'communicationAddress' => ['nullable', 'string'],
            'permanentAddress' => ['nullable', 'string'],
            'emergencyContactPerson' => ['nullable', 'string', 'max:255'],
            'emergencyContactNumber' => ['nullable', 'string', 'max:30'],
            'biometricId' => ['nullable', 'string', 'max:255', Rule::unique('users', 'biometric_id')],
            'experienceYears' => ['nullable', 'integer', 'min:0'],
            'specialization' => ['nullable', 'string', 'max:255'],
            'image' => ['nullable', 'image', 'max:5120'],
        ]);

        $designation = Designation::query()->findOrFail($payload['designationId']);
        $designationPermissions = method_exists($designation, 'resolvedPermissions')
            ? $designation->resolvedPermissions()
            : CampusStaffAccess::normalize($designation->permissions ?? []);
        $permissions = CampusStaffAccess::normalize(array_merge(
            CampusPermission::byRole()['staff'] ?? [],
            $designationPermissions
        ));
        $storedImagePath = $this->storeStaffImage($request);

        $staffUser = User::query()->create([
            'name' => $payload['name'],
            'email' => $payload['email'],
            'password' => $payload['password'],
            'role' => 'staff',
            'title' => $designation->name,
            'department_code' => strtoupper($payload['departmentCode']),
            'designation_id' => $designation->id,
            'phone' => $payload['phone'] ?? null,
            'image_url' => $storedImagePath,
            'communication_address' => $payload['communicationAddress'] ?? null,
            'permanent_address' => $payload['permanentAddress'] ?? null,
            'emergency_contact_person' => $payload['emergencyContactPerson'] ?? null,
            'emergency_contact_number' => $payload['emergencyContactNumber'] ?? null,
            'biometric_id' => $payload['biometricId'] ?? null,
            'experience_years' => $payload['experienceYears'] ?? null,
            'specialization' => $payload['specialization'] ?? null,
            'email_verified_at' => now(),
        ]);
        $staffUser->syncRoles(['staff']);
        $staffUser->syncPermissions($permissions);

        return response()->json([
            'data' => $campusData->buildForUser($user),
        ], 201);
    }

    public function updateStaff(Request $request, User $staff, CampusDataService $campusData): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        abort_unless($user->role === 'admin', 403, 'Only admins can manage staff accounts.');
        abort_unless($staff->role === 'staff', 404);

        $payload = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($staff->id)],
            'designationId' => ['required', Rule::exists('designations', 'id')],
            'departmentCode' => ['required', 'string', 'max:20', Rule::exists('departments', 'code')],
            'password' => ['nullable', 'string', 'min:6'],
            'phone' => ['nullable', 'string', 'max:30'],
            'communicationAddress' => ['nullable', 'string'],
            'permanentAddress' => ['nullable', 'string'],
            'emergencyContactPerson' => ['nullable', 'string', 'max:255'],
            'emergencyContactNumber' => ['nullable', 'string', 'max:30'],
            'biometricId' => ['nullable', 'string', 'max:255', Rule::unique('users', 'biometric_id')->ignore($staff->id)],
            'experienceYears' => ['nullable', 'integer', 'min:0'],
            'specialization' => ['nullable', 'string', 'max:255'],
            'image' => ['nullable', 'image', 'max:5120'],
        ]);

        $designation = Designation::query()->findOrFail($payload['designationId']);
        $designationPermissions = method_exists($designation, 'resolvedPermissions')
            ? $designation->resolvedPermissions()
            : CampusStaffAccess::normalize($designation->permissions ?? []);
        $permissions = CampusStaffAccess::normalize(array_merge(
            CampusPermission::byRole()['staff'] ?? [],
            $designationPermissions
        ));
        $storedImagePath = $this->storeStaffImage($request, $staff->image_url);

        $staff->update([
            'name' => $payload['name'],
            'email' => $payload['email'],
            'title' => $designation->name,
            'department_code' => strtoupper($payload['departmentCode']),
            'designation_id' => $designation->id,
            'phone' => $payload['phone'] ?? null,
            'image_url' => $storedImagePath,
            'communication_address' => $payload['communicationAddress'] ?? null,
            'permanent_address' => $payload['permanentAddress'] ?? null,
            'emergency_contact_person' => $payload['emergencyContactPerson'] ?? null,
            'emergency_contact_number' => $payload['emergencyContactNumber'] ?? null,
            'biometric_id' => $payload['biometricId'] ?? null,
            'experience_years' => $payload['experienceYears'] ?? null,
            'specialization' => $payload['specialization'] ?? null,
            ...(! empty($payload['password']) ? ['password' => $payload['password']] : []),
        ]);
        $staff->syncPermissions($permissions);

        return response()->json([
            'data' => $campusData->buildForUser($user),
        ]);
    }

    public function destroyStaff(Request $request, User $staff, CampusDataService $campusData): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        abort_unless($user->role === 'admin', 403, 'Only admins can manage staff accounts.');
        abort_unless($staff->role === 'staff', 404);

        $staff->tokens()->delete();
        $staff->delete();

        return response()->json([
            'data' => $campusData->buildForUser($user),
        ]);
    }

    public function destroyStudent(Request $request, Student $student, CampusDataService $campusData): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $student->loadMissing('user');

        if ($user->role === 'staff' && $user->department_code !== $student->department_code) {
            abort(403, 'You can only manage students in your own department.');
        }

        DB::transaction(function () use ($student): void {
            $linkedUser = $student->user;

            CompanyApplication::query()->where('student_id', $student->id)->delete();
            $student->delete();

            if ($linkedUser) {
                $linkedUser->tokens()->delete();
                $linkedUser->delete();
            }
        });

        return response()->json([
            'data' => $campusData->buildForUser($user),
        ]);
    }

    public function companies(Request $request, CampusDataService $campusData): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json($campusData->buildForUser($user)['companies']);
    }

    public function storeCompany(Request $request, CampusDataService $campusData): JsonResponse
    {
        $payload = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'role' => ['required', 'string', 'max:255'],
            'packageOffered' => ['required', 'string', 'max:100'],
            'driveDate' => ['required', 'date'],
            'status' => ['required', Rule::in($this->masterCodes(CampusMasterCatalog::COMPANY_DRIVE_STATUS))],
            'location' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in($this->masterCodes(CampusMasterCatalog::COMPANY_DRIVE_TYPE))],
            'eligibleDepartments' => ['required', 'array', 'min:1'],
            'eligibleDepartments.*' => ['string', Rule::exists('departments', 'code')],
        ]);

        Company::query()->create([
            'name' => $payload['name'],
            'role' => $payload['role'],
            'package_offered' => $payload['packageOffered'],
            'drive_date' => $payload['driveDate'],
            'status' => $payload['status'],
            'location' => $payload['location'],
            'type' => $payload['type'],
            'applicants' => 0,
            'shortlisted' => 0,
            'eligible_departments' => array_values(array_unique(array_map('strtoupper', $payload['eligibleDepartments']))),
        ]);

        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'data' => $campusData->buildForUser($user),
        ], 201);
    }

    public function updateCompany(Request $request, Company $company, CampusDataService $campusData): JsonResponse
    {
        $payload = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'role' => ['required', 'string', 'max:255'],
            'packageOffered' => ['required', 'string', 'max:100'],
            'driveDate' => ['required', 'date'],
            'status' => ['required', Rule::in($this->masterCodes(CampusMasterCatalog::COMPANY_DRIVE_STATUS))],
            'location' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in($this->masterCodes(CampusMasterCatalog::COMPANY_DRIVE_TYPE))],
            'eligibleDepartments' => ['required', 'array', 'min:1'],
            'eligibleDepartments.*' => ['string', Rule::exists('departments', 'code')],
        ]);

        $company->update([
            'name' => $payload['name'],
            'role' => $payload['role'],
            'package_offered' => $payload['packageOffered'],
            'drive_date' => $payload['driveDate'],
            'status' => $payload['status'],
            'location' => $payload['location'],
            'type' => $payload['type'],
            'eligible_departments' => array_values(array_unique(array_map('strtoupper', $payload['eligibleDepartments']))),
        ]);

        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'data' => $campusData->buildForUser($user),
        ]);
    }

    public function destroyCompany(Request $request, Company $company, CampusDataService $campusData): JsonResponse
    {
        CompanyApplication::query()->where('company_id', $company->id)->delete();
        $company->delete();

        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'data' => $campusData->buildForUser($user),
        ]);
    }

    public function applyToCompany(Request $request, Company $company, CampusDataService $campusData): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        abort_unless($user->can(CampusPermission::PLACEMENT_APPLY), 403, 'You do not have permission to apply to company drives.');

        $student = $user->student;

        abort_unless($student, 403, 'A linked student profile is required before applying.');
        abort_unless(
            in_array($student->department_code, $company->eligible_departments ?? [], true),
            403,
            'You are not eligible for this drive.'
        );
        abort_if($company->status === 'closed', 422, 'This drive is already closed.');

        DB::transaction(function () use ($student, $company): void {
            $application = CompanyApplication::query()->firstOrCreate([
                'student_id' => $student->id,
                'company_id' => $company->id,
            ]);

            if ($application->wasRecentlyCreated) {
                $company->increment('applicants');
            }
        });

        return response()->json([
            'data' => $campusData->buildForUser($user),
        ]);
    }

    public function announcements(Request $request, CampusDataService $campusData): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json($campusData->buildForUser($user)['announcements']);
    }

    public function storeAnnouncement(Request $request, CampusDataService $campusData): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $allowedAudiences = $user->role === 'admin'
            ? $this->masterCodes(CampusMasterCatalog::ANNOUNCEMENT_AUDIENCE)
            : array_values(array_intersect(
                $this->masterCodes(CampusMasterCatalog::ANNOUNCEMENT_AUDIENCE),
                ['all', 'students', 'staff']
            ));

        $payload = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'summary' => ['required', 'string', 'max:1000'],
            'audience' => ['required', Rule::in($allowedAudiences)],
            'priority' => ['required', Rule::in($this->masterCodes(CampusMasterCatalog::ANNOUNCEMENT_PRIORITY))],
            'category' => ['required', 'string', 'max:100'],
        ]);

        Announcement::query()->create([
            'title' => $payload['title'],
            'summary' => $payload['summary'],
            'audience' => $payload['audience'],
            'priority' => $payload['priority'],
            'posted_by' => $user->name,
            'date' => now()->toDateString(),
            'category' => $payload['category'],
        ]);

        return response()->json([
            'data' => $campusData->buildForUser($user),
        ], 201);
    }

    public function updateAnnouncement(Request $request, Announcement $announcement, CampusDataService $campusData): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $allowedAudiences = $user->role === 'admin'
            ? $this->masterCodes(CampusMasterCatalog::ANNOUNCEMENT_AUDIENCE)
            : array_values(array_intersect(
                $this->masterCodes(CampusMasterCatalog::ANNOUNCEMENT_AUDIENCE),
                ['all', 'students', 'staff']
            ));

        $payload = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'summary' => ['required', 'string', 'max:1000'],
            'audience' => ['required', Rule::in($allowedAudiences)],
            'priority' => ['required', Rule::in($this->masterCodes(CampusMasterCatalog::ANNOUNCEMENT_PRIORITY))],
            'category' => ['required', 'string', 'max:100'],
        ]);

        $announcement->update([
            'title' => $payload['title'],
            'summary' => $payload['summary'],
            'audience' => $payload['audience'],
            'priority' => $payload['priority'],
            'category' => $payload['category'],
        ]);

        return response()->json([
            'data' => $campusData->buildForUser($user),
        ]);
    }

    public function destroyAnnouncement(Request $request, Announcement $announcement, CampusDataService $campusData): JsonResponse
    {
        $announcement->delete();

        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'data' => $campusData->buildForUser($user),
        ]);
    }

    private function masterCodes(string $category): array
    {
        return CampusMasterCatalog::optionsFor($category);
    }

    private function masterUsageCount(MasterOption $master): int
    {
        return match ($master->category) {
            CampusMasterCatalog::STUDENT_GENDER => Student::query()->where('gender', $master->code)->count(),
            CampusMasterCatalog::STUDENT_YEAR => Student::query()->where('year', $master->code)->count(),
            CampusMasterCatalog::STUDENT_STATUS => Student::query()->where('status', $master->code)->count(),
            CampusMasterCatalog::PAYMENT_STATUS => Student::query()->where('fee_status', $master->code)->count(),
            CampusMasterCatalog::COMPANY_DRIVE_STATUS => Company::query()->where('status', $master->code)->count(),
            CampusMasterCatalog::COMPANY_DRIVE_TYPE => Company::query()->where('type', $master->code)->count(),
            CampusMasterCatalog::ANNOUNCEMENT_AUDIENCE => Announcement::query()->where('audience', $master->code)->count(),
            CampusMasterCatalog::ANNOUNCEMENT_PRIORITY => Announcement::query()->where('priority', $master->code)->count(),
            default => 0,
        };
    }

    private function storeStaffImage(Request $request, ?string $currentImagePath = null): ?string
    {
        if (! $request->hasFile('image')) {
            return $currentImagePath;
        }

        if ($currentImagePath && ! Str::startsWith($currentImagePath, ['http://', 'https://'])) {
            $normalizedPath = Str::startsWith($currentImagePath, '/storage/')
                ? Str::after($currentImagePath, '/storage/')
                : ltrim($currentImagePath, '/');

            Storage::disk('public')->delete($normalizedPath);
        }

        return $request->file('image')->store('staff-images', 'public');
    }

    public function summary(Request $request, CampusDataService $campusData): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json($campusData->summaryForUser($user));
    }
}
