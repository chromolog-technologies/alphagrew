<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Institution;
use App\Models\User;
use App\Support\Campus\CampusPermission;
use App\Support\Tenancy\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Attendance access rules: staff see what they marked, students see their own records
 * (looked up through the students row, not the user id), and nothing crosses institutions.
 */
class AttendanceAccessTest extends TestCase
{
    use RefreshDatabase;

    private int $institutionId;

    private int $subject;

    private int $classId;

    private User $staffA;

    private User $staffB;

    private User $studentUser;

    private int $student;

    private int $classmate;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\SpatiePermissionsSeeder::class);
        $this->institutionId = Institution::defaultId();

        $this->staffA = $this->user('staff.a@attendance.test', UserRole::Staff);
        $this->staffB = $this->user('staff.b@attendance.test', UserRole::Staff);
        $this->studentUser = $this->user('asha@attendance.test', UserRole::Student);

        $department = $this->insert('departments', ['name' => 'Computer Science', 'code' => 'CSE', 'status' => 'active']);
        $course = $this->insert('courses', [
            'name' => 'B.Tech CSE', 'code' => 'BTCSE', 'department_id' => $department,
            'duration_years' => 4, 'total_semesters' => 8,
        ]);
        $year = $this->insert('academic_years', [
            'year' => '2025-2026', 'code' => 'AY2526', 'start_date' => '2025-06-01', 'end_date' => '2026-05-31',
        ]);
        $semester = $this->insert('semesters', [
            'academic_year_id' => $year, 'name' => 'Semester 1', 'semester_number' => 1,
            'start_date' => '2025-06-01', 'end_date' => '2025-12-15',
        ]);
        $this->subject = $this->insert('subjects', [
            'name' => 'Programming', 'code' => 'CS101', 'course_id' => $course,
            'semester_number' => 1, 'credit_hours' => 4, 'lecture_hours' => 3,
        ]);
        $this->classId = $this->insert('classes', [
            'name' => 'CSE-1A', 'code' => 'CSE1A', 'course_id' => $course, 'semester_id' => $semester,
            'batch' => 'A', 'admission_year' => 2025,
        ]);

        // Padding rows so a student's id never equals their user id.
        for ($i = 0; $i < 5; $i++) {
            $this->studentRow("pad{$i}@attendance.test", "PAD{$i}");
        }
        $this->student = $this->studentRow('asha@attendance.test', 'BIT25CSE001', $this->studentUser->id);
        $this->classmate = $this->studentRow('bala@attendance.test', 'BIT25CSE002');
        $this->assertNotSame($this->student, $this->studentUser->id);

        DB::table('class_student')->insert([
            ['class_id' => $this->classId, 'student_id' => $this->student, 'assigned_from' => '2025-06-01', 'created_at' => now(), 'updated_at' => now()],
            ['class_id' => $this->classId, 'student_id' => $this->classmate, 'assigned_from' => '2025-06-01', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function test_staff_only_see_and_overwrite_attendance_they_marked(): void
    {
        Sanctum::actingAs($this->staffA);
        $this->mark([$this->student => 'present'])->assertOk()->assertJsonPath('created', 1);

        Sanctum::actingAs($this->staffB);
        $this->getJson('/api/v1/attendance')->assertOk()->assertJsonPath('pagination.total', 0);
        $this->getJson("/api/v1/attendance/subject/{$this->subject}/report")->assertOk()->assertJsonCount(0, 'records');

        $this->mark([$this->student => 'absent'])
            ->assertOk()
            ->assertJsonPath('created', 0)
            ->assertJsonPath('errors.0.student_id', $this->student);
        $this->assertDatabaseHas('attendance', ['student_id' => $this->student, 'status' => 'present', 'faculty_id' => $this->staffA->id]);

        Sanctum::actingAs($this->staffA);
        $this->getJson('/api/v1/attendance')->assertOk()->assertJsonPath('pagination.total', 1);
    }

    public function test_staff_who_approve_attendance_see_every_record(): void
    {
        Sanctum::actingAs($this->staffA);
        $this->mark([$this->student => 'present'])->assertOk();

        $this->staffB->givePermissionTo(CampusPermission::ATTENDANCE_APPROVE);
        Sanctum::actingAs($this->staffB->fresh());

        $this->getJson('/api/v1/attendance')->assertOk()->assertJsonPath('pagination.total', 1);
    }

    public function test_marking_rejects_other_institutions_and_off_roster_students(): void
    {
        $other = Institution::query()->create(['name' => 'Second College', 'code' => 'SECOND', 'slug' => 'second', 'status' => 'active'])->id;
        $foreignStudent = $this->studentRow('b@second.test', 'B001', null, $other);
        $offRoster = $this->studentRow('carl@attendance.test', 'BIT25CSE099');

        Sanctum::actingAs($this->staffA);

        $this->mark([$foreignStudent => 'present'])->assertUnprocessable()->assertJsonValidationErrors('attendance_data.0.student_id');

        $this->mark([$offRoster => 'present', $this->classmate => 'present'])
            ->assertOk()
            ->assertJsonPath('created', 1)
            ->assertJsonPath('errors.0.student_id', $offRoster);
        $this->assertDatabaseMissing('attendance', ['student_id' => $offRoster]);

        $this->getJson('/api/v1/attendance?per_page=100000')->assertUnprocessable();
    }

    public function test_students_read_their_own_report_only(): void
    {
        Sanctum::actingAs($this->staffA);
        $this->mark([$this->student => 'present', $this->classmate => 'absent'])->assertOk();

        Sanctum::actingAs($this->studentUser);

        $this->getJson("/api/v1/attendance/student/{$this->student}/report")
            ->assertOk()
            ->assertJsonPath('overall.total_classes', 1)
            ->assertJsonPath('overall.present', 1);
        $this->getJson("/api/v1/attendance/student/{$this->classmate}/report")->assertForbidden();

        $this->getJson('/api/v1/attendance')
            ->assertOk()
            ->assertJsonPath('pagination.total', 1)
            ->assertJsonPath('attendance.0.student_id', $this->student);
    }

    public function test_student_attendance_endpoints_use_the_students_row(): void
    {
        Sanctum::actingAs($this->staffA);
        $this->mark([$this->student => 'present', $this->classmate => 'absent'])->assertOk();

        Sanctum::actingAs($this->studentUser);

        $this->getJson('/api/v1/student/attendance/statistics')
            ->assertOk()
            ->assertJsonPath('data.total_classes', 1)
            ->assertJsonPath('data.present', 1);
        $this->getJson('/api/v1/student/attendance/detailed')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.date', now()->toDateString());
        $this->getJson('/api/v1/student/attendance')
            ->assertOk()
            ->assertJsonPath('data.0.subject_code', 'CS101');
    }

    public function test_student_timetable_comes_from_their_class(): void
    {
        $this->insert('timetables', [
            'class_id' => $this->classId, 'subject_id' => $this->subject, 'day_of_week' => 'Monday',
            'start_time' => '09:00:00', 'end_time' => '10:00:00', 'faculty_id' => $this->staffA->id,
            'room_number' => 'R101', 'effective_from' => '2025-06-01',
        ]);
        // Expired slot: not shown.
        $this->insert('timetables', [
            'class_id' => $this->classId, 'subject_id' => $this->subject, 'day_of_week' => 'Tuesday',
            'start_time' => '09:00:00', 'end_time' => '10:00:00', 'faculty_id' => $this->staffA->id,
            'effective_from' => '2025-06-01', 'effective_to' => '2025-07-01',
        ]);

        Sanctum::actingAs($this->studentUser);

        $this->getJson('/api/v1/student/timetable')
            ->assertOk()
            ->assertJsonPath('data.all_classes', 1)
            ->assertJsonPath('data.all_slots.0.course_code', 'CS101')
            ->assertJsonPath('data.all_slots.0.semester', 'Semester 1')
            ->assertJsonPath('data.all_slots.0.room', 'R101')
            ->assertJsonPath('data.all_slots.0.start_time', '09:00 AM');
        $this->getJson('/api/v1/student/timetable/day?day=Monday')
            ->assertOk()
            ->assertJsonPath('data.classes_count', 1);

        Sanctum::actingAs($this->staffA);
        $this->getJson('/api/v1/student/timetable')->assertNotFound();
    }

    public function test_student_timetable_reports_real_durations_and_class(): void
    {
        $this->insert('timetables', [
            'class_id' => $this->classId, 'subject_id' => $this->subject, 'day_of_week' => 'Wednesday',
            'start_time' => '14:00:00', 'end_time' => '15:30:00', 'faculty_id' => $this->staffA->id,
            'effective_from' => '2025-06-01',
        ]);
        $this->insert('timetables', [
            'class_id' => $this->classId, 'subject_id' => $this->subject, 'day_of_week' => 'Monday',
            'start_time' => '09:00:00', 'end_time' => '10:00:00', 'faculty_id' => $this->staffA->id,
            'effective_from' => '2025-06-01',
        ]);

        Sanctum::actingAs($this->studentUser);

        $this->getJson('/api/v1/student/timetable')
            ->assertOk()
            ->assertJsonPath('data.class.code', 'CSE1A')
            ->assertJsonPath('data.notice', null)
            ->assertJsonPath('data.learning_hours_per_week', 2.5)
            ->assertJsonPath('data.unique_faculty', 1)
            // Monday sorts before Wednesday (not alphabetically).
            ->assertJsonPath('data.all_slots.0.day', 'Monday')
            ->assertJsonPath('data.all_slots.1.start', '14:00')
            ->assertJsonPath('data.all_slots.1.end_time', '03:30 PM')
            ->assertJsonPath('data.all_slots.1.duration_minutes', 90)
            ->assertJsonPath('data.all_slots.1.room', null);

        $this->getJson('/api/v1/student/timetable/day?day=Sunday')->assertUnprocessable();
    }

    public function test_student_without_a_class_gets_an_empty_timetable_with_a_reason(): void
    {
        DB::table('class_student')->where('student_id', $this->student)->delete();
        Sanctum::actingAs($this->studentUser);

        $this->getJson('/api/v1/student/timetable')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.class', null)
            ->assertJsonPath('data.all_classes', 0)
            ->assertJsonPath('data.notice', 'You have not been added to a class yet. Your timetable will appear here once your institution assigns you to one.');
        $this->getJson('/api/v1/student/timetable/day?day=Monday')
            ->assertOk()
            ->assertJsonPath('data.classes_count', 0);
    }

    public function test_student_in_a_batch_but_not_a_roster_gets_the_batch_class_timetable(): void
    {
        DB::table('class_student')->where('student_id', $this->student)->delete();
        $batch = $this->insert('batches', ['name' => 'CSE 2025', 'code' => 'CSE25', 'admission_year' => 2025, 'graduation_year' => 2029, 'status' => 'active']);
        DB::table('students')->where('id', $this->student)->update(['batch_id' => $batch]);
        DB::table('classes')->where('id', $this->classId)->update(['batch_id' => $batch]);
        $this->insert('timetables', [
            'class_id' => $this->classId, 'subject_id' => $this->subject, 'day_of_week' => 'Monday',
            'start_time' => '09:00:00', 'end_time' => '10:00:00', 'faculty_id' => $this->staffA->id,
            'effective_from' => '2025-06-01',
        ]);

        Sanctum::actingAs($this->studentUser);
        $this->getJson('/api/v1/student/timetable')
            ->assertOk()
            ->assertJsonPath('data.class.id', $this->classId)
            ->assertJsonPath('data.all_classes', 1);

        // Two classes in the batch: ambiguous, so no guess.
        $this->insert('classes', [
            'name' => 'CSE-1B', 'code' => 'CSE1B', 'course_id' => DB::table('classes')->where('id', $this->classId)->value('course_id'),
            'semester_id' => DB::table('classes')->where('id', $this->classId)->value('semester_id'),
            'batch' => 'B', 'admission_year' => 2025, 'batch_id' => $batch,
        ]);
        $this->getJson('/api/v1/student/timetable')
            ->assertOk()
            ->assertJsonPath('data.class', null)
            ->assertJsonPath('data.all_classes', 0);
    }

    public function test_attendance_calendar_groups_a_month_of_own_records_by_day(): void
    {
        $other = $this->insert('subjects', [
            'name' => 'Mathematics', 'code' => 'MA101', 'course_id' => DB::table('subjects')->where('id', $this->subject)->value('course_id'),
            'semester_number' => 1, 'credit_hours' => 4, 'lecture_hours' => 3,
        ]);
        $record = fn (int $student, int $subject, string $date, string $status) => $this->insert('attendance', [
            'student_id' => $student, 'subject_id' => $subject, 'faculty_id' => $this->staffA->id,
            'attendance_date' => $date, 'status' => $status,
        ]);
        $record($this->student, $this->subject, '2026-03-02', 'present');
        $record($this->student, $other, '2026-03-02', 'present');
        $record($this->student, $this->subject, '2026-03-03', 'present');
        $record($this->student, $other, '2026-03-03', 'absent');
        $record($this->student, $this->subject, '2026-03-04', 'absent');
        $record($this->student, $this->subject, '2026-03-05', 'leave');
        $record($this->student, $this->subject, '2026-04-01', 'present'); // next month
        $record($this->classmate, $this->subject, '2026-03-06', 'absent'); // someone else

        Sanctum::actingAs($this->studentUser);

        $this->getJson('/api/v1/student/attendance/calendar?month=2026-03')
            ->assertOk()
            ->assertJsonPath('data.month', '2026-03')
            ->assertJsonPath('data.from', '2026-03-01')
            ->assertJsonPath('data.to', '2026-03-31')
            ->assertJsonCount(4, 'data.days')
            ->assertJsonPath('data.days.0.date', '2026-03-02')
            ->assertJsonPath('data.days.0.status', 'present')
            ->assertJsonCount(2, 'data.days.0.sessions')
            ->assertJsonPath('data.days.1.status', 'partial')
            ->assertJsonPath('data.days.2.status', 'absent')
            ->assertJsonPath('data.days.3.status', 'leave')
            ->assertJsonPath('data.summary.total', 6)
            ->assertJsonPath('data.summary.present', 3)
            ->assertJsonPath('data.summary.percentage', 50);

        $this->getJson("/api/v1/student/attendance/calendar?month=2026-03&subject_id={$other}")
            ->assertOk()
            ->assertJsonCount(2, 'data.days');

        $this->getJson('/api/v1/student/attendance/calendar?month=March')->assertUnprocessable();
    }

    /** @param  array<int, string>  $statuses  student id => status */
    private function mark(array $statuses)
    {
        return $this->postJson('/api/v1/attendance/mark', [
            'subject_id' => $this->subject,
            'attendance_date' => now()->toDateString(),
            'attendance_data' => collect($statuses)
                ->map(fn (string $status, int $id) => ['student_id' => $id, 'status' => $status])
                ->values()
                ->all(),
        ]);
    }

    private function user(string $email, UserRole $role): User
    {
        return app(Tenant::class)->runAs($this->institutionId, fn () => User::query()->create([
            'name' => $email,
            'email' => $email,
            'password' => 'demo123',
            'role' => $role->value,
            'institution_id' => $this->institutionId,
            'department_code' => 'CSE',
        ]));
    }

    private function studentRow(string $email, string $registration, ?int $userId = null, ?int $institutionId = null): int
    {
        return $this->insert('students', [
            'name' => $email,
            'email' => $email,
            'user_id' => $userId,
            'registration_number' => $registration,
            'department_code' => 'CSE',
            'year' => 'year_1',
            'gender' => 'prefer_not_to_say',
            'status' => 'active',
            'cgpa' => 0,
            'attendance' => 0,
            'fee_status' => 'paid',
            'skills' => '[]',
        ], $institutionId);
    }

    private function insert(string $table, array $row, ?int $institutionId = null): int
    {
        return DB::table($table)->insertGetId([
            ...$row,
            'institution_id' => $institutionId ?? $this->institutionId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
