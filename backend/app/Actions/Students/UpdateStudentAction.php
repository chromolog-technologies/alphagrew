<?php

namespace App\Actions\Students;

use App\DTOs\StudentData;
use App\Models\Department;
use App\Models\Student;
use Illuminate\Support\Facades\DB;

/**
 * Updates a student and keeps the linked login account's name, email and department in step.
 */
class UpdateStudentAction
{
    public function execute(Student $student, StudentData $data, Department $department, string $mentor): Student
    {
        DB::transaction(function () use ($student, $data, $department, $mentor): void {
            $student->update([
                'name' => $data->name,
                'email' => $data->email,
                'department_code' => $department->code,
                'year' => $data->year,
                'gender' => $data->gender,
                'status' => $data->status ?? $student->status,
                'cgpa' => $data->cgpa,
                'attendance' => $data->attendance,
                'phone' => $data->phone,
                'mentor' => $mentor,
                'fee_status' => $data->feeStatus,
                'skills' => $data->skills,
            ]);

            $student->user?->update([
                'name' => $data->name,
                'email' => $data->email,
                'department_code' => $department->code,
                ...(! empty($data->password) ? ['password' => $data->password] : []),
            ]);
        });

        return $student;
    }
}
