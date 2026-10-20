<?php

namespace App\Actions\Students;

use App\Models\CompanyApplication;
use App\Models\Student;
use Illuminate\Support\Facades\DB;

/**
 * Removes a student, their drive applications, and their login account (revoking its tokens).
 */
class DeleteStudentAction
{
    public function execute(Student $student): void
    {
        $student->loadMissing('user');

        DB::transaction(function () use ($student): void {
            $linkedUser = $student->user;

            CompanyApplication::query()->where('student_id', $student->id)->delete();
            $student->delete();

            if ($linkedUser) {
                $linkedUser->tokens()->delete();
                $linkedUser->delete();
            }
        });
    }
}
