<?php

namespace App\Actions\Marks;

use App\Enums\MarkStatus;
use App\Events\StudentResultsChanged;
use App\Exceptions\BusinessRuleException;
use App\Models\MarkEntry;
use App\Models\ResultPublishingLog;
use App\Models\Semester;
use App\Models\SemesterResult;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Administrative unlock of a published semester, with a mandatory reason (spec §2, §4 Stage 5).
 * Locked marks return to approved, semester results are withdrawn from students, and
 * the affected academic summaries are recalculated.
 */
class UnlockSemesterResultsAction
{
    public function execute(User $user, Semester $semester, string $reason, ?string $ipAddress): ResultPublishingLog
    {
        return DB::transaction(function () use ($user, $semester, $reason, $ipAddress): ResultPublishingLog {
            Semester::query()->whereKey($semester->id)->lockForUpdate()->first();

            $studentIds = MarkEntry::query()
                ->inSemester($semester->id)
                ->where('status', MarkStatus::Locked->value)
                ->distinct()
                ->pluck('student_id');

            if ($studentIds->isEmpty()) {
                throw BusinessRuleException::unprocessable("Results for {$semester->name} are not published.");
            }

            $entriesCount = MarkEntry::query()
                ->inSemester($semester->id)
                ->where('status', MarkStatus::Locked->value)
                ->update(['status' => MarkStatus::Approved->value, 'locked_at' => null, 'published_at' => null]);

            SemesterResult::query()
                ->where('semester_id', $semester->id)
                ->update(['is_published' => false, 'published_at' => null, 'locked_at' => null]);

            $log = ResultPublishingLog::query()->create([
                'semester_id' => $semester->id,
                'published_by' => $user->id,
                'action' => ResultPublishingLog::ACTION_UNLOCKED,
                'total_students' => $studentIds->count(),
                'students_published' => 0,
                'entries_count' => $entriesCount,
                'ip_address' => $ipAddress,
                'reason' => $reason,
                'details' => "Unlocked {$semester->name}: {$entriesCount} marks returned to approved.",
                'published_at' => now(),
            ]);

            StudentResultsChanged::dispatch($semester->institution_id, $studentIds->map(fn ($id) => (int) $id)->all(), 'unlocked');

            return $log;
        });
    }
}
