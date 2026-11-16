<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Support\Tenancy\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Concerns\BuildsMarksFixtures;
use Tests\TestCase;

/**
 * Academic years, classes and subject allocations: CRUD, validation, tenant scoping, and that
 * allocating a faculty member is what opens mark entry for them.
 */
class AcademicStructureTest extends TestCase
{
    use BuildsMarksFixtures;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->buildMarksFixtures();
    }

    public function test_academic_years_keep_one_active_and_protect_years_with_semesters(): void
    {
        $id = $this->asUser('admin@demo.com')
            ->postJson('/api/v1/academic-years', ['year' => '2026-2027', 'code' => 'ay2627', 'startDate' => '2026-06-01', 'endDate' => '2027-05-31', 'isActive' => true])
            ->assertCreated()
            ->assertJsonPath('data.code', 'AY2627')
            ->assertJsonPath('data.isActive', true)
            ->assertJsonPath('data.semestersCount', 0)
            ->json('data.id');

        // Only one active year per institution.
        $active = $this->tenant(fn () => AcademicYear::query()->where('is_active', true)->pluck('id')->all());
        $this->assertSame([$id], $active);

        $this->asUser('admin@demo.com')
            ->postJson('/api/v1/academic-years', ['year' => 'Bad', 'code' => 'AY2627', 'startDate' => '2026-06-01', 'endDate' => '2026-01-01'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['code', 'endDate']);

        $this->asUser('admin@demo.com')->putJson("/api/v1/academic-years/{$id}", ['year' => '2026–27'])->assertOk()->assertJsonPath('data.year', '2026–27');
        $this->asUser('admin@demo.com')->getJson('/api/v1/academic-years')->assertOk()->assertJsonPath('data.0.code', 'AY2627');

        // The fixtures' year has semesters, so it cannot be deleted; the new one can.
        $fixtureYear = $this->tenant(fn () => AcademicYear::query()->where('code', 'AY2526')->value('id'));
        $this->asUser('admin@demo.com')->deleteJson("/api/v1/academic-years/{$fixtureYear}")->assertStatus(409);
        $this->asUser('admin@demo.com')->deleteJson("/api/v1/academic-years/{$id}")->assertOk();
    }

    public function test_classes_are_created_validated_and_listed(): void
    {
        $course = DB::table('courses')->where('code', 'BTDS')->value('id');
        $payload = ['name' => 'DS 2025 · Sem 1 · A', 'code' => 'DS25-1A', 'courseId' => $course, 'semesterId' => $this->ids['semesters'][1], 'batch' => '2025-2029', 'admissionYear' => 2025];

        $id = $this->asUser('admin@demo.com')->postJson('/api/v1/classes', $payload)
            ->assertCreated()
            ->assertJsonPath('data.course.code', 'BTDS')
            ->assertJsonPath('data.totalStudents', 0)
            ->json('data.id');

        $this->asUser('admin@demo.com')->postJson('/api/v1/classes', $payload)->assertJsonValidationErrors('code');
        $this->asUser('admin@demo.com')->postJson('/api/v1/classes', [])->assertJsonValidationErrors(['name', 'code', 'courseId', 'semesterId', 'batch', 'admissionYear']);

        $this->asUser('admin@demo.com')->putJson("/api/v1/classes/{$id}", ['name' => 'DS 2025 · A'])->assertOk()->assertJsonPath('data.name', 'DS 2025 · A');
        $this->asUser('admin@demo.com')->getJson("/api/v1/classes?courseId={$course}")->assertOk()->assertJsonCount(1, 'data');

        // Staff without department management cannot change classes.
        $this->asUser('faculty@dsc.test')->postJson('/api/v1/classes', [...$payload, 'code' => 'X'])->assertForbidden();

        $this->asUser('admin@demo.com')->deleteJson("/api/v1/classes/{$id}")->assertOk();
    }

    public function test_allocating_a_faculty_member_opens_mark_entry_for_them(): void
    {
        $exam = $this->ids['exams']['DS101'];
        $subject = $this->ids['subjects']['DS101'];
        $roster = "/api/v1/mark-entries/get-students?examId={$exam}&subjectId={$subject}";

        // The HOD is not allocated to DS101 yet.
        $this->asUser('hod@dsc.test')->getJson($roster)->assertForbidden();

        $payload = ['subjectId' => $subject, 'semesterId' => $this->ids['semesters'][1], 'facultyId' => $this->ids['hod@dsc.test']];
        $id = $this->asUser('admin@demo.com')->postJson('/api/v1/subject-allocations', $payload)
            ->assertCreated()
            ->assertJsonPath('data.faculty.email', 'hod@dsc.test')
            ->assertJsonPath('data.subject.code', 'DS101')
            ->json('data.id');

        $this->asUser('hod@dsc.test')->getJson($roster)->assertOk();

        // No duplicates; only staff of this institution can be allocated.
        $this->asUser('admin@demo.com')->postJson('/api/v1/subject-allocations', $payload)->assertJsonValidationErrors('facultyId');
        $student = DB::table('users')->where('email', 'student@demo.com')->value('id');
        $this->asUser('admin@demo.com')->postJson('/api/v1/subject-allocations', [...$payload, 'facultyId' => $student])->assertJsonValidationErrors('facultyId');

        $this->asUser('admin@demo.com')->getJson("/api/v1/subject-allocations?subjectId={$subject}")->assertOk()->assertJsonCount(2, 'data');
        $this->asUser('admin@demo.com')->putJson("/api/v1/subject-allocations/{$id}", ['allocatedTo' => '2000-01-01'])->assertJsonValidationErrors('allocatedTo');

        // Removing the allocation closes mark entry again.
        $this->asUser('admin@demo.com')->deleteJson("/api/v1/subject-allocations/{$id}")->assertOk();
        $this->asUser('hod@dsc.test')->getJson($roster)->assertForbidden();
    }

    private function tenant(callable $callback): mixed
    {
        return app(Tenant::class)->runAs($this->institutionId, $callback);
    }
}
