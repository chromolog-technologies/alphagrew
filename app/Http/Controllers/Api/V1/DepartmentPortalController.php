<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Staff\DeleteStaffMemberAction;
use App\Actions\Staff\SaveStaffMemberAction;
use App\DTOs\StaffMemberData;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Institution;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\Departments\DepartmentPortal;
use App\Support\Campus\CampusPermission;
use App\Support\Tenancy\TenantRule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * The staff portal for one department: overview, reports and staff.
 *
 * - Staff always get their own department; staff without one get 403.
 * - Admins pick a department (?departmentCode=), defaulting to the first.
 * - Managing staff accounts needs staff.create / staff.edit / staff.delete (granted to HODs through
 *   their designation) and only reaches staff accounts of the HOD's own department. An HOD can only
 *   hand out designations whose permissions they hold themselves, so they cannot create an account
 *   more powerful than their own.
 */
class DepartmentPortalController extends Controller
{
    private const AUDITED = ['name', 'email', 'role', 'department_code', 'designation_id'];

    public function __construct(
        private readonly DepartmentPortal $portal,
        private readonly AuditLogger $audit,
    ) {}

    public function summary(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->portal->summary($this->department($request))]);
    }

    public function reports(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->portal->reports($this->department($request))]);
    }

    public function staff(Request $request): JsonResponse
    {
        $department = $this->department($request);
        $user = $request->user();

        return response()->json([
            'data' => $this->portal->staff($department),
            'meta' => [
                'department' => ['code' => $department->code, 'name' => $department->name],
                'canCreate' => $user->can(CampusPermission::STAFF_CREATE),
                'canEdit' => $user->can(CampusPermission::STAFF_EDIT),
                'canDelete' => $user->can(CampusPermission::STAFF_DELETE),
                // Designations this user may hand out.
                'designations' => $this->grantableDesignations($user)->map(fn (Designation $d) => ['id' => $d->id, 'name' => $d->name])->values()->all(),
            ],
        ]);
    }

    public function storeStaff(Request $request, SaveStaffMemberAction $save): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->can(CampusPermission::STAFF_CREATE), 403, 'You cannot add staff accounts.');
        $department = $this->department($request);

        $v = $this->validateStaff($request, $user, null);
        $staff = $save->execute($this->data($v, $department), institutionId: Institution::forNewAccountsOf($user));
        $this->audit->record('department_staff.created', $staff, [], $staff->only(self::AUDITED));

        return response()->json(['data' => $this->findStaff($department, $staff->id)], 201);
    }

    public function updateStaff(Request $request, User $staff, SaveStaffMemberAction $save): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->can(CampusPermission::STAFF_EDIT), 403, 'You cannot edit staff accounts.');
        $department = $this->department($request);
        $this->ensureInDepartment($staff, $department);

        $v = $this->validateStaff($request, $user, $staff);
        $before = $staff->only(self::AUDITED);
        $save->execute($this->data($v, $department), $staff);
        $this->audit->record('department_staff.updated', $staff, $before, $staff->only(self::AUDITED));

        return response()->json(['data' => $this->findStaff($department, $staff->id)]);
    }

    public function destroyStaff(Request $request, User $staff, DeleteStaffMemberAction $delete): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->can(CampusPermission::STAFF_DELETE), 403, 'You cannot remove staff accounts.');
        $this->ensureInDepartment($staff, $this->department($request));
        abort_if($staff->id === $user->id, 422, 'You cannot remove your own account.');

        $before = $staff->only(self::AUDITED);
        $delete->execute($staff);
        $this->audit->record('department_staff.deleted', $staff, $before, []);

        return response()->json(['message' => 'Staff account removed.']);
    }

    /** The user's own department, or for admins the one asked for. */
    private function department(Request $request): Department
    {
        $user = $request->user();

        if ($user->isAdmin()) {
            $code = $request->query('departmentCode');

            return Department::query()->when($code, fn ($q) => $q->where('code', $code))->orderBy('name')->firstOr(fn () => abort(404, 'No department found.'));
        }

        abort_unless($user->roleEnum() === UserRole::Staff && filled($user->department_code), 403, 'Your account is not linked to a department.');

        return Department::query()->where('code', $user->department_code)->firstOr(fn () => abort(404, 'Your department was not found.'));
    }

    private function ensureInDepartment(User $staff, Department $department): void
    {
        abort_unless(
            $staff->role === UserRole::Staff->value && $staff->department_code === $department->code,
            404,
            'No such staff member in this department.',
        );
    }

    /** @return array<string, mixed> */
    private function validateStaff(Request $request, User $user, ?User $staff): array
    {
        $grantable = $this->grantableDesignations($user)->pluck('id')->all();

        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($staff?->id)],
            'password' => [$staff ? 'nullable' : 'required', 'string', 'min:8'],
            'designationId' => ['required', 'integer', TenantRule::exists('designations', 'id'), Rule::in($grantable)],
            'phone' => ['nullable', 'string', 'max:30'],
            'specialization' => ['nullable', 'string', 'max:255'],
            'experienceYears' => ['nullable', 'integer', 'min:0', 'max:60'],
        ], ['designationId.in' => 'You can only give a designation whose access you hold yourself.']);
    }

    /** @param  array<string, mixed>  $v */
    private function data(array $v, Department $department): StaffMemberData
    {
        return new StaffMemberData(
            name: $v['name'], email: $v['email'], role: UserRole::Staff->value, designationId: (int) $v['designationId'],
            departmentCode: $department->code, password: $v['password'] ?? null, phone: $v['phone'] ?? null,
            communicationAddress: null, permanentAddress: null, emergencyContactPerson: null, emergencyContactNumber: null,
            biometricId: null, experienceYears: isset($v['experienceYears']) ? (int) $v['experienceYears'] : null,
            specialization: $v['specialization'] ?? null, image: null,
        );
    }

    /**
     * Designations whose permissions the user holds themselves (admins: all active ones).
     *
     * @return \Illuminate\Support\Collection<int, Designation>
     */
    private function grantableDesignations(User $user)
    {
        $designations = Designation::query()->where('status', 'active')->orderBy('name')->get();
        if ($user->isAdmin()) {
            return $designations;
        }

        $own = $user->getAllPermissions()->pluck('name')->all();

        return $designations->filter(fn (Designation $d) => array_diff($d->resolvedPermissions(), $own) === [])->values();
    }

    /** @return array<string, mixed> */
    private function findStaff(Department $department, int $id): array
    {
        return collect($this->portal->staff($department))->firstWhere('id', $id)
            ?? throw ValidationException::withMessages(['email' => 'The account was saved but is not in this department.']);
    }
}
