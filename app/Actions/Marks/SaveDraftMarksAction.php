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
use App\Services\Academics\MarkGrader;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Faculty save (create or update) draft marks for a class (spec §4 Stage 2). All or nothing:
 * if any student's marks have already been submitted, nothing is saved.
 */
class SaveDraftMarksAction
{
    public function __construct(private readonly MarkGrader $grader)
    {
    }

    /**
     * @param  list<array{studentId: int, internalMarks: ?float, externalMarks: ?float, extraMarks: ?float, isAbsent: bool, remarks: ?string}>  $rows
     * @return Collection<int, MarkEntry>
     */
    public function execute(User $user, Exam $exam, Subject $subject, MarkScheme $scheme, array $rows): Collection
    {
        $departmentCode = $subject->department?->code;
        $outsiders = Student::query()
            ->whereIn('id', array_column($rows, 'studentId'))
            ->where('department_code', '!=', $departmentCode)
            ->pluck('registration_number');

        if ($outsiders->isNotEmpty()) {
            throw BusinessRuleException::unprocessable(
                "These students are not in the {$departmentCode} department: {$outsiders->implode(', ')}."
            );
        }

        return DB::transaction(function () use ($user, $exam, $subject, $scheme, $rows): Collection {
            $existing = MarkEntry::query()
                ->where('exam_id', $exam->id)
                ->where('subject_id', $subject->id)
                ->whereIn('student_id', array_column($rows, 'studentId'))
                ->lockForUpdate()
                ->get()
                ->keyBy('student_id');

            $frozen = $existing->filter(fn (MarkEntry $entry) => $entry->status !== MarkStatus::Draft);

            if ($frozen->isNotEmpty()) {
                throw BusinessRuleException::unprocessable(
                    "Marks for {$frozen->count()} students are already submitted and can no longer be edited."
                );
            }

            return collect($rows)->map(function (array $row) use ($user, $exam, $subject, $scheme, $existing): MarkEntry {
                $entry = $existing->get($row['studentId']) ?? new MarkEntry([
                    'exam_id' => $exam->id,
                    'subject_id' => $subject->id,
                    'student_id' => $row['studentId'],
                ]);

                $entry->fill([
                    'mark_scheme_id' => $scheme->id,
                    'internal_marks' => $row['internalMarks'],
                    'external_marks' => $row['externalMarks'],
                    'extra_marks' => $row['extraMarks'] ?? 0,
                    'is_absent' => $row['isAbsent'],
                    'remarks' => $row['remarks'],
                    'status' => MarkStatus::Draft,
                    'entered_by' => $user->id,
                ]);
                $entry->setRelation('markScheme', $scheme);
                $this->grader->apply($entry);
                $entry->save();

                return $entry;
            });
        });
    }
}
