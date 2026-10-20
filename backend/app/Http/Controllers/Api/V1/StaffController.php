<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Staff\DeleteStaffMemberAction;
use App\Actions\Staff\SaveStaffMemberAction;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Staff\StoreStaffMemberRequest;
use App\Http\Requests\Staff\UpdateStaffMemberRequest;
use App\Http\Resources\StaffMemberResource;
use App\Models\Institution;
use App\Models\User;
use App\Services\Campus\CampusDataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Staff and placement-officer accounts, managed by admins.
 */
class StaffController extends Controller
{
    public function __construct(private readonly CampusDataService $campusData)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $this->ensureAdmin($request->user());

        $staff = User::query()
            ->with('designation:id,name')
            ->whereIn('role', [UserRole::Staff->value, UserRole::PlacementOfficer->value])
            ->orderBy('name')
            ->get();

        return response()->json(StaffMemberResource::collection($staff)->resolve($request));
    }

    public function store(StoreStaffMemberRequest $request, SaveStaffMemberAction $saveStaff): JsonResponse
    {
        $actor = $request->user();

        $saveStaff->execute($request->toData(), institutionId: Institution::forNewAccountsOf($actor));

        return response()->json(['data' => $this->campusData->buildForUser($actor)], 201);
    }

    public function update(UpdateStaffMemberRequest $request, User $staff, SaveStaffMemberAction $saveStaff): JsonResponse
    {
        $saveStaff->execute($request->toData(), $staff);

        return response()->json(['data' => $this->campusData->buildForUser($request->user())]);
    }

    public function destroy(Request $request, User $staff, DeleteStaffMemberAction $deleteStaff): JsonResponse
    {
        $this->ensureAdmin($request->user());
        abort_unless($staff->isInstitutionStaff(), 404);

        $deleteStaff->execute($staff);

        return response()->json(['data' => $this->campusData->buildForUser($request->user())]);
    }

    private function ensureAdmin(User $user): void
    {
        abort_unless($user->isAdmin(), 403, 'Only admins can manage staff accounts.');
    }
}
