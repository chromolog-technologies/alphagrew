<?php

namespace App\Actions\Students;

use App\Actions\Academics\RecalculateAcademicSummaryAction;
use App\DTOs\StudentData;
use App\Enums\UserRole;
use App\Enums\UserStatus;
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
    ) {}

    /**
     * @param  bool  $selfRegistered  Self-registration: the account waits for approval and the
     *                                email address must be verified. Admin-created accounts are active.
     */
    public function execute(StudentData $data, Department $department, int $institutionId, string $mentor, bool $selfRegistered = false): Student
    {
        return DB::transaction(function () use ($data, $department, $institutionId, $mentor, $selfRegistered): Student {
            $studentId = $this->students->nextId();

            $user = User::query()->create([
                'name' => $data->name,
                'email' => $data->email,
                'password' => $data->password,
                'role' => UserRole::Student->value,
                'status' => ($selfRegistered ? UserStatus::PendingApproval : UserStatus::Active)->value,
                'institution_id' => $institutionId,
                'title' => 'Student Applicant',
                'department_code' => $department->code,
            ]);
            // Not mass assignable, so a request can never mark an address verified.
            $user->forceFill(['email_verified_at' => $selfRegistered ? null : now()])->save();
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
