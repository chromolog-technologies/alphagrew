<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Invitations\AcceptInvitationAction;
use App\Actions\Invitations\CreateInvitationsAction;
use App\Exceptions\BusinessRuleException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Invitations\AcceptInvitationRequest;
use App\Http\Requests\Invitations\StoreInvitationsRequest;
use App\Http\Resources\InvitationResource;
use App\Models\Invitation;
use App\Notifications\InvitationSent;
use App\Services\Audit\AuditLogger;
use App\Services\Campus\CampusDataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Invitations (PRD §6 "Onboarding and invitations"): admins invite students, staff and
 * placement officers by email; the invitee opens the link and sets a name and password.
 */
class InvitationController extends Controller
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'status' => ['nullable', Rule::in(['pending', 'accepted', 'revoked', 'expired'])],
            'search' => ['nullable', 'string', 'max:255'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $invitations = Invitation::query()
            ->with(['designation:id,name', 'inviter:id,name'])
            ->when($validated['search'] ?? null, fn ($query, string $search) => $query->where('email', 'like', '%'.$search.'%'))
            ->when($validated['status'] ?? null, fn ($query, string $status) => match ($status) {
                'pending' => $query->pending(),
                'accepted' => $query->whereNotNull('accepted_at'),
                'revoked' => $query->whereNull('accepted_at')->whereNotNull('revoked_at'),
                'expired' => $query->whereNull('accepted_at')->whereNull('revoked_at')->where('expires_at', '<=', now()),
            })
            ->latest('id')
            ->paginate((int) ($validated['per_page'] ?? 25));

        return InvitationResource::collection($invitations);
    }

    public function store(StoreInvitationsRequest $request, CreateInvitationsAction $createInvitations): JsonResponse
    {
        $result = $createInvitations->execute(
            $request->validated('emails'),
            $request->validated('role'),
            $request->validated('departmentCode'),
            $request->validated('designationId') !== null ? (int) $request->validated('designationId') : null,
            $request->user(),
        );

        return response()->json([
            'data' => InvitationResource::collection($result['created']),
            'skipped' => $result['skipped'],
            'message' => sprintf('%d invitation(s) sent, %d skipped.', count($result['created']), count($result['skipped'])),
        ], 201);
    }

    public function resend(Invitation $invitation): InvitationResource
    {
        if ($invitation->accepted_at !== null) {
            throw BusinessRuleException::conflict('This invitation has already been accepted.');
        }

        $token = $invitation->issueToken();
        $invitation->revoked_at = null;
        $invitation->save();

        Notification::route('mail', $invitation->email)->notify(new InvitationSent($invitation, $token));
        $this->audit->record('invitation.resent', $invitation);

        return new InvitationResource($invitation->load(['designation:id,name', 'inviter:id,name']));
    }

    public function destroy(Invitation $invitation): InvitationResource
    {
        if (! $invitation->isPending()) {
            throw BusinessRuleException::conflict("Only pending invitations can be revoked; this one is {$invitation->status()}.");
        }

        $invitation->forceFill(['revoked_at' => now()])->save();
        $this->audit->record('invitation.revoked', $invitation);

        return new InvitationResource($invitation->load(['designation:id,name', 'inviter:id,name']));
    }

    /**
     * Public: what the accept page shows before the invitee sets a password.
     */
    public function preview(string $token): JsonResponse
    {
        $invitation = $this->findByToken($token);

        return response()->json([
            'data' => [
                'email' => $invitation->email,
                'role' => $invitation->role,
                'departmentCode' => $invitation->department_code,
                'institutionName' => $invitation->institution?->name,
                'status' => $invitation->status(),
                'expiresAt' => $invitation->expires_at->toIso8601String(),
            ],
        ]);
    }

    /**
     * Public: creates the account and signs the new user in.
     */
    public function accept(
        AcceptInvitationRequest $request,
        string $token,
        AcceptInvitationAction $acceptInvitation,
        CampusDataService $campusData,
    ): JsonResponse {
        $user = $acceptInvitation->execute(
            $this->findByToken($token),
            $request->validated('name'),
            $request->validated('password'),
        );

        $user->load(['student:id,user_id', 'institution']);
        $user->syncPermissions($campusData->permissionsFor($user));
        $tokenName = Str::limit($request->userAgent() ?: 'campus-web', 40, '') ?: 'campus-web';
        $plainToken = $user->createToken($tokenName, $campusData->permissionsFor($user))->plainTextToken;

        return response()->json($campusData->authPayload($user, $plainToken), 201);
    }

    private function findByToken(string $token): Invitation
    {
        // Unauthenticated, so there is no tenant scope; the token identifies the institution.
        return Invitation::query()
            ->with('institution:id,name,status')
            ->where('token_hash', Invitation::hashToken($token))
            ->firstOrFail();
    }
}
