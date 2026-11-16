<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Staff\DeleteStaffMemberAction;
use App\Actions\Staff\SaveStaffMemberAction;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Staff\StoreStaffMemberRequest;
use App\Http\Requests\Staff\UpdateStaffMemberRequest;
use App\Http\Resources\StaffMemberResource;
use App\Models\CustomFieldDefinition;
use App\Models\Institution;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\Campus\CampusDataService;
use App\Services\CustomFields\CustomFieldService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Staff and placement-officer accounts, managed by admins.
 */
class StaffController extends Controller
{
    /** Fields recorded in the audit log when an account changes (they decide what it can access). */
    private const AUDITED_FIELDS = ['name', 'email', 'role', 'department_code', 'designation_id'];

    public function __construct(
        private readonly CampusDataService $campusData,
        private readonly AuditLogger $audit,
        private readonly CustomFieldService $customFields,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->ensureAdmin($request->user());

        $staff = User::query()
            ->with('designation:id,name')
            ->whereIn('role', [UserRole::Staff->value, UserRole::PlacementOfficer->value])
            ->orderBy('name')
            ->get();

        $values = $this->customFields->valuesForMany($staff, CustomFieldDefinition::ENTITY_STAFF);

        return response()->json(array_map(
            fn (array $member) => [...$member, 'customFields' => $values[$member['id']] ?? []],
            StaffMemberResource::collection($staff)->resolve($request),
        ));
    }

    public function store(StoreStaffMemberRequest $request, SaveStaffMemberAction $saveStaff): JsonResponse
    {
        $actor = $request->user();

        $staff = DB::transaction(function () use ($request, $saveStaff, $actor): User {
            $staff = $saveStaff->execute($request->toData(), institutionId: Institution::forNewAccountsOf($actor));
            $this->customFields->save($staff, CustomFieldDefinition::ENTITY_STAFF, $request->customFields());

            return $staff;
        });
        $this->audit->record('staff.created', $staff, [], $staff->only(self::AUDITED_FIELDS));

        return response()->json(['data' => $this->campusData->buildForUser($actor)], 201);
    }

    public function update(UpdateStaffMemberRequest $request, User $staff, SaveStaffMemberAction $saveStaff): JsonResponse
    {
        $before = $staff->only(self::AUDITED_FIELDS);
        DB::transaction(function () use ($request, $saveStaff, $staff): void {
            $saveStaff->execute($request->toData(), $staff);
            $this->customFields->save($staff, CustomFieldDefinition::ENTITY_STAFF, $request->customFields());
        });
        $after = $staff->only(self::AUDITED_FIELDS);

        if ($before !== $after || $request->filled('password')) {
            $this->audit->record('staff.updated', $staff, $before, [
                ...$after,
                ...($request->filled('password') ? ['passwordChanged' => true] : []),
            ]);
        }

        return response()->json(['data' => $this->campusData->buildForUser($request->user())]);
    }

    public function destroy(Request $request, User $staff, DeleteStaffMemberAction $deleteStaff): JsonResponse
    {
        $this->ensureAdmin($request->user());
        abort_unless($staff->isInstitutionStaff(), 404);

        $before = $staff->only(self::AUDITED_FIELDS);
        $deleteStaff->execute($staff);
        $this->audit->record('staff.deleted', $staff, $before);

        return response()->json(['data' => $this->campusData->buildForUser($request->user())]);
    }

    private function ensureAdmin(User $user): void
    {
        abort_unless($user->isAdmin(), 403, 'Only admins can manage staff accounts.');
    }
}
