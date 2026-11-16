<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Course;
use App\Models\CustomFieldValue;
use App\Models\CustomModuleRecord;
use App\Models\Department;
use App\Models\Designation;
use App\Models\User;
use App\Support\Campus\CampusPermission;
use App\Support\Tenancy\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\BuildsMarksFixtures;
use Tests\TestCase;

/**
 * Custom field values are removed with their record (customization phase 0.1), and reading or
 * changing them needs the same permission as the record's own endpoints (phase 0.2).
 */
class CustomFieldIntegrityTest extends TestCase
{
    use BuildsMarksFixtures;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->buildMarksFixtures();
    }

    public function test_soft_deleted_records_keep_values_and_force_deleted_records_lose_them(): void
    {
        $this->field('course', 'note');
        $course = Course::query()->where('code', 'BTDS')->firstOrFail();
        $this->asUser('admin@demo.com')->putJson("/api/v1/custom-fields/values/course/{$course->id}", ['customFields' => ['note' => 'x']])->assertOk();

        $this->tenant(fn () => $course->delete());
        $this->assertSame(1, $this->values('course', $course->id), 'A soft-deleted course can be restored with its values.');

        $this->tenant(fn () => $course->forceDelete());
        $this->assertSame(0, $this->values('course', $course->id));
    }

    public function test_hard_deleted_designations_and_module_records_lose_their_values(): void
    {
        $this->field('designation', 'band');
        $designation = $this->tenant(fn () => Designation::query()->create(['name' => 'Temp', 'slug' => 'temp', 'status' => 'active']));
        $this->asUser('admin@demo.com')->putJson("/api/v1/custom-fields/values/designation/{$designation->id}", ['customFields' => ['band' => 'B1']])->assertOk();

        $this->asUser('admin@demo.com')->deleteJson("/api/v1/designations/{$designation->id}")->assertOk();
        $this->assertSame(0, $this->values('designation', $designation->id));

        $module = $this->asUser('admin@demo.com')->postJson('/api/v1/custom-modules', ['pluralLabel' => 'Rooms', 'category' => 'Operations'])->json('data');
        $this->asUser('admin@demo.com')->postJson('/api/v1/custom-fields', ['entity' => $module['entity'], 'label' => 'Block', 'type' => 'text'])->assertCreated();
        $recordId = $this->asUser('admin@demo.com')
            ->postJson("/api/v1/custom-modules/{$module['id']}/records", ['title' => 'R1', 'customFields' => ['block' => 'A']])
            ->json('data.id');

        $this->tenant(fn () => CustomModuleRecord::query()->findOrFail($recordId)->forceDelete());
        $this->assertSame(0, $this->values($module['entity'], $recordId));
    }

    public function test_value_permissions_match_the_records_own_endpoints(): void
    {
        $this->field('designation', 'band');
        $this->field('department', 'budget');
        $designation = $this->tenant(fn () => Designation::query()->value('id'));
        $department = $this->tenant(fn () => Department::query()->where('code', 'DSC')->value('id'));

        // Staff access comes from the designation (re-synced at sign-in). This one grants
        // department access, which is all a designation can grant here.
        $this->member('dept@test.dev', [CampusPermission::DEPARTMENTS_VIEW, CampusPermission::DEPARTMENTS_CREATE]);

        // Reading department values follows departments.view, like GET /departments/{id}.
        $this->asUser('dept@test.dev')->getJson("/api/v1/custom-fields/values/department/{$department}")->assertOk();
        // Changing them needs departments.edit, like PUT /departments/{id}; departments.create is not enough.
        $this->asUser('dept@test.dev')->putJson("/api/v1/custom-fields/values/department/{$department}", ['customFields' => ['budget' => 'X']])->assertForbidden();
        // Designation values follow designations.*, not departments.*.
        $this->asUser('dept@test.dev')->getJson("/api/v1/custom-fields/values/designation/{$designation}")->assertForbidden();
        $this->asUser('dept@test.dev')->putJson("/api/v1/custom-fields/values/designation/{$designation}", ['customFields' => ['band' => 'X']])->assertForbidden();

        // Admins hold every permission.
        $this->asUser('admin@demo.com')->putJson("/api/v1/custom-fields/values/designation/{$designation}", ['customFields' => ['band' => 'B2']])->assertOk();
        $this->asUser('admin@demo.com')->putJson("/api/v1/custom-fields/values/department/{$department}", ['customFields' => ['budget' => 'Y']])->assertOk();
    }

    private function field(string $entity, string $key): void
    {
        $this->insert('custom_field_definitions', [
            'entity' => $entity, 'key' => $key, 'label' => ucfirst($key), 'type' => 'text',
            'is_required' => false, 'is_active' => true, 'sort_order' => 0,
        ]);
    }

    private function values(string $entity, int $id): int
    {
        return CustomFieldValue::query()->withoutGlobalScopes()->where('entity', $entity)->where('entity_id', $id)->count();
    }

    /**
     * A staff account whose designation grants the given permissions.
     *
     * @param  list<string>  $permissions
     */
    private function member(string $email, array $permissions): void
    {
        $designationId = $this->tenant(fn () => Designation::query()->create([
            'name' => "Designation for {$email}", 'slug' => 'd-'.md5($email), 'status' => 'active', 'permissions' => $permissions,
        ])->id);

        $user = new User(['name' => $email, 'email' => $email, 'password' => 'demo123', 'role' => UserRole::Staff->value]);
        $user->forceFill([
            'institution_id' => $this->institutionId, 'department_code' => 'DSC',
            'designation_id' => $designationId, 'email_verified_at' => now(),
        ])->save();
    }

    private function tenant(callable $callback): mixed
    {
        return app(Tenant::class)->runAs($this->institutionId, $callback);
    }
}
