<?php

namespace App\Actions\Students;

use App\Actions\Academics\RecalculateAcademicSummaryAction;
use App\DTOs\StudentData;
use App\Enums\UserRole;
use App\Models\Department;
use App\Models\Student;
use App\Models\User;
use App\Repositories\StudentRepository;
use App\ValueObjects\RegistrationNumber;
use Illuminate\Support\Facades\DB;

/**
 * Creates a student record and its login account. Used by admin/staff "Add student"
 * and by student self-registration.
 */
class CreateStudentAction
{
    public function __construct(
        private readonly StudentRepository $students,
        private readonly SyncStudentSkillNamesAction $syncSkills,
        private readonly RecalculateAcademicSummaryAction $recalculateSummary,
    ) {
    }

    public function execute(StudentData $data, Department $department, int $institutionId, string $mentor): Student
    {
        return DB::transaction(function () use ($data, $department, $institutionId, $mentor): Student {
            $studentId = $this->students->nextId();

            $user = User::query()->create([
                'name' => $data->name,
                'email' => $data->email,
                'password' => $data->password,
                'role' => UserRole::Student->value,
                'institution_id' => $institutionId,
                'title' => 'Student Applicant',
                'department_code' => $department->code,
                'email_verified_at' => now(),
            ]);
            $user->syncRoles([UserRole::Student->value]);

            $student = Student::query()->create([
                'id' => $studentId,
                'institution_id' => $institutionId,
                'user_id' => $user->id,
                'name' => $data->name,
                'email' => $data->email,
                'registration_number' => (string) RegistrationNumber::generate($department->code, $studentId),
                'department_code' => $department->code,
                'year' => $data->year,
                'gender' => $data->gender,
                'status' => $data->status ?? 'active',
                'cgpa' => $data->cgpa,
                'attendance' => $data->attendance,
                'phone' => $data->phone,
                'mentor' => $mentor,
                'fee_status' => $data->feeStatus,
                'resume_profile' => null,
            ]);

            $this->syncSkills->execute($student, $data->skills);
            $this->recalculateSummary->execute($student);

            return $student;
        });
    }
}
