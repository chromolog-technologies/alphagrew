<?php

namespace Tests\Feature;

use App\Enums\MarkStatus;
use App\Enums\UserRole;
use App\Models\User;
use App\Services\Dashboards\DashboardTemplates;
use App\Support\Tenancy\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Concerns\BuildsMarksFixtures;
use Tests\TestCase;

/**
 * Dashboards: role templates, the widget query engine and its data scopes, custom fields
 * in widgets, and dashboard sharing.
 *
 * World (BuildsMarksFixtures with two subjects): DSC students S1–S3; DS101 marks are
 * published for everyone, S1 also has a draft fail in DS102. faculty@dsc.test teaches DS101
 * only. s1@dsc.test is S1's student account.
 */
class DashboardTest extends TestCase
{
    use BuildsMarksFixtures;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->buildMarksFixtures(subjects: 2);

        DB::table('subject_allocations')->where('subject_id', $this->ids['subjects']['DS102'])->delete();
        $this->classMarks('DS101', 30, 45, MarkStatus::Locked);
        $this->markEntry('DS102', 'S1', 10, 20, MarkStatus::Draft);

        foreach ([['S1', 'DS101', 'present'], ['S1', 'DS101', 'absent'], ['S2', 'DS101', 'present'], ['S1', 'DS102', 'absent']] as $n => [$student, $subject, $status]) {
            $this->insert('attendance', [
                'student_id' => $this->ids['students'][$student], 'subject_id' => $this->ids['subjects'][$subject],
                'faculty_id' => $this->ids['faculty@dsc.test'], 'attendance_date' => '2025-08-0'.($n + 1), 'status' => $status, 'is_approved' => true,
            ]);
        }

