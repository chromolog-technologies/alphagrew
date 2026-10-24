<?php

namespace App\Enums;

/**
 * The marks lifecycle (Academic Results spec §2). Entries move one stage at a time:
 *
 *   draft → submitted → verified → approved → locked
 *   submitted / verified → draft   (rejected back to faculty)
 *   locked → approved              (results unlocked by an admin, with a reason)
 *
 * mark_entries.status stores the enum value.
 */
enum MarkStatus: string
{
    case Draft = 'draft';
    case Submitted = 'submitted';
    case Verified = 'verified';
    case Approved = 'approved';
    case Locked = 'locked';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /** Stages that still block publishing a semester. */
    public static function pending(): array
    {
        return [self::Draft->value, self::Submitted->value, self::Verified->value];
    }

    public function canTransitionTo(self $next): bool
    {
        return in_array($next, match ($this) {
            self::Draft => [self::Draft, self::Submitted],
            self::Submitted => [self::Verified, self::Draft],
            self::Verified => [self::Approved, self::Draft],
            self::Approved => [self::Locked],
            self::Locked => [self::Approved],
        }, true);
    }
}
