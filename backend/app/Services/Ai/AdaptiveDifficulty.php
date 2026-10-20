<?php

namespace App\Services\Ai;

use App\Models\AiInterviewTurn;

/**
 * Stage 10 — Difficulty(t+1) = clamp(Difficulty(t) + Δ, 1, 5) (spec §4.4):
 * - Δ = −1 when the latest answer scores technically below 50 or the candidate says they don't know;
 * - Δ = +1 when the latest two answers at the current difficulty both score ≥ 85 with profound depth
 *   (after a change the pair starts again, so five strong answers from 2 reach 4, not 5);
 * - Δ = 0 otherwise.
 */
final class AdaptiveDifficulty
{
    public const MIN = 1;

    public const MAX = 5;

    /** @param  list<AiInterviewTurn>  $answered  answered turns, oldest first */
    public static function delta(array $answered): int
    {
        $last = $answered[count($answered) - 1] ?? null;

        if ($last === null) {
            return 0;
        }

        if (self::weak($last->quick_signal ?? [])) {
            return -1;
        }

        $previous = $answered[count($answered) - 2] ?? null;

        return $previous !== null
            && $previous->difficulty === $last->difficulty
            && self::strong($previous->quick_signal ?? [])
            && self::strong($last->quick_signal ?? []) ? 1 : 0;
    }

    public static function apply(int $difficulty, int $delta): int
    {
        return max(self::MIN, min(self::MAX, $difficulty + $delta));
    }

    public static function weak(array $signal): bool
    {
        return ($signal['saysDontKnow'] ?? false) || ($signal['technicalScore'] ?? 100) < 50;
    }

    public static function strong(array $signal): bool
    {
        return ($signal['technicalScore'] ?? 0) >= 85 && ($signal['depth'] ?? null) === 'profound';
    }
}
