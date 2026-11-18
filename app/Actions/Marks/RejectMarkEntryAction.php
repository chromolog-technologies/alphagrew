<?php

namespace App\Actions\Marks;

use App\Enums\MarkStatus;
use App\Exceptions\BusinessRuleException;
use App\Models\MarkEntry;
use App\Models\User;
use App\Notifications\MarksRejected;
use Illuminate\Support\Facades\DB;

/**
 * Sends submitted or verified marks back to draft with mandatory remarks; the faculty who
 * entered them is notified and can correct and re-submit (spec §4 Stage 4).
 */
class RejectMarkEntryAction
{
    public function execute(User $user, MarkEntry $entry, string $remarks): MarkEntry
    {
        if (! in_array($entry->status, [MarkStatus::Submitted, MarkStatus::Verified], true)) {
            throw BusinessRuleException::unprocessable("Only submitted or verified marks can be rejected; these marks are {$entry->status->value}.");
        }

        return DB::transaction(function () use ($user, $entry, $remarks): MarkEntry {
            $entry->update([
                'status' => MarkStatus::Draft,
                'remarks' => $remarks,
                'submitted_at' => null,
                'verified_by' => null,
                'verified_at' => null,
            ]);

            $entry->enteredBy?->notify(new MarksRejected($entry, $user, $remarks));

            return $entry;
        });
    }
}
