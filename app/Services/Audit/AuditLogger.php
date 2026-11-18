<?php

namespace App\Services\Audit;

use App\Models\AuditLog;
use App\Models\User;
use App\Support\Tenancy\Tenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

/**
 * Writes audit_logs rows. Actions are dotted names such as "auth.login" or
 * "invitation.created". Secrets are never stored, whatever the caller passes.
 */
class AuditLogger
{
    private const REDACTED_KEYS = ['password', 'password_confirmation', 'token', 'token_hash', 'remember_token'];

    public function __construct(private readonly Tenant $tenant) {}

    /**
     * @param  array<string, mixed>  $old
     * @param  array<string, mixed>  $new
     * @param  User|null  $actor  Defaults to the signed-in user.
     * @param  int|null  $institutionId  Defaults to the tenant, then the actor's or subject's institution.
     */
    public function record(
        string $action,
        ?Model $subject = null,
        array $old = [],
        array $new = [],
        ?User $actor = null,
        ?int $institutionId = null,
    ): AuditLog {
        $actor ??= auth()->user();
        $request = request();

        $log = new AuditLog([
            'actor_id' => $actor?->id,
            'action' => $action,
            'subject_type' => $subject ? $subject->getMorphClass() : null,
            'subject_id' => $subject?->getKey(),
            'old_values' => $old === [] ? null : $this->redact($old),
            'new_values' => $new === [] ? null : $this->redact($new),
            'ip_address' => $request->ip(),
            'user_agent' => Str::limit((string) $request->userAgent(), 250, '') ?: null,
        ]);

        // Within a request the BelongsToInstitution hook sets the tenant; outside one
        // (login, password reset, registration) the institution is given explicitly.
        $log->institution_id = $institutionId
            ?? $this->tenant->id()
            ?? $actor?->institution_id
            ?? $subject?->getAttribute('institution_id');
        $log->save();

        return $log;
    }

    /**
     * @param  array<string, mixed>  $values
     * @return array<string, mixed>
     */
    private function redact(array $values): array
    {
        return Arr::except($values, self::REDACTED_KEYS);
    }
}
