<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Concerns\BuildsMarksFixtures;
use Tests\TestCase;

/**
 * Timetables: class rosters, entries with clash checks, and the student's own timetable.
 */
class TimetableTest extends TestCase
{
    use BuildsMarksFixtures;
    use RefreshDatabase;

    private int $classId;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->buildMarksFixtures(subjects: 2);

        $this->classId = $this->asUser('admin@demo.com')->postJson('/api/v1/classes', [
            'name' => 'DS 2025 A', 'code' => 'DS25A', 'courseId' => DB::table('courses')->where('code', 'BTDS')->value('id'),
            'semesterId' => $this->ids['semesters'][1], 'batch' => '2025-2029', 'admissionYear' => 2025,
        ])->assertCreated()->json('data.id');
    }

    public function test_students_see_the_timetable_of_their_class(): void
    {
        $student = DB::table('students')->where('email', 'student@demo.com')->value('id');

        $this->asUser('admin@demo.com')->putJson("/api/v1/classes/{$this->classId}/students", ['studentIds' => [$student, $this->ids['students']['S1']]])
            ->assertOk()
            ->assertJsonCount(2, 'data');
        $this->assertSame(2, (int) DB::table('classes')->where('id', $this->classId)->value('total_students'));

        $this->asUser('admin@demo.com')->postJson('/api/v1/timetables', $this->entry())
            ->assertCreated()
            ->assertJsonPath('data.startTime', '09:00')
            ->assertJsonPath('data.subject.code', 'DS101');

        $this->asUser('student@demo.com')->getJson('/api/v1/student/timetable')
            ->assertOk()
            ->assertJsonFragment(['course_code' => 'DS101', 'day' => 'Monday', 'start_time' => '09:00 AM']);

        // Faculty see their own sessions.
        $this->asUser('faculty@dsc.test')->getJson('/api/v1/timetables?mine=1')->assertOk()->assertJsonCount(1, 'data');

        // Removing a student keeps the others (and their original assignment date).
        $this->asUser('admin@demo.com')->putJson("/api/v1/classes/{$this->classId}/students", ['studentIds' => [$student]])->assertJsonCount(1, 'data');
    }

    public function test_clashing_sessions_are_refused(): void
    {
        $this->asUser('admin@demo.com')->postJson('/api/v1/timetables', $this->entry())->assertCreated();

        // Same class, overlapping time.
        $this->asUser('admin@demo.com')->postJson('/api/v1/timetables', $this->entry(['startTime' => '09:30', 'endTime' => '10:30', 'subjectId' => $this->ids['subjects']['DS102'], 'facultyId' => $this->ids['hod@dsc.test'], 'roomNumber' => 'B2']))
            ->assertJsonValidationErrors('startTime');

        // Another class: the faculty member and the room are already busy.
        $other = $this->asUser('admin@demo.com')->postJson('/api/v1/classes', [
            'name' => 'DS 2025 B', 'code' => 'DS25B', 'courseId' => DB::table('courses')->where('code', 'BTDS')->value('id'),
            'semesterId' => $this->ids['semesters'][1], 'batch' => '2025-2029 B', 'admissionYear' => 2025,
        ])->json('data.id');
        $this->asUser('admin@demo.com')->postJson('/api/v1/timetables', $this->entry(['classId' => $other]))
            ->assertJsonValidationErrors(['facultyId', 'roomNumber']);

        // Back to back is fine; so is the same slot on another day.
        $this->asUser('admin@demo.com')->postJson('/api/v1/timetables', $this->entry(['startTime' => '10:00', 'endTime' => '11:00']))->assertCreated();
        $this->asUser('admin@demo.com')->postJson('/api/v1/timetables', $this->entry(['dayOfWeek' => 'Tuesday']))->assertCreated();

        // A class with a timetable cannot be deleted.
        $this->asUser('admin@demo.com')->deleteJson("/api/v1/classes/{$this->classId}")->assertStatus(409);
    }

    public function test_entries_are_validated_and_only_managers_change_them(): void
    {
        $this->asUser('admin@demo.com')->postJson('/api/v1/timetables', $this->entry(['dayOfWeek' => 'Sunday', 'endTime' => '08:00']))
            ->assertJsonValidationErrors(['dayOfWeek', 'endTime']);
        $this->asUser('faculty@dsc.test')->postJson('/api/v1/timetables', $this->entry())->assertForbidden();
    }

    /** @return array<string, mixed> */
    private function entry(array $overrides = []): array
    {
        return [
            'classId' => $this->classId, 'subjectId' => $this->ids['subjects']['DS101'], 'facultyId' => $this->ids['faculty@dsc.test'],
            'dayOfWeek' => 'Monday', 'startTime' => '09:00', 'endTime' => '10:00', 'roomNumber' => 'B1', 'effectiveFrom' => now()->subDay()->toDateString(),
            ...$overrides,
        ];
    }
}
