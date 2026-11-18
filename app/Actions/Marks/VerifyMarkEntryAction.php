<?php

namespace App\Actions\Marks;

use App\Enums\MarkStatus;
use App\Exceptions\BusinessRuleException;
use App\Models\MarkEntry;
use App\Models\User;
use App\Services\Academics\MarkGrader;
use Illuminate\Support\Facades\DB;

/**
 * HOD / Exam Coordinator verify a submitted mark, optionally applying moderation
 * adjustments, which re-grade the entry (spec §4 Stage 4).
 */
class VerifyMarkEntryAction
{
    public function __construct(private readonly MarkGrader $grader)
    {
    }

    /**
     * @param  array{internal_marks?: float|null, external_marks?: float|null, extra_marks?: float|null}  $adjustments
     */
    public function execute(User $user, MarkEntry $entry, ?string $remarks, array $adjustments): MarkEntry
    {
        if (! $entry->status->canTransitionTo(MarkStatus::Verified)) {
            throw BusinessRuleException::unprocessable("Only submitted marks can be verified; these marks are {$entry->status->value}.");
        }

        $adjustments = array_filter($adjustments, fn ($value) => $value !== null);
        $scheme = $entry->markScheme;

        if (($adjustments['internal_marks'] ?? 0) > $scheme->internal_max || ($adjustments['external_marks'] ?? 0) > $scheme->external_max) {
            throw BusinessRuleException::unprocessable(
                "Adjusted marks exceed the scheme maximum (internal {$scheme->internal_max}, external {$scheme->external_max})."
            );
        }

        return DB::transaction(function () use ($user, $entry, $remarks, $adjustments): MarkEntry {
            if ($adjustments !== []) {
                $entry->fill($adjustments);
                $this->grader->apply($entry);
            }

            $entry->fill([
                'status' => MarkStatus::Verified,
                'verified_by' => $user->id,
                'verified_at' => now(),
                'remarks' => $remarks ?? $entry->remarks,
            ])->save();

            return $entry;
        });
    }
}
