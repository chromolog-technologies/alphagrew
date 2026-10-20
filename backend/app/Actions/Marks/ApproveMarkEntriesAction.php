<?php

namespace App\Actions\Marks;

use App\Enums\MarkStatus;
use App\Exceptions\BusinessRuleException;
use App\Models\MarkEntry;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Formal approval of verified marks, one entry or a subject's whole class (spec §4 Stage 4).
 * Approved marks wait for the semester to be published.
 */
class ApproveMarkEntriesAction
{
    public function approve(User $user, MarkEntry $entry): MarkEntry
    {
        if (! $entry->status->canTransitionTo(MarkStatus::Approved)) {
            throw BusinessRuleException::unprocessable("Only verified marks can be approved; these marks are {$entry->status->value}.");
        }

        $entry->update($this->approval($user));

        return $entry;
    }

    /**
     * @param  Collection<int, MarkEntry>  $entries
     * @return int number of verified entries approved; others are left as they are
     */
    public function approveVerified(User $user, Collection $entries): int
    {
        $verified = $entries->filter(fn (MarkEntry $entry) => $entry->status === MarkStatus::Verified);

        if ($verified->isEmpty()) {
            throw BusinessRuleException::unprocessable('There are no verified marks to approve.');
        }

        return MarkEntry::query()
            ->whereKey($verified->modelKeys())
            ->where('status', MarkStatus::Verified->value)
            ->update($this->approval($user));
    }

    /** @return array<string, mixed> */
    private function approval(User $user): array
    {
        return ['status' => MarkStatus::Approved->value, 'approved_by' => $user->id, 'approved_at' => now()];
    }
}
