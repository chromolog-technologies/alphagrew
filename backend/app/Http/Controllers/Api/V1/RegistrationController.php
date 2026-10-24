<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Registrations\ReviewRegistrationAction;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Registrations\RejectRegistrationRequest;
use App\Http\Resources\PendingRegistrationResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

/**
 * Approval queue for students who registered themselves (PRD §6, §7.6).
 */
class RegistrationController extends Controller
{
    public function __construct(private readonly ReviewRegistrationAction $review) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'status' => ['nullable', Rule::in([UserStatus::PendingApproval->value, UserStatus::Rejected->value])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $registrations = User::query()
            ->with('student:id,user_id,registration_number')
            ->where('role', UserRole::Student->value)
            ->where('status', $validated['status'] ?? UserStatus::PendingApproval->value)
            ->oldest('id')
            ->paginate((int) ($validated['per_page'] ?? 25));

        return PendingRegistrationResource::collection($registrations);
    }

    public function approve(User $registration): PendingRegistrationResource
    {
        return new PendingRegistrationResource($this->review->approve($registration)->load('student:id,user_id,registration_number'));
    }

    public function reject(RejectRegistrationRequest $request, User $registration): PendingRegistrationResource
    {
        return new PendingRegistrationResource(
            $this->review->reject($registration, $request->validated('reason'))->load('student:id,user_id,registration_number')
        );
    }
}
