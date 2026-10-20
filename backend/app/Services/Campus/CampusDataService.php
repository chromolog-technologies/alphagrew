<?php

namespace App\Support\Campus;

use App\Models\Announcement;
use App\Models\Company;
use App\Models\CompanyApplication;
use App\Models\Department;
use App\Models\Designation;
use App\Models\MasterOption;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CampusDataService
{
    public function build(): array
    {
        return $this->buildDataset(
            User::query()->with(['student:id,user_id', 'designation:id,name'])->orderBy('id')->get(),
            Department::query()->orderBy('id')->get(),
            Designation::query()->orderBy('name')->get(),
            $this->loadMasterOptions(),
            Student::query()->with('applications')->orderBy('id')->get(),
            Company::query()->orderBy('id')->get(),
            Announcement::query()->orderByDesc('date')->orderByDesc('id')->get(),
        );
    }

    public function buildForUser(User $user): array
    {
        $user->loadMissing('student:id,user_id,department_code');

        $users = User::query()
            ->with(['student:id,user_id', 'designation:id,name'])
            ->when($user->role !== 'admin', fn ($query) => $query->whereKey($user->id))
            ->orderBy('id')
            ->get();

        $students = Student::query()
            ->with('applications')
            ->when(
                $user->role === 'staff' && $user->department_code,
                fn ($query) => $query->where('department_code', $user->department_code)
            )
            ->when(
                $user->role === 'student',
                fn ($query) => $query->whereKey($user->student?->id ?? 0)
            )
            ->orderBy('id')
            ->get();

        $companies = Company::query()
            ->orderBy('id')
            ->get()
            ->when(
                $user->role === 'student',
                fn (Collection $collection) => $collection->filter(function (Company $company) use ($user) {
                    $departmentCode = $user->student?->department_code ?? $user->department_code;

                    return $departmentCode !== null
                        && in_array($departmentCode, $company->eligible_departments ?? [], true);
                })->values()
            );

        $announcements = Announcement::query()
            ->when(
                $user->role !== 'admin',
                fn ($query) => $query->whereIn('audience', $this->visibleAudiencesFor($user))
            )
            ->orderByDesc('date')
            ->orderByDesc('id')
            ->get();

        return $this->buildDataset(
            $users,
            Department::query()
                ->orderBy('id')
                ->get(),
            Designation::query()
                ->when(
                    $user->role !== 'admin',
                    fn ($query) => $query->whereRaw('1 = 0')
                )
                ->orderBy('name')
                ->get(),
            $this->loadMasterOptions(),
            $students,
            $companies,
            $announcements,
        );
    }

    private function loadMasterOptions(): Collection
    {
        if (! DB::connection()->getSchemaBuilder()->hasTable('master_options')) {
            return collect(CampusMasterCatalog::defaultOptions())
                ->map(fn (array $option) => new MasterOption([
                    'id' => $option['id'],
                    'category' => $option['category'],
                    'code' => $option['code'],
                    'label' => $option['label'],
                    'description' => $option['description'] ?? '',
                    'sort_order' => $option['sortOrder'],
                ]));
        }

        return MasterOption::query()
            ->orderBy('category')
            ->orderBy('sort_order')
            ->orderBy('label')
            ->get();
    }

    public function authenticatedUser(User $user): array
    {
        $user->loadMissing('student:id,user_id');

        return [
            ...$this->sessionUser($user),
        ];
    }

    public function authPayload(User $user, string $token): array
    {
        return [
            'token' => $token,
            'user' => $this->authenticatedUser($user),
            'data' => $this->buildForUser($user),
        ];
    }

    public function permissionsFor(User $user): array
    {
        if ($user->role === 'admin') {
            return CampusPermission::all();
        }

        if ($user->role === 'staff') {
            $user->loadMissing('designation:id,name,permissions');
            $rolePermissions = CampusPermission::byRole()['staff'] ?? [];
            $designationPermissions = $user->designation?->resolvedPermissions() ?? [];

            return CampusStaffAccess::normalize(array_merge($rolePermissions, $designationPermissions));
        }

        if ($user->role === 'student') {
            return CampusStudentAccess::defaultPermissions();
        }

        $permissions = $user->getAllPermissions();
        
        // Handle both array and Collection from RBAC system
        if (is_object($permissions) && method_exists($permissions, 'pluck')) {
            return $permissions
                ->pluck('name')
                ->sort()
                ->values()
                ->all();
        }
        
        // Fallback for array
        if (is_array($permissions)) {
            return collect($permissions)
                ->pluck('name')
                ->sort()
                ->values()
                ->all();
        }
        
        return [];
    }

    public function summaryForUser(User $user): array
    {
        $data = $this->buildForUser($user);
        $students = collect($data['students']);
        $companies = collect($data['companies']);
        $announcements = collect($data['announcements']);

        $studentCount = $students->count();
        $placed = $students->where('status', 'placed')->count();

        return [
            'students' => $studentCount,
            'placed' => $placed,
            'placementReady' => $students->where('status', 'placement_ready')->count(),
            'openDrives' => $companies->whereIn('status', ['open', 'closing_soon'])->count(),
            'departments' => count($data['departments']),
            'announcements' => $announcements->count(),
            'placementRate' => $studentCount > 0 ? round(($placed / $studentCount) * 100) : 0,
        ];
    }

    public function sessionUser(User $user): array
    {
        $user->loadMissing('designation:id,name');

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'title' => $user->title,
            'departmentCode' => $user->department_code,
            'designationId' => $user->designation_id,
            'designationName' => $user->designation?->name,
            'phone' => $user->phone,
            'imageUrl' => $this->resolveImageUrl($user->image_url),
            'communicationAddress' => $user->communication_address,
            'permanentAddress' => $user->permanent_address,
            'emergencyContactPerson' => $user->emergency_contact_person,
            'emergencyContactNumber' => $user->emergency_contact_number,
            'biometricId' => $user->biometric_id,
            'experienceYears' => $user->experience_years,
            'specialization' => $user->specialization,
            'studentId' => $user->student?->id,
            'permissions' => $this->permissionsFor($user),
        ];
    }

    private function resolveImageUrl(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        if (Str::startsWith($path, ['http://', 'https://'])) {
            return $path;
        }

        $publicPath = Str::startsWith($path, '/storage/')
            ? $path
            : Storage::disk('public')->url($path);

        if (Str::startsWith($publicPath, ['http://', 'https://'])) {
            return $publicPath;
        }

        return url($publicPath);
    }

    public function sync(array $payload): void
    {
        DB::transaction(function () use ($payload): void {
            CompanyApplication::query()->delete();
            Announcement::query()->delete();
            Student::query()->delete();
            Company::query()->delete();
            Department::query()->delete();
            User::query()->whereNotNull('designation_id')->update(['designation_id' => null]);
            Designation::query()->delete();
            MasterOption::query()->delete();

            foreach ($payload['masters'] ?? [] as $master) {
                DB::table('master_options')->insert([
                    'id' => $master['id'],
                    'category' => $master['category'],
                    'code' => $master['code'],
                    'label' => $master['label'],
                    'description' => $master['description'] ?? null,
                    'sort_order' => $master['sortOrder'] ?? 1,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            foreach ($payload['designations'] ?? [] as $designation) {
                DB::table('designations')->insert([
                    'id' => $designation['id'],
                    'name' => $designation['name'],
                    'slug' => $designation['slug'],
                    'description' => $designation['description'] ?? null,
                    'permissions' => json_encode($designation['permissions'] ?? []),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            foreach ($payload['departments'] ?? [] as $department) {
                DB::table('departments')->insert([
                    'id' => $department['id'],
                    'name' => $department['name'],
                    'code' => $department['code'],
                    'hod' => $department['hod'],
                    'staff_count' => $department['staffCount'],
                    'intake' => $department['intake'],
                    'accent' => $department['accent'] ?? '#24a8e8',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            foreach ($payload['companies'] ?? [] as $company) {
                DB::table('companies')->insert([
                    'id' => $company['id'],
                    'name' => $company['name'],
                    'role' => $company['role'],
                    'package_offered' => $company['packageOffered'],
                    'drive_date' => $company['driveDate'],
                    'status' => CampusMasterCatalog::normalizeValue(CampusMasterCatalog::COMPANY_DRIVE_STATUS, $company['status']) ?? 'upcoming',
                    'location' => $company['location'],
                    'type' => CampusMasterCatalog::normalizeValue(CampusMasterCatalog::COMPANY_DRIVE_TYPE, $company['type']) ?? 'placement',
                    'applicants' => $company['applicants'] ?? 0,
                    'shortlisted' => $company['shortlisted'] ?? 0,
                    'eligible_departments' => json_encode($company['eligibleDepartments'] ?? []),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            foreach ($payload['students'] ?? [] as $student) {
                DB::table('students')->insert([
                    'id' => $student['id'],
                    'user_id' => User::query()->where('email', $student['email'])->value('id'),
                    'name' => $student['name'],
                    'email' => $student['email'],
                    'registration_number' => $student['registrationNumber'],
                    'department_code' => $student['departmentCode'],
                    'year' => CampusMasterCatalog::normalizeValue(CampusMasterCatalog::STUDENT_YEAR, $student['year']) ?? 'year_1',
                    'gender' => CampusMasterCatalog::normalizeValue(CampusMasterCatalog::STUDENT_GENDER, $student['gender'] ?? 'prefer_not_to_say') ?? 'prefer_not_to_say',
                    'status' => CampusMasterCatalog::normalizeValue(CampusMasterCatalog::STUDENT_STATUS, $student['status']) ?? 'active',
                    'cgpa' => $student['cgpa'],
                    'attendance' => $student['attendance'],
                    'phone' => $student['phone'] ?? '',
                    'mentor' => $student['mentor'] ?? '',
                    'fee_status' => CampusMasterCatalog::normalizeValue(CampusMasterCatalog::PAYMENT_STATUS, $student['feeStatus']) ?? 'pending',
                    'placed_company' => $student['placedCompany'] ?? null,
                    'skills' => json_encode($student['skills'] ?? []),
                    'resume_profile' => isset($student['resume']) ? json_encode($student['resume']) : null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            foreach ($payload['announcements'] ?? [] as $announcement) {
                DB::table('announcements')->insert([
                    'id' => $announcement['id'],
                    'title' => $announcement['title'],
                    'summary' => $announcement['summary'],
                    'audience' => CampusMasterCatalog::normalizeValue(CampusMasterCatalog::ANNOUNCEMENT_AUDIENCE, $announcement['audience']) ?? 'all',
                    'priority' => CampusMasterCatalog::normalizeValue(CampusMasterCatalog::ANNOUNCEMENT_PRIORITY, $announcement['priority']) ?? 'medium',
                    'posted_by' => $announcement['postedBy'],
                    'date' => $announcement['date'],
                    'category' => $announcement['category'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            foreach ($payload['students'] ?? [] as $student) {
                foreach ($student['appliedCompanyIds'] ?? [] as $companyId) {
                    DB::table('company_applications')->insertOrIgnore([
                        'student_id' => $student['id'],
                        'company_id' => $companyId,
                    ]);
                }
            }

            foreach ($payload['users'] ?? [] as $user) {
                if (! isset($user['email'])) {
                    continue;
                }

                User::query()->where('email', $user['email'])->update([
                    'name' => $user['name'] ?? User::query()->where('email', $user['email'])->value('name'),
                    'role' => $user['role'] ?? User::query()->where('email', $user['email'])->value('role'),
                    'title' => $user['title'] ?? User::query()->where('email', $user['email'])->value('title'),
                    'department_code' => $user['departmentCode'] ?? User::query()->where('email', $user['email'])->value('department_code'),
                    'designation_id' => $user['designationId'] ?? User::query()->where('email', $user['email'])->value('designation_id'),
                ]);
            }
        });
    }

    private function buildDataset(
        iterable $users,
        iterable $departments,
        iterable $designations,
        iterable $masters,
        iterable $students,
        iterable $companies,
        iterable $announcements,
    ): array {
        return [
            'users' => collect($users)
                ->map(fn (User $user) => $this->sessionUser($user))
                ->values()
                ->all(),
            'departments' => collect($departments)
                ->map(fn (Department $department) => [
                    'id' => $department->id,
                    'name' => $department->name,
                    'code' => $department->code,
                    'hod' => $department->hod,
                    'staffCount' => $department->staff_count,
                    'intake' => $department->intake,
                    'accent' => $department->accent,
                ])
                ->values()
                ->all(),
            'designations' => collect($designations)
                ->map(fn (Designation $designation) => [
                    'id' => $designation->id,
                    'name' => $designation->name,
                    'slug' => $designation->slug,
                    'description' => $designation->description ?? '',
                    'permissions' => CampusStaffAccess::normalize($designation->permissions ?? []),
                    'staffCount' => $designation->users()->count(),
                ])
                ->values()
                ->all(),
            'masters' => collect($masters)
                ->map(fn (MasterOption $master) => [
                    'id' => $master->id,
                    'category' => $master->category,
                    'code' => $master->code,
                    'label' => $master->label,
                    'description' => $master->description ?? '',
                    'sortOrder' => $master->sort_order,
                ])
                ->values()
                ->all(),
            'students' => collect($students)
                ->map(fn (Student $student) => [
                    'id' => $student->id,
                    'name' => $student->name,
                    'email' => $student->email,
                    'registrationNumber' => $student->registration_number,
                    'departmentCode' => $student->department_code,
                    'year' => CampusMasterCatalog::normalizeValue(CampusMasterCatalog::STUDENT_YEAR, $student->year) ?? 'year_1',
                    'gender' => CampusMasterCatalog::normalizeValue(CampusMasterCatalog::STUDENT_GENDER, $student->gender) ?? 'prefer_not_to_say',
                    'status' => CampusMasterCatalog::normalizeValue(CampusMasterCatalog::STUDENT_STATUS, $student->status) ?? 'active',
                    'cgpa' => (float) $student->cgpa,
                    'attendance' => (int) $student->attendance,
                    'phone' => $student->phone ?? '',
                    'mentor' => $student->mentor ?? '',
                    'feeStatus' => CampusMasterCatalog::normalizeValue(CampusMasterCatalog::PAYMENT_STATUS, $student->fee_status) ?? 'pending',
                    'placedCompany' => $student->placed_company,
                    'appliedCompanyIds' => $student->applications->pluck('company_id')->values()->all(),
                    'skills' => $student->skills ?? [],
                    'resume' => $student->resume_profile,
                ])
                ->values()
                ->all(),
            'companies' => collect($companies)
                ->map(fn (Company $company) => [
                    'id' => $company->id,
                    'name' => $company->name,
                    'role' => $company->role,
                    'packageOffered' => $company->package_offered,
                    'driveDate' => optional($company->drive_date)->toDateString(),
                    'status' => CampusMasterCatalog::normalizeValue(CampusMasterCatalog::COMPANY_DRIVE_STATUS, $company->status) ?? 'upcoming',
                    'location' => $company->location,
                    'type' => CampusMasterCatalog::normalizeValue(CampusMasterCatalog::COMPANY_DRIVE_TYPE, $company->type) ?? 'placement',
                    'applicants' => (int) $company->applicants,
                    'shortlisted' => (int) $company->shortlisted,
                    'eligibleDepartments' => $company->eligible_departments ?? [],
                ])
                ->values()
                ->all(),
            'announcements' => collect($announcements)
                ->map(fn (Announcement $announcement) => [
                    'id' => $announcement->id,
                    'title' => $announcement->title,
                    'summary' => $announcement->summary,
                    'audience' => CampusMasterCatalog::normalizeValue(CampusMasterCatalog::ANNOUNCEMENT_AUDIENCE, $announcement->audience) ?? 'all',
                    'priority' => CampusMasterCatalog::normalizeValue(CampusMasterCatalog::ANNOUNCEMENT_PRIORITY, $announcement->priority) ?? 'medium',
                    'postedBy' => $announcement->posted_by,
                    'date' => optional($announcement->date)->toDateString(),
                    'category' => $announcement->category,
                ])
                ->values()
                ->all(),
        ];
    }

    private function visibleAudiencesFor(User $user): array
    {
        return match ($user->role) {
            'staff' => ['all', 'staff'],
            'student' => ['all', 'students'],
            default => ['all', 'students', 'staff', 'admin'],
        };
    }
}
