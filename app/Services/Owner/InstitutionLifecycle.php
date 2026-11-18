<?php

namespace App\Services\Owner;

use App\Enums\UserRole;
use App\Exceptions\BusinessRuleException;
use App\Models\Institution;
use App\Models\InstitutionStatusEvent;
use App\Models\User;
use App\Notifications\InstitutionStatusChanged;
use App\Services\Audit\AuditLogger;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

/**
 * Institution lifecycle and verification (Owner Dashboard SRS FR-IN-004..006, §7.5).
 * Transitions follow TRANSITIONS; each change is recorded as a status event, audited and
 * sent to the institution's admins. A change can take effect later (applied hourly by
 * owner:apply-scheduled-status-changes). Data is never deleted.
 */
class InstitutionLifecycle
{
    public const TRANSITIONS = [
        'prospect' => ['trial', 'active', 'closed'],
        'trial' => ['active', 'expired', 'suspended', 'closed'],
        'active' => ['suspended', 'expired', 'closed'],
        'suspended' => ['active', 'closed'],
        'expired' => ['active', 'closed'],
        'closed' => [],
    ];

    /** Changes that need a written reason. */
    public const REASON_REQUIRED = ['suspended', 'expired', 'closed'];

    public function __construct(private readonly AuditLogger $audit)
    {
    }

    /** @return list<string> */
    public static function allowedFrom(string $status): array
    {
        return self::TRANSITIONS[$status] ?? [];
    }

    public function change(Institution $institution, string $to, User $actor, ?string $reason, ?Carbon $effectiveAt = null): InstitutionStatusEvent
    {
        if (! in_array($to, self::allowedFrom($institution->status), true)) {
            throw BusinessRuleException::unprocessable("An institution that is {$institution->status} cannot become {$to}.", [
                'allowed' => self::allowedFrom($institution->status),
            ]);
        }

        if (in_array($to, self::REASON_REQUIRED, true) && blank($reason)) {
            throw BusinessRuleException::unprocessable('Give a reason for this change.');
        }

        $effectiveAt ??= now();
        $scheduled = $effectiveAt->isFuture();

        $event = DB::transaction(function () use ($institution, $to, $actor, $reason, $effectiveAt, $scheduled): InstitutionStatusEvent {
            // A new decision replaces any change still waiting.
            $institution->statusEvents()->where('kind', 'lifecycle')->where('applied', false)->delete();

            $event = $institution->statusEvents()->create([
                'kind' => 'lifecycle',
                'from_status' => $institution->status,
                'to_status' => $to,
                'reason' => $reason,
                'effective_at' => $effectiveAt,
                'applied' => ! $scheduled,
                'actor_id' => $actor->id,
            ]);

            if (! $scheduled) {
                $this->apply($institution, $event);
            }

            return $event;
        });

        $this->audit->record(
            $scheduled ? 'owner.institution_status_scheduled' : 'owner.institution_status_changed',
            $institution,
            ['status' => $event->from_status],
            ['status' => $to, 'reason' => $reason, 'effectiveAt' => $effectiveAt->toIso8601String()],
            $actor,
        );

        $this->notify($institution, 'lifecycle', $to, $reason, $scheduled ? $effectiveAt : null);

        return $event;
    }

    public function verify(Institution $institution, string $status, User $actor, ?string $note): InstitutionStatusEvent
    {
        if (! in_array($status, ['verified', 'rejected', 'requires_information'], true)) {
            throw BusinessRuleException::unprocessable('Choose verified, rejected or requires information.');
        }

        if ($status !== 'verified' && blank($note)) {
            throw BusinessRuleException::unprocessable('Explain what is missing or why the institution was rejected.');
        }

        $from = $institution->verification_status;

        $event = DB::transaction(function () use ($institution, $status, $actor, $note, $from): InstitutionStatusEvent {
            $institution->update(['verification_status' => $status]);

            return $institution->statusEvents()->create([
                'kind' => 'verification', 'from_status' => $from, 'to_status' => $status, 'reason' => $note,
                'effective_at' => now(), 'applied' => true, 'actor_id' => $actor->id,
            ]);
        });

        $this->audit->record('owner.institution_verification', $institution, ['verification' => $from], ['verification' => $status, 'note' => $note], $actor);
        $this->notify($institution, 'verification', $status, $note, null);

        return $event;
    }

    /** Applies scheduled changes whose time has come; returns how many. */
    public function applyDue(): int
    {
        $due = InstitutionStatusEvent::query()->with('institution')->where('applied', false)->where('effective_at', '<=', now())->get();

        foreach ($due as $event) {
            DB::transaction(function () use ($event): void {
                $event->update(['applied' => true]);
                $this->apply($event->institution, $event);
            });
            $this->audit->record('owner.institution_status_changed', $event->institution, ['status' => $event->from_status], ['status' => $event->to_status, 'scheduled' => true]);
            $this->notify($event->institution, 'lifecycle', $event->to_status, $event->reason, null);
        }

        return $due->count();
    }

    private function apply(Institution $institution, InstitutionStatusEvent $event): void
    {
        $institution->forceFill([
            'status' => $event->to_status,
            'suspended_at' => $event->to_status === 'suspended' ? $event->effective_at : null,
            'suspension_reason' => $event->to_status === 'suspended' ? $event->reason : null,
        ])->save();
    }

    private function notify(Institution $institution, string $kind, string $status, ?string $reason, ?Carbon $effective): void
    {
        $admins = User::query()
            ->where('institution_id', $institution->id)
            ->where('role', UserRole::InstitutionAdmin->value)
            ->get();

        Notification::send($admins, new InstitutionStatusChanged($institution->name, $kind, $status, $reason, $effective?->format('j M Y, H:i')));
    }
}
