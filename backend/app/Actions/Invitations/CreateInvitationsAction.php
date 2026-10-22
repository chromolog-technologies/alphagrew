<?php

namespace App\Actions\Invitations;

use App\Models\Invitation;
use App\Models\User;
use App\Notifications\InvitationSent;
use App\Services\Audit\AuditLogger;
use App\Support\Tenancy\InstitutionScope;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

/**
 * Invites a list of addresses to the current institution. Addresses that already have
 * an account are skipped; an earlier pending invitation to the same address is revoked.
 */
class CreateInvitationsAction
{
    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * @param  list<string>  $emails  Lower-cased, unique.
     * @return array{created: list<Invitation>, skipped: list<array{email: string, reason: string}>}
     */
    public function execute(array $emails, string $role, string $departmentCode, ?int $designationId, User $inviter): array
    {
        // Accounts are unique by email across institutions.
        $existing = User::withoutGlobalScope(InstitutionScope::class)
            ->withTrashed()
            ->whereIn('email', $emails)
            ->pluck('email')
            ->map(fn (string $email): string => strtolower($email))
            ->all();

        $created = [];
        $skipped = [];

        foreach ($emails as $email) {
            if (in_array($email, $existing, true)) {
                $skipped[] = ['email' => $email, 'reason' => 'An account with this email already exists.'];

                continue;
            }

            [$invitation, $token] = DB::transaction(function () use ($email, $role, $departmentCode, $designationId, $inviter): array {
                Invitation::query()->pending()->where('email', $email)->update(['revoked_at' => now()]);

                $invitation = new Invitation([
                    'email' => $email,
                    'role' => $role,
                    'department_code' => $departmentCode,
                    'designation_id' => $designationId,
                    'invited_by' => $inviter->id,
                ]);
                $token = $invitation->issueToken();
                $invitation->save();

                return [$invitation, $token];
            });

            Notification::route('mail', $email)->notify(new InvitationSent($invitation, $token));
            $created[] = $invitation;
        }

        if ($created !== []) {
            $this->audit->record('invitation.created', null, [], [
                'role' => $role,
                'departmentCode' => $departmentCode,
                'count' => count($created),
                'emails' => array_map(fn (Invitation $invitation): string => $invitation->email, $created),
            ]);
        }

        return ['created' => $created, 'skipped' => $skipped];
    }
}
