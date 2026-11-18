<?php

namespace App\Policies;

use App\Models\Exam;
use App\Models\Subject;
use App\Models\SubjectAllocation;
use App\Models\User;
use App\Support\Campus\CampusPermission;
use Illuminate\Auth\Access\Response;

/**
 * Who may enter and review a subject's marks. Route middleware already checks
 * marks.create / marks.approve; this adds which subjects.
 * Admins pass every check through Gate::before in AppServiceProvider.
 */
class SubjectPolicy
{
    /** Enter / submit marks: only faculty allocated to the subject in the exam's semester. */
    public function enterMarks(User $user, Subject $subject, Exam $exam): Response
    {
        $allocated = SubjectAllocation::query()
            ->where('subject_id', $subject->id)
            ->where('faculty_id', $user->id)
            ->where('semester_id', $exam->semester_id)
            ->exists();

        return $allocated
            ? Response::allow()
            : Response::deny("You are not allocated to {$subject->code} this semester.");
    }

    /**
     * Verify / approve / reject: Exam Coordinators (marks.publish) across the institution,
     * HODs only for their own department's subjects (spec §3).
     */
    public function reviewMarks(User $user, Subject $subject): Response
    {
        if ($user->can(CampusPermission::MARKS_PUBLISH)) {
            return Response::allow();
        }

        $departmentCode = $subject->department?->code;

        return $departmentCode !== null && $user->department_code === $departmentCode
            ? Response::allow()
            : Response::deny("You can only verify marks for your own department ({$user->department_code}).");
    }
}
