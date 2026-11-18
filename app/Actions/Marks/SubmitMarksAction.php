<?php

namespace App\Actions\Marks;

use App\Enums\MarkStatus;
use App\Exceptions\BusinessRuleException;
use App\Models\Exam;
use App\Models\MarkEntry;
use App\Models\MarkScheme;
use App\Models\Student;
use App\Models\Subject;
use App\Models\User;
use App\Repositories\MarkEntryRepository;
use Illuminate\Support\Facades\DB;

/**
 * Faculty submit a class's draft marks for departmental review (spec §4 Stage 3).
 * Every student on the roster needs marks (or to be flagged absent), and no mark may
 * exceed the scheme's maximum. Submitted marks are read-only to the faculty.
 */
class SubmitMarksAction
{
    public function __construct(private readonly MarkEntryRepository $marks)
    {
    }

    /** @return int number of entries submitted */
    public function execute(User $user, Exam $exam, Subject $subject, MarkScheme $scheme): int
    {
        return DB::transaction(function () use ($user, $exam, $subject, $scheme): int {
            $entries = MarkEntry::query()
                ->where('exam_id', $exam->id)
                ->where('subject_id', $subject->id)
                ->lockForUpdate()
                ->get();

            $complete = $entries
                ->filter(fn (MarkEntry $entry) => $entry->is_absent || ($entry->internal_marks !== null && $entry->external_marks !== null))
                ->pluck('student_id');
            $missing = $this->marks->rosterFor($subject)->reject(fn (Student $student) => $complete->contains($student->id));

            if ($missing->isNotEmpty()) {
                throw BusinessRuleException::unprocessable("Incomplete marks entry for {$missing->count()} students", [
                    'missingStudents' => $missing->map(fn (Student $student) => [
                        'id' => $student->id,
                        'name' => $student->name,
                        'registrationNumber' => $student->registration_number,
                    ])->values(),
                ]);
            }

            $drafts = $entries->filter(fn (MarkEntry $entry) => $entry->status === MarkStatus::Draft);

            if ($drafts->isEmpty()) {
                throw BusinessRuleException::unprocessable('There are no draft marks to submit.');
            }

            $overMaximum = $drafts->filter(
                fn (MarkEntry $entry) => $entry->internal_marks > $scheme->internal_max || $entry->external_marks > $scheme->external_max
            );

            if ($overMaximum->isNotEmpty()) {
                throw BusinessRuleException::unprocessable(
                    "Marks for {$overMaximum->count()} students exceed the scheme maximum (internal {$scheme->internal_max}, external {$scheme->external_max})."
                );
            }

            return MarkEntry::query()->whereKey($drafts->modelKeys())->update([
                'status' => MarkStatus::Submitted->value,
                'submitted_at' => now(),
                'entered_by' => $user->id,
            ]);
        });
    }
}
