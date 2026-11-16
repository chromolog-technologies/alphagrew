<?php

namespace Tests\Feature;

use App\Models\Course;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\BuildsMarksFixtures;
use Tests\TestCase;

/**
 * Dashboard sources for companies, courses, departments and institution-created modules,
 * including their custom fields and access rules.
 */
class DashboardSourcesTest extends TestCase
{
    use BuildsMarksFixtures;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->buildMarksFixtures();
    }

    public function test_admin_sees_the_new_sources_with_their_custom_fields(): void
    {
        $this->asUser('admin@demo.com')
            ->postJson('/api/v1/custom-fields', ['entity' => 'course', 'label' => 'Accredited', 'type' => 'boolean'])
            ->assertCreated();

        $sources = collect($this->asUser('admin@demo.com')->getJson('/api/v1/dashboards/sources')->assertOk()->json('data'))->keyBy('key');
        foreach (['companies', 'courses', 'departments'] as $key) {
            $this->assertTrue($sources->has($key), "Missing source {$key}");
        }
        $this->assertContains('cf.course.accredited', array_column($sources['courses']['fields'], 'key'));

        // Group courses by the custom field.
        $course = Course::query()->where('code', 'BTDS')->value('id');
        $this->asUser('admin@demo.com')->putJson("/api/v1/custom-fields/values/course/{$course}", ['customFields' => ['accredited' => true]])->assertOk();

        $rows = $this->rows('admin@demo.com', [
            'source' => 'courses',
            'measures' => [['field' => 'records', 'agg' => 'count']],
            'dimensions' => [['field' => 'cf.course.accredited']],
            'filters' => [['field' => 'code', 'op' => '=', 'value' => 'BTDS']],
        ]);
        $this->assertCount(1, $rows);
        $this->assertSame(1, (int) $rows[0]['m0']);

        // Companies and departments can be queried too.
        $this->asUser('admin@demo.com')->postJson('/api/v1/custom-fields', ['entity' => 'company', 'label' => 'Tier', 'type' => 'text'])->assertCreated();
        $this->rows('admin@demo.com', ['source' => 'companies', 'measures' => [['field' => 'records', 'agg' => 'count']], 'dimensions' => [['field' => 'cf.company.tier']]]);
        $departments = $this->rows('admin@demo.com', ['source' => 'departments', 'measures' => [['field' => 'records', 'agg' => 'count']]]);
        $this->assertGreaterThanOrEqual(1, (int) $departments[0]['m0']);
    }

    public function test_custom_module_records_are_a_source_for_those_who_can_view_the_module(): void
    {
        $module = $this->asUser('admin@demo.com')
            ->postJson('/api/v1/custom-modules', ['pluralLabel' => 'Hostel Rooms', 'category' => 'Operations', 'editRoles' => ['staff']])
            ->assertCreated()
            ->json('data');
        $entity = $module['entity'];

        $this->asUser('admin@demo.com')
            ->postJson('/api/v1/custom-fields', ['entity' => $entity, 'label' => 'Block', 'type' => 'select', 'options' => ['A', 'B']])
            ->assertCreated();
        foreach ([['Room 1', 'A'], ['Room 2', 'A'], ['Room 3', 'B']] as [$title, $block]) {
            $this->asUser('admin@demo.com')
                ->postJson("/api/v1/custom-modules/{$module['id']}/records", ['title' => $title, 'customFields' => ['block' => $block]])
                ->assertCreated();
        }

        $spec = [
            'source' => $entity,
            'measures' => [['field' => 'records', 'agg' => 'count']],
            'dimensions' => [['field' => "cf.{$entity}.block"]],
        ];
        $counts = collect($this->rows('admin@demo.com', $spec))->mapWithKeys(fn ($row) => [$row['d0'] => (int) $row['m0']])->all();
        $this->assertSame(['A' => 2, 'B' => 1], $counts);

        // Staff can edit the module, so they see the source; students are not shared on it.
        $this->assertContains($entity, array_column($this->asUser('staff@demo.com')->getJson('/api/v1/dashboards/sources')->json('data'), 'key'));
        $this->assertNotContains($entity, array_column($this->asUser('student@demo.com')->getJson('/api/v1/dashboards/sources')->json('data'), 'key'));
        $this->asUser('student@demo.com')->postJson('/api/v1/dashboards/query', ['spec' => $spec])->assertForbidden();

        // An unknown module is an unknown source.
        $this->asUser('admin@demo.com')
            ->postJson('/api/v1/dashboards/query', ['spec' => [...$spec, 'source' => 'module_999999']])
            ->assertUnprocessable();
    }

    private function rows(string $email, array $spec): array
    {
        return $this->asUser($email)->postJson('/api/v1/dashboards/query', ['spec' => $spec])->assertOk()->json('data.rows');
    }
}
