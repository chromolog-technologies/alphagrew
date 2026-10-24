<?php

namespace App\Actions\Marks;

use App\Enums\MarkStatus;
use App\Events\StudentResultsChanged;
use App\Exceptions\BusinessRuleException;
use App\Models\GradeRule;
use App\Models\MarkEntry;
use App\Models\ResultPublishingLog;
use App\Models\Semester;
use App\Models\SemesterResult;
use App\Models\User;
use App\Services\Academics\PublishingReadiness;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Publishes a semester (spec §4 Stage 5), all in one transaction:
 * 1. approved marks become locked;
 * 2. each student's semester result is written: credit-weighted SGPA, credits, backlogs;
 * 3. the action is logged with publisher, IP and entry count;
 * 4. StudentResultsChanged (after commit) queues each student's CGPA / backlog recalculation.
 */
class PublishSemesterResultsAction
{
    public function __construct(private readonly PublishingReadiness $readiness)
    {
    }

    public function execute(User $user, Semester $semester, ?string $ipAddress): ResultPublishingLog
    {
        return DB::transaction(function () use ($user, $semester, $ipAddress): ResultPublishingLog {
            // One publish / unlock of a semester at a time.
            Semester::query()->whereKey($semester->id)->lockForUpdate()->first();

            $status = $this->readiness->check($semester);

            if ($status['isPublished']) {
                throw BusinessRuleException::unprocessable("Results for {$semester->name} are already published.");
            }

            if (! $status['canPublish']) {
                $pending = count($status['pendingSubjects']);

                throw BusinessRuleException::unprocessable(
                    $pending > 0
                        ? "Cannot publish {$semester->name}: {$pending} subjects are not fully approved."
                        : "Cannot publish {$semester->name}: there are no approved marks.",
                    ['pendingSubjects' => $status['pendingSubjects']],
                );
            }

            $now = now();
            $entriesCount = MarkEntry::query()
                ->inSemester($semester->id)
                ->where('status', MarkStatus::Approved->value)
                ->update(['status' => MarkStatus::Locked->value, 'locked_at' => $now, 'published_at' => $now]);

            $byStudent = MarkEntry::query()
                ->inSemester($semester->id)
                ->where('status', MarkStatus::Locked->value)
                ->with(['subject', 'markScheme'])
                ->get()
                ->groupBy('student_id');

            foreach ($byStudent as $studentId => $entries) {
                SemesterResult::query()->updateOrCreate(
                    ['student_id' => $studentId, 'semester_id' => $semester->id],
                    [
                        ...$this->semesterResult($entries),
                        'is_published' => true,
                        'published_at' => $now,
                        'published_by' => $user->id,
                        'locked_at' => $now,
                    ],
                );
            }

            $log = ResultPublishingLog::query()->create([
                'semester_id' => $semester->id,
                'published_by' => $user->id,
                'action' => ResultPublishingLog::ACTION_PUBLISHED,
                'total_students' => $byStudent->count(),
                'students_published' => $byStudent->count(),
                'entries_count' => $entriesCount,
                'ip_address' => $ipAddress,
                'details' => "Published {$semester->name}: {$entriesCount} marks for {$byStudent->count()} students.",
                'published_at' => $now,
            ]);

            StudentResultsChanged::dispatch($semester->institution_id, $byStudent->keys()->map(fn ($id) => (int) $id)->all(), 'published');

            return $log;
        });
    }

    /**
     * SGPA = Σ(grade point × credits) / Σ credits over the semester's subjects
     * (the latest attempt where a subject was examined more than once).
     *
     * @param  Collection<int, MarkEntry>  $entries
     * @return array<string, mixed>
     */
    private function semesterResult(Collection $entries): array
    {
        $subjects = $entries->sortBy('id')->groupBy('subject_id')->map(fn (Collection $attempts) => $attempts->last());

        $totalCredits = $subjects->sum(fn (MarkEntry $entry) => $entry->subject->credits());
        $weightedPoints = $subjects->sum(fn (MarkEntry $entry) => (float) $entry->grade_point * $entry->subject->credits());
        $failed = $subjects->filter(fn (MarkEntry $entry) => $entry->failed());
        $totalMarks = $subjects->sum('total_marks');
        $possibleMarks = $subjects->sum(fn (MarkEntry $entry) => $entry->markScheme?->total_max ?? 100);
        $percentage = $possibleMarks > 0 ? round($totalMarks / $possibleMarks * 100, 2) : 0;

        return [
            'total_subjects' => $subjects->count(),
            'subjects_passed' => $subjects->count() - $failed->count(),
            'subjects_failed' => $failed->count(),
            'total_marks' => $totalMarks,
            'total_possible_marks' => $possibleMarks,
            'percentage' => $percentage,
            'overall_grade' => GradeRule::query()
                ->where('grade', '!=', GradeRule::ABSENT)
                ->where('min_score', '<=', $percentage)
                ->where('max_score', '>=', $percentage)
                ->value('grade'),
            'sgpa' => $totalCredits > 0 ? round($weightedPoints / $totalCredits, 2) : 0,
            'total_credits' => $totalCredits,
            'credits_earned' => $subjects->reject(fn (MarkEntry $entry) => $entry->failed())->sum(fn (MarkEntry $entry) => $entry->subject->credits()),
            'result' => $failed->isEmpty() ? SemesterResult::STATUS_PASS : SemesterResult::STATUS_FAIL,
        ];
    }
}
