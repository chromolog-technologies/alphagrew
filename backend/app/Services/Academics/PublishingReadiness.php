<?php

namespace App\Services\Academics;

use App\Enums\MarkStatus;
use App\Models\MarkEntry;
use App\Models\MarkScheme;
use App\Models\Semester;
use App\Models\Subject;

/**
 * Whether a semester's results can be published (spec §4 Stage 5). A semester is published
 * as a whole: every subject with a mark scheme (or marks) in the semester needs marks, and
 * none of them may still be in draft, submitted or verified.
 */
class PublishingReadiness
{
    /**
     * @return array{semesterId: int, academicYearId: int|null, totalSubjects: int, approvedSubjects: int,
     *               canPublish: bool, isPublished: bool, approvedEntries: int, lockedEntries: int,
     *               pendingSubjects: list<array<string, mixed>>}
     */
    public function check(Semester $semester): array
    {
        $counts = MarkEntry::query()
            ->inSemester($semester->id)
            ->selectRaw('subject_id, status, count(*) as total')
            ->groupBy('subject_id', 'status')
            ->toBase()
            ->get()
            ->groupBy('subject_id')
            ->map(fn ($rows) => $rows->pluck('total', 'status')->map(fn ($total) => (int) $total));

        $subjectIds = MarkScheme::query()->where('semester_id', $semester->id)->pluck('subject_id')
            ->merge($counts->keys())
            ->unique();

        $pending = [];
        $approvedSubjects = 0;

        foreach (Subject::query()->whereIn('id', $subjectIds)->orderBy('code')->get() as $subject) {
            $byStatus = $counts->get($subject->id, collect());
            $waiting = collect(MarkStatus::pending())->mapWithKeys(fn (string $status) => [$status => $byStatus->get($status, 0)]);

            if ($byStatus->isNotEmpty() && $waiting->sum() === 0) {
                $approvedSubjects++;

                continue;
            }

            $pending[] = [
                'subjectId' => $subject->id,
                'code' => $subject->code,
                'name' => $subject->name,
                'reason' => $byStatus->isEmpty() ? 'No marks entered' : 'Marks not yet approved',
                ...$waiting->all(),
            ];
        }

        $approvedEntries = $counts->sum(fn ($byStatus) => $byStatus->get(MarkStatus::Approved->value, 0));
        $lockedEntries = $counts->sum(fn ($byStatus) => $byStatus->get(MarkStatus::Locked->value, 0));

        return [
            'semesterId' => $semester->id,
            'academicYearId' => $semester->academic_year_id,
            'totalSubjects' => $subjectIds->count(),
            'approvedSubjects' => $approvedSubjects,
            'canPublish' => $subjectIds->isNotEmpty() && $pending === [] && $approvedEntries > 0,
            'isPublished' => $lockedEntries > 0 && $approvedEntries === 0,
            'approvedEntries' => $approvedEntries,
            'lockedEntries' => $lockedEntries,
            'pendingSubjects' => $pending,
        ];
    }
}