        app(Tenant::class)->runAs($this->institutionId, function (): void {
            $user = User::query()->create([
                'name' => 'Student S1', 'email' => 's1@dsc.test', 'password' => 'demo123', 'role' => UserRole::Student->value,
                'institution_id' => $this->institutionId, 'title' => 'Student', 'department_code' => 'DSC',
            ]);
            $user->syncRoles([UserRole::Student->value]);
            DB::table('students')->where('id', $this->ids['students']['S1'])->update(['user_id' => $user->id]);
        });
    }

    public function test_each_role_opens_its_template_and_every_template_widget_runs(): void
    {
        $expected = [
            's1@dsc.test' => DashboardTemplates::STUDENT,
            'faculty@dsc.test' => DashboardTemplates::TEACHER,
            'hod@dsc.test' => DashboardTemplates::HOD,
            'coordinator@ece.test' => DashboardTemplates::EXAMINATION,
            'admin@demo.com' => DashboardTemplates::MANAGEMENT,
        ];

        foreach ($expected as $email => $template) {
            $home = $this->asUser($email)->getJson('/api/v1/dashboards/home')
                ->assertOk()
                ->assertJsonPath('data.isTemplate', true)
                ->assertJsonPath('data.templateKey', $template)
                ->json('data');

            $this->assertAllWidgetsRun($email, $home['widgets']);
        }

        // Admins can open every template; each runs on SQLite without errors.
        $templates = $this->asUser('admin@demo.com')->getJson('/api/v1/dashboards')->assertOk()->json('templates');
        $this->assertCount(5, $templates);
        foreach ($templates as $template) {
            $this->assertAllWidgetsRun('admin@demo.com', $template['widgets']);
        }

        $this->assertSame(['student'], array_column($this->asUser('s1@dsc.test')->getJson('/api/v1/dashboards')->json('templates'), 'key'));

        // Templates leave out widgets the viewer has no access to: placement officers cannot
        // read attendance or marks, so those Management widgets are not offered to them.
        $placement = $this->asUser('placement@demo.com')->getJson('/api/v1/dashboards/home')
            ->assertOk()
            ->assertJsonPath('data.templateKey', DashboardTemplates::MANAGEMENT)
            ->json('data.widgets');
        $this->assertNotEmpty($placement);
        $this->assertSame([], array_values(array_intersect(array_column(array_column($placement, 'spec'), 'source'), ['attendance', 'marks'])));
        $this->assertAllWidgetsRun('placement@demo.com', $placement);
    }

    public function test_marks_are_limited_to_the_viewers_scope(): void
    {
        $spec = ['source' => 'marks', 'measures' => [['field' => 'records', 'agg' => 'count']], 'dimensions' => [['field' => 'subject_code']]];

        $this->assertSame(['DS101' => 3, 'DS102' => 1], $this->counts('coordinator@ece.test', $spec));
        $this->assertSame(['DS101' => 3, 'DS102' => 1], $this->counts('hod@dsc.test', $spec));
        // Only the allocated subject.
        $this->assertSame(['DS101' => 3], $this->counts('faculty@dsc.test', $spec));
        // Another department's HOD sees none of DSC's marks.
        $this->assertSame([], array_intersect_key($this->counts('hod@cse.test', $spec), ['DS101' => 1, 'DS102' => 1]));
        // A student sees only their own published marks: the DS102 draft is hidden.
        $this->assertSame(['DS101' => 1], $this->counts('s1@dsc.test', $spec));

        $this->asUser('s1@dsc.test')->postJson('/api/v1/dashboards/query', ['spec' => $spec])
            ->assertOk()
            ->assertJsonPath('data.scope.level', 'self');
    }

    public function test_attendance_and_students_are_limited_to_the_viewers_scope(): void
    {
        $attendance = ['source' => 'attendance', 'measures' => [['field' => 'records', 'agg' => 'count'], ['field' => 'present_pct', 'agg' => 'avg']], 'dimensions' => [['field' => 'registration_number']]];

        $own = $this->rows('s1@dsc.test', $attendance);
        $this->assertCount(1, $own);
        $this->assertSame(3.0, (float) $own[0]['m0']);
        $this->assertSame(33.33, $own[0]['m1']);

        // The teacher only sees DS101 sessions: S1 twice and S2 once.
        $this->assertSame([2.0, 1.0], array_map('floatval', array_column($this->rows('faculty@dsc.test', $attendance), 'm0')));

        $students = ['source' => 'students', 'measures' => [['field' => 'records', 'agg' => 'count']], 'dimensions' => [['field' => 'department']]];
        $this->assertSame(['DSC' => 3], $this->counts('faculty@dsc.test', $students));
        $this->assertSame(['DSC' => 1], $this->counts('s1@dsc.test', $students));
        $this->assertArrayNotHasKey('DSC', $this->counts('hod@cse.test', $students));
        $this->assertArrayHasKey('DSC', $this->counts('admin@demo.com', $students));
        $this->assertArrayHasKey('CSE', $this->counts('admin@demo.com', $students));

        // Number filters on computed fields compare as numbers (DSC students have 0% attendance).
        $this->assertSame(['DSC' => 3], $this->counts('faculty@dsc.test', [...$students, 'filters' => [['field' => 'attendance_pct', 'op' => '<', 'value' => 75]]]));
        $this->assertSame([], $this->counts('faculty@dsc.test', [...$students, 'filters' => [['field' => 'attendance_pct', 'op' => '>=', 'value' => 50]]]));
    }

    public function test_specs_are_validated_against_the_catalogue(): void
    {
        $valid = ['source' => 'students', 'measures' => [['field' => 'records', 'agg' => 'count']]];
        $invalid = [
            'spec.source' => [...$valid, 'source' => 'users'],
            'spec.measures.0.field' => [...$valid, 'measures' => [['field' => 'students.id; DROP TABLE users', 'agg' => 'count']]],
            'spec.measures.0.agg' => [...$valid, 'measures' => [['field' => 'cgpa', 'agg' => 'count']]],
            'spec.dimensions.0.field' => [...$valid, 'dimensions' => [['field' => 'records']]],
            'spec.dimensions.0.grain' => [...$valid, 'dimensions' => [['field' => 'department', 'grain' => 'month']]],
            'spec.filters.0.op' => [...$valid, 'filters' => [['field' => 'cgpa', 'op' => 'contains', 'value' => '8']]],
            'spec.filters.0.value' => [...$valid, 'filters' => [['field' => 'cgpa', 'op' => '>', 'value' => 'high']]],
            'spec.limit' => [...$valid, 'limit' => 5000],
            'spec.sort.by' => [...$valid, 'sort' => ['by' => 'd0']],
        ];

        foreach ($invalid as $error => $spec) {
            $this->asUser('admin@demo.com')->postJson('/api/v1/dashboards/query', ['spec' => $spec])
                ->assertUnprocessable()
                ->assertJsonValidationErrors($error);
        }

        // Filters and HAVING work together: students with a CGPA filter, grouped by department.
        $this->asUser('admin@demo.com')->postJson('/api/v1/dashboards/query', ['spec' => [
            'source' => 'marks',
            'measures' => [['field' => 'total_marks', 'agg' => 'avg']],
            'dimensions' => [['field' => 'student']],
            'filters' => [['field' => 'subject_code', 'op' => 'in', 'value' => ['DS101', 'DS102']]],
            'having' => [['measure' => 0, 'op' => '<', 'value' => 60]],
        ]])
            ->assertOk()
            ->assertJsonCount(1, 'data.rows')
            ->assertJsonPath('data.rows.0.d0', 'Student S1');
    }

    public function test_custom_fields_can_group_and_filter_widgets(): void
    {
        $hostel = $this->insert('custom_field_definitions', [
            'entity' => 'student', 'key' => 'hostel', 'label' => 'Hostel', 'type' => 'select',
            'options' => json_encode(['Yes', 'No']), 'is_required' => false, 'is_active' => true, 'sort_order' => 0,
        ]);
        foreach (['S1' => 'Yes', 'S2' => 'No'] as $student => $value) {
            $this->insert('custom_field_values', ['definition_id' => $hostel, 'entity' => 'student', 'entity_id' => $this->ids['students'][$student], 'value_text' => $value]);
        }

        $fields = collect($this->asUser('admin@demo.com')->getJson('/api/v1/dashboards/sources')->assertOk()->json('data'))
            ->firstWhere('key', 'attendance')['fields'];
        $this->assertContains('cf.student.hostel', array_column($fields, 'key'));

        $this->assertSame(['' => 1, 'No' => 1, 'Yes' => 1], $this->counts('admin@demo.com', [
            'source' => 'students', 'measures' => [['field' => 'records', 'agg' => 'count']],
            'dimensions' => [['field' => 'cf.student.hostel']],
            'filters' => [['field' => 'department', 'op' => '=', 'value' => 'DSC']],
        ]));

        // Attendance of hostel students only: S1's three sessions.
        $this->assertSame(['Yes' => 3], $this->counts('admin@demo.com', [
            'source' => 'attendance', 'measures' => [['field' => 'records', 'agg' => 'count']],
            'dimensions' => [['field' => 'cf.student.hostel']],
            'filters' => [['field' => 'cf.student.hostel', 'op' => '=', 'value' => 'Yes']],
        ]));
    }

    public function test_dashboards_are_built_copied_and_shared(): void
    {
        $own = $this->asUser('faculty@dsc.test')
            ->postJson('/api/v1/dashboards', ['name' => 'My view', 'fromTemplate' => 'teacher', 'isHome' => true])
            ->assertCreated()
            ->assertJsonPath('data.templateKey', 'teacher')
            ->assertJsonPath('data.isOwner', true)
            ->json('data');
        $this->assertCount(9, $own['widgets']);

        $this->asUser('faculty@dsc.test')->getJson('/api/v1/dashboards/home')->assertJsonPath('data.id', $own['id']);
        // Templates above the user's level are not offered.
        $this->asUser('faculty@dsc.test')->postJson('/api/v1/dashboards', ['name' => 'X', 'fromTemplate' => 'management'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('fromTemplate');
        // Private to the owner.
        $this->asUser('hod@dsc.test')->getJson("/api/v1/dashboards/{$own['id']}")->assertNotFound();
        // Sharing needs dashboards.share.
        $this->asUser('faculty@dsc.test')->putJson("/api/v1/dashboards/{$own['id']}/share", ['roles' => ['staff'], 'designationIds' => []])
            ->assertForbidden();

        // Widget specs are checked when saving.
        $widget = $own['widgets'][0];
        $this->asUser('faculty@dsc.test')->patchJson("/api/v1/dashboards/{$own['id']}", ['widgets' => [
            [...$widget, 'spec' => [...$widget['spec'], 'measures' => [['field' => 'nope', 'agg' => 'count']]]],
        ]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('widgets.0.spec.measures.0.field');
        $this->asUser('faculty@dsc.test')->patchJson("/api/v1/dashboards/{$own['id']}", ['name' => 'Renamed', 'widgets' => [$widget]])
            ->assertOk()
            ->assertJsonPath('data.name', 'Renamed')
            ->assertJsonCount(1, 'data.widgets');

        // An admin shares a dashboard with all staff as their default.
        $shared = $this->asUser('admin@demo.com')
            ->postJson('/api/v1/dashboards', ['name' => 'Staff board', 'fromTemplate' => 'hod'])
            ->assertCreated()
            ->json('data.id');
        $this->asUser('admin@demo.com')->putJson("/api/v1/dashboards/{$shared}/share", ['roles' => ['staff'], 'designationIds' => [], 'audienceDefault' => true])
            ->assertOk()
            ->assertJsonPath('data.sharing.roles', ['staff'])
            ->assertJsonPath('data.sharing.audienceDefault', true);

        // The HOD (no home of their own) now opens it; the faculty keeps their own home.
        $this->asUser('hod@dsc.test')->getJson('/api/v1/dashboards/home')->assertJsonPath('data.id', $shared);
        $this->asUser('faculty@dsc.test')->getJson('/api/v1/dashboards/home')->assertJsonPath('data.id', $own['id']);
        $this->assertContains($shared, array_column($this->asUser('faculty@dsc.test')->getJson('/api/v1/dashboards')->json('data'), 'id'));
        $this->asUser('s1@dsc.test')->getJson("/api/v1/dashboards/{$shared}")->assertNotFound();

        // Shared viewers can read and copy, not edit or delete.
        $this->asUser('faculty@dsc.test')->getJson("/api/v1/dashboards/{$shared}")->assertOk()->assertJsonPath('data.isOwner', false);
        $this->asUser('faculty@dsc.test')->patchJson("/api/v1/dashboards/{$shared}", ['name' => 'Mine now'])->assertForbidden();
        $this->asUser('faculty@dsc.test')->deleteJson("/api/v1/dashboards/{$shared}")->assertForbidden();
        $this->asUser('faculty@dsc.test')->postJson('/api/v1/dashboards', ['name' => 'Copy', 'fromDashboard' => $shared])
            ->assertCreated()
            ->assertJsonPath('data.templateKey', 'hod');

        // Same widgets, viewer's scope: the faculty sees only DS101 in the shared HOD board.
        $passBySubject = collect($this->asUser('faculty@dsc.test')->getJson("/api/v1/dashboards/{$shared}")->json('data.widgets'))
            ->firstWhere('id', 'pass-by-subject');
        $this->assertSame(['Subject DS101'], array_column($this->rows('faculty@dsc.test', $passBySubject['spec']), 'd0'));
    }

    public function test_batch_queries_report_errors_per_widget(): void
    {
        $this->asUser('s1@dsc.test')->postJson('/api/v1/dashboards/query', ['specs' => [
            'ok' => ['source' => 'marks', 'measures' => [['field' => 'records', 'agg' => 'count']]],
            'bad' => ['source' => 'marks', 'measures' => [['field' => 'nope', 'agg' => 'count']]],
        ]])
            ->assertOk()
            ->assertJsonPath('data.ok.ok', true)
            ->assertJsonPath('data.ok.rows.0.m0', 1)
            ->assertJsonPath('data.bad.ok', false)
            ->assertJsonPath('data.bad.status', 422);
    }

    /** @param list<array<string, mixed>> $widgets */
    private function assertAllWidgetsRun(string $email, array $widgets): void
    {
        $specs = collect($widgets)->mapWithKeys(fn (array $widget) => [$widget['id'] => $widget['spec']])->all();
        $results = $this->asUser($email)->postJson('/api/v1/dashboards/query', ['specs' => $specs])->assertOk()->json('data');

        foreach ($results as $id => $result) {
            $this->assertTrue($result['ok'], "{$email}: widget {$id} failed: ".($result['message'] ?? ''));
        }
    }

    /** @return list<array<string, mixed>> */
    private function rows(string $email, array $spec): array
    {
        return $this->asUser($email)->postJson('/api/v1/dashboards/query', ['spec' => $spec])->assertOk()->json('data.rows');
    }

    /** First dimension → first measure, for single-dimension count specs. */
    private function counts(string $email, array $spec): array
    {
        $counts = [];
        foreach ($this->rows($email, $spec) as $row) {
            $counts[(string) $row['d0']] = (int) $row['m0'];
        }
        ksort($counts);

        return $counts;
    }
}
