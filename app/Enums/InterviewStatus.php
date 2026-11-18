<?php

namespace App\Enums;

/**
 * An AI mock interview session (AI Interview Journey spec §2):
 *
 *   planned → in_progress → evaluating → completed
 *   planned / in_progress → abandoned   (ended early or idle)
 *   evaluating → failed                 (evaluation could not be produced)
 */
enum InterviewStatus: string
{
    case Planned = 'planned';
    case InProgress = 'in_progress';
    case Evaluating = 'evaluating';
    case Completed = 'completed';
    case Abandoned = 'abandoned';
    case Failed = 'failed';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /** A student has at most one active session. */
    public function isActive(): bool
    {
        return $this === self::Planned || $this === self::InProgress;
    }
}
