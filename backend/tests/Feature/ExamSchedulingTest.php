<?php

namespace Tests\Feature;

use App\Enums\MarkStatus;
use App\Models\Exam;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Concerns\BuildsMarksFixtures;
use Tests\TestCase;

/**
 * Scheduling exams: shared exam types, create/update/delete with validation, who may manage
 * exams, custom fields, and the lock once marks exist.
 */
class ExamSchedulingTest extends TestCase
{
    use BuildsMarksFixtures;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->buildMarksFixtures(subjects: 2);
    }

    public function test_standard_exam_types_are_available(): void
    {
        $codes = array_column($this->asUser('admin@demo.com')->getJson('/api/v1/exam-types')->assertOk()->json('data'), 'code');

        foreach (['ESE', 'MID', 'IA', 'PRAC', 'ASGN'] as $code) {
            $this->assertContains($code, $codes);
        }
    }

    public function test_admin_schedules_updates_and_deletes_an_exam(): void
    {
        $id = $this->asUser('admin@demo.com')->postJson('/api/v1/exams', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.name', 'DS102 mid term')
            ->assertJsonPath('data.duration_minutes', 90)
            ->assertJsonPath('data.start_time', '10:00')
            ->assertJsonPath('data.subject.code', 'DS102')
            ->assertJsonPath('data.exam_type.code', 'MID')
            ->assertJsonPath('data.mark_entries_count', 0)
            ->json('data.id');

        $this->asUser('admin@demo.com')
            ->putJson("/api/v1/exams/{$id}", ['startTime' => '09:00', 'endTime' => '12:00', 'status' => 'postponed', 'location' => 'Hall B'])
            ->assertOk()
            ->assertJsonPath('data.duration_minutes', 180)
            ->assertJsonPath('data.status', 'postponed')
            ->assertJsonPath('data.location', 'Hall B');

        // Listed for mark entry like the seeded exams.
        $names = array_column($this->asUser('admin@demo.com')->getJson('/api/v1/exams')->json('data'), 'name');
        $this->assertContains('DS102 mid term', $names);

        $this->asUser('admin@demo.com')->deleteJson("/api/v1/exams/{$id}")->assertOk();
        $this->assertSoftDeleted('exams', ['id' => $id]);
    }

    public function test_input_is_validated(): void
    {
        $this->asUser('admin@demo.com')->postJson('/api/v1/exams', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'subjectId', 'semesterId', 'examTypeId', 'examDate', 'startTime', 'endTime']);

        $this->asUser('admin@demo.com')
            ->postJson('/api/v1/exams', [...$this->payload(), 'endTime' => '09:00', 'examMode' => 'carrier-pigeon', 'examTypeId' => 999999])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['endTime', 'examMode', 'examTypeId']);

        // A subject of another institution does not exist here.
        $other = DB::table('institutions')->insertGetId(['name' => 'Other', 'code' => 'OTH', 'slug' => 'oth', 'status' => 'active', 'created_at' => now(), 'updated_at' => now()]);
        $foreignCourse = DB::table('courses')->insertGetId(['institution_id' => $other, 'name' => 'X', 'code' => 'X1', 'department_id' => 1, 'duration_years' => 4, 'total_semesters' => 8, 'created_at' => now(), 'updated_at' => now()]);
        $foreignSubject = DB::table('subjects')->insertGetId(['institution_id' => $other, 'name' => 'X', 'code' => 'X101', 'course_id' => $foreignCourse, 'semester_number' => 1, 'credit_hours' => 3, 'lecture_hours' => 3, 'created_at' => now(), 'updated_at' => now()]);
        $this->asUser('admin@demo.com')->postJson('/api/v1/exams', [...$this->payload(), 'subjectId' => $foreignSubject])
            ->assertJsonValidationErrors('subjectId');
    }

    public function test_only_admins_and_exam_coordinators_manage_exams(): void
    {
        $this->asUser('faculty@dsc.test')->postJson('/api/v1/exams', $this->payload())->assertForbidden();
        $this->asUser('hod@dsc.test')->postJson('/api/v1/exams', $this->payload())->assertForbidden();

        // Exam coordinators (marks.publish) schedule the exams whose results they publish.
        $id = $this->asUser('coordinator@ece.test')->postJson('/api/v1/exams', $this->payload())->assertCreated()->json('data.id');
        $this->asUser('faculty@dsc.test')->deleteJson("/api/v1/exams/{$id}")->assertForbidden();

        // Faculty can still list exams for mark entry.
        $this->asUser('faculty@dsc.test')->getJson('/api/v1/exams')->assertOk();
    }

    public function test_an_exam_with_marks_keeps_its_subject_and_cannot_be_deleted(): void
    {
        $exam = $this->ids['exams']['DS101'];
        $this->markEntry('DS101', 'S1', 30, 50, MarkStatus::Draft);

        $this->asUser('admin@demo.com')->putJson("/api/v1/exams/{$exam}", ['subjectId' => $this->ids['subjects']['DS102']])->assertStatus(409);
        $this->asUser('admin@demo.com')->deleteJson("/api/v1/exams/{$exam}")->assertStatus(409);

        // Other changes are fine, including cancelling it.
        $this->asUser('admin@demo.com')->putJson("/api/v1/exams/{$exam}", ['status' => 'cancelled', 'name' => 'Renamed'])
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled')
            ->assertJsonPath('data.mark_entries_count', 1);
        $this->assertNotNull(Exam::query()->withoutGlobalScopes()->find($exam));
    }

    public function test_exam_custom_fields_are_required_on_create_and_returned(): void
    {
        $this->asUser('admin@demo.com')
            ->postJson('/api/v1/custom-fields', ['entity' => 'exam', 'label' => 'Invigilator', 'type' => 'text', 'isRequired' => true])
            ->assertCreated();

        $this->asUser('admin@demo.com')->postJson('/api/v1/exams', $this->payload())
            ->assertUnprocessable()
            ->assertJsonValidationErrors('customFields');

        $this->asUser('admin@demo.com')->postJson('/api/v1/exams', [...$this->payload(), 'customFields' => ['invigilator' => 'Dr. Rao']])
            ->assertCreated()
            ->assertJsonPath('data.customFields.invigilator', 'Dr. Rao');
    }

    /** @return array<string, mixed> */
    private function payload(): array
    {
        return [
            'name' => 'DS102 mid term',
            'subjectId' => $this->ids['subjects']['DS102'],
            'semesterId' => $this->ids['semesters'][1],
            'examTypeId' => DB::table('exam_types')->where('code', 'MID')->value('id'),
            'examDate' => '2026-12-10',
            'startTime' => '10:00',
            'endTime' => '11:30',
            'location' => 'Hall A',
            'maxMarks' => 50,
        ];
    }
}
