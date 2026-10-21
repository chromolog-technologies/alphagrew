<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Institution;
use App\Models\User;
use App\Support\Tenancy\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AttendanceRosterTest extends TestCase
{
    use RefreshDatabase;

    public function test_subject_roster_uses_course_classes_and_registration_number(): void
    {
        $this->seed(\Database\Seeders\SpatiePermissionsSeeder::class);

        $institutionId = Institution::defaultId();

        app(Tenant::class)->runAs($institutionId, function () use ($institutionId): void {
            User::query()->create([
                'name' => 'Faculty',
                'email' => 'faculty@attendance.test',
                'password' => 'demo123',
                'role' => UserRole::Staff->value,
                'institution_id' => $institutionId,
                'title' => 'Faculty',
                'department_code' => 'CSE',
            ]);
        });

        $department = $this->insert($institutionId, 'departments', [
            'name' => 'Computer Science',
            'code' => 'CSE',
            'status' => 'active',
        ]);
        $course = $this->insert($institutionId, 'courses', [
            'name' => 'B.Tech CSE',
            'code' => 'BTCSE',
            'department_id' => $department,
            'duration_years' => 4,
            'total_semesters' => 8,
        ]);
        $year = $this->insert($institutionId, 'academic_years', [
            'year' => '2025-2026',
            'code' => 'AY2526',
            'start_date' => '2025-06-01',
            'end_date' => '2026-05-31',
        ]);
        $semester = $this->insert($institutionId, 'semesters', [
            'academic_year_id' => $year,
            'name' => 'Semester 1',
            'semester_number' => 1,
            'start_date' => '2025-06-01',
            'end_date' => '2025-12-15',
        ]);
        $otherSemester = $this->insert($institutionId, 'semesters', [
            'academic_year_id' => $year,
            'name' => 'Semester 2',
            'semester_number' => 2,
            'start_date' => '2026-01-01',
            'end_date' => '2026-05-31',
        ]);
        $subject = $this->insert($institutionId, 'subjects', [
            'name' => 'Programming',
            'code' => 'CS101',
            'course_id' => $course,
            'semester_number' => 1,
            'credit_hours' => 4,
            'lecture_hours' => 3,
        ]);
        $classId = $this->insert($institutionId, 'classes', [
            'name' => 'CSE-1A',
            'code' => 'CSE1A',
            'course_id' => $course,
            'semester_id' => $semester,
            'batch' => 'A',
            'admission_year' => 2025,
        ]);
        $otherClass = $this->insert($institutionId, 'classes', [
            'name' => 'CSE-2A',
            'code' => 'CSE2A',
            'course_id' => $course,
            'semester_id' => $otherSemester,
            'batch' => 'A',
            'admission_year' => 2024,
        ]);

        $student = $this->insert($institutionId, 'students', [
            'name' => 'Asha',
            'email' => 'asha@attendance.test',
            'registration_number' => 'BIT25CSE001',
            'department_code' => 'CSE',
            'year' => 'year_1',
            'gender' => 'prefer_not_to_say',
            'status' => 'active',
            'cgpa' => 0,
            'attendance' => 0,
            'fee_status' => 'paid',
            'skills' => '[]',
        ]);
        $otherStudent = $this->insert($institutionId, 'students', [
            'name' => 'Bala',
            'email' => 'bala@attendance.test',
            'registration_number' => 'BIT24CSE001',
            'department_code' => 'CSE',
            'year' => 'year_2',
            'gender' => 'prefer_not_to_say',
            'status' => 'active',
            'cgpa' => 0,
            'attendance' => 0,
            'fee_status' => 'paid',
            'skills' => '[]',
        ]);

        DB::table('class_student')->insert([
            ['class_id' => $classId, 'student_id' => $student, 'assigned_from' => '2025-06-01', 'created_at' => now(), 'updated_at' => now()],
            ['class_id' => $otherClass, 'student_id' => $otherStudent, 'assigned_from' => '2025-06-01', 'created_at' => now(), 'updated_at' => now()],
        ]);

        $token = (string) $this->postJson('/api/v1/auth/login', [
            'email' => 'faculty@attendance.test',
            'password' => 'demo123',
        ])->assertOk()->json('token');

        $this->withToken($token)
            ->getJson('/api/v1/attendance/subjects')
            ->assertOk()
            ->assertJsonPath('subjects.0.code', 'CS101');

        $this->withToken($token)
            ->getJson("/api/v1/attendance/subject/{$subject}/students")
            ->assertOk()
            ->assertJsonCount(1, 'students')
            ->assertJsonPath('students.0.roll_number', 'BIT25CSE001')
            ->assertJsonPath('students.0.name', 'Asha');

        $this->withToken($token)
            ->postJson('/api/v1/attendance/mark', [
                'subject_id' => $subject,
                'attendance_date' => '2025-08-01',
                'attendance_data' => [
                    ['student_id' => $student, 'status' => 'present'],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('created', 1)
            ->assertJsonPath('errors', []);

        $this->assertDatabaseHas('attendance', [
            'student_id' => $student,
            'subject_id' => $subject,
            'status' => 'present',
        ]);
    }

    private function insert(int $institutionId, string $table, array $row): int
    {
        return DB::table($table)->insertGetId([
            ...$row,
            'institution_id' => $institutionId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
