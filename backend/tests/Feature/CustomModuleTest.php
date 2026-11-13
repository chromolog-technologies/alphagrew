<?php

namespace Tests\Feature;

use App\Models\CustomFieldDefinition;
use App\Models\CustomModule;
use App\Models\CustomModuleRecord;
use App\Models\Institution;
use App\Support\Tenancy\InstitutionScope;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Concerns\BuildsMarksFixtures;
use Tests\TestCase;

/**
 * Modules admins create: definitions, custom fields on their records, record CRUD,
 * role-based access and tenant isolation.
 */
class CustomModuleTest extends TestCase
{
    use BuildsMarksFixtures;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->buildMarksFixtures();
    }

    public function test_admin_creates_module_with_generated_key_and_defaults(): void
    {
        $this->asUser('admin@demo.com')
            ->postJson('/api/v1/custom-modules', ['pluralLabel' => 'Hostel Rooms', 'category' => 'Operations'])
            ->assertCreated()
            ->assertJsonPath('data.key', 'hostel_rooms')
            ->assertJsonPath('data.singularLabel', 'Hostel Rooms')
            ->assertJsonPath('data.isActive', true)
            ->assertJsonPath('data.recordsCount', 0)
            ->assertJsonPath('data.entity', 'module_'.CustomModule::query()->value('id'));

        $this->asUser('admin@demo.com')
            ->postJson('/api/v1/custom-modules', ['pluralLabel' => 'Hostel Rooms', 'category' => 'Operations'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('key');

        $this->asUser('admin@demo.com')
            ->postJson('/api/v1/custom-modules', ['pluralLabel' => 'X', 'category' => 'Nope', 'editRoles' => ['student']])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['category', 'editRoles.0']);
    }

    public function test_only_managers_change_modules(): void
    {
        $module = $this->module(['staff']);

        $this->asUser('staff@demo.com')
            ->postJson('/api/v1/custom-modules', ['pluralLabel' => 'Events', 'category' => 'Operations'])
            ->assertForbidden();
        $this->asUser('staff@demo.com')->patchJson("/api/v1/custom-modules/{$module}", ['isActive' => false])->assertForbidden();
        $this->asUser('staff@demo.com')->deleteJson("/api/v1/custom-modules/{$module}")->assertForbidden();

        $this->asUser('admin@demo.com')
            ->patchJson("/api/v1/custom-modules/{$module}", ['pluralLabel' => 'Rooms', 'key' => 'ignored'])
            ->assertOk()
            ->assertJsonPath('data.pluralLabel', 'Rooms')
            ->assertJsonPath('data.key', 'hostel_rooms');
    }

    public function test_fields_and_records_round_trip_with_validation(): void
    {
        $module = $this->module();
        $entity = "module_{$module}";

        $this->asUser('admin@demo.com')
            ->postJson('/api/v1/custom-fields', ['entity' => $entity, 'label' => 'Capacity', 'type' => 'number', 'isRequired' => true])
            ->assertCreated();
        $this->asUser('admin@demo.com')
            ->postJson('/api/v1/custom-fields', ['entity' => $entity, 'label' => 'Block', 'type' => 'select', 'options' => ['A', 'B']])
            ->assertCreated();

        // Unknown module entities are rejected.
        $this->asUser('admin@demo.com')
            ->postJson('/api/v1/custom-fields', ['entity' => 'module_999999', 'label' => 'X', 'type' => 'text'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('entity');

        $this->asUser('admin@demo.com')
            ->postJson("/api/v1/custom-modules/{$module}/records", ['title' => 'Room 101', 'customFields' => ['block' => 'C']])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['customFields.capacity', 'customFields.block']);

        $id = $this->asUser('admin@demo.com')
            ->postJson("/api/v1/custom-modules/{$module}/records", ['title' => 'Room 101', 'customFields' => ['capacity' => 3, 'block' => 'A']])
            ->assertCreated()
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.customFields.capacity', 3)
            ->json('data.id');

        $this->asUser('admin@demo.com')
            ->patchJson("/api/v1/custom-modules/{$module}/records/{$id}", ['status' => 'archived', 'customFields' => ['block' => null]])
            ->assertOk()
            ->assertJsonPath('data.title', 'Room 101')
            ->assertJsonPath('data.status', 'archived')
            ->assertJsonPath('data.customFields.capacity', 3)
            ->assertJsonPath('data.customFields.block', null);

        $this->asUser('admin@demo.com')
            ->getJson("/api/v1/custom-modules/{$module}/records?search=101")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.customFields.capacity', 3)
            ->assertJsonPath('meta.total', 1);

        $this->asUser('admin@demo.com')->getJson('/api/v1/custom-modules')->assertJsonPath('data.0.recordsCount', 1);
    }

    public function test_records_are_scoped_to_their_module(): void
    {
        $first = $this->module();
        $second = $this->module(key: 'library_books');
        $record = $this->insert('custom_module_records', ['custom_module_id' => $first, 'title' => 'Room 1', 'status' => 'active']);

        $this->asUser('admin@demo.com')->getJson("/api/v1/custom-modules/{$second}/records/{$record}")->assertNotFound();
        $this->asUser('admin@demo.com')->getJson("/api/v1/custom-modules/{$first}/records/{$record}")->assertOk();
    }

    public function test_view_and_edit_roles_control_record_access(): void
    {
        $module = $this->module(viewRoles: ['student'], editRoles: ['staff']);
        $hidden = $this->module(key: 'admin_only');

        // Staff can edit, students only read, other modules are invisible to both.
        $id = $this->asUser('staff@demo.com')
            ->postJson("/api/v1/custom-modules/{$module}/records", ['title' => 'Room 7'])
            ->assertCreated()
            ->json('data.id');
        $this->asUser('student@demo.com')->getJson("/api/v1/custom-modules/{$module}/records")->assertOk()->assertJsonCount(1, 'data');
        $this->asUser('student@demo.com')->postJson("/api/v1/custom-modules/{$module}/records", ['title' => 'X'])->assertForbidden();
        $this->asUser('student@demo.com')->deleteJson("/api/v1/custom-modules/{$module}/records/{$id}")->assertForbidden();
        $this->asUser('student@demo.com')->getJson("/api/v1/custom-modules/{$hidden}/records")->assertForbidden();
        $this->asUser('student@demo.com')->getJson("/api/v1/custom-fields?entity=module_{$hidden}")->assertForbidden();

        $keys = array_column($this->asUser('student@demo.com')->getJson('/api/v1/custom-modules')->json('data'), 'key');
        $this->assertSame(['hostel_rooms'], $keys);

        // Switching the module off removes access for everyone but managers.
        $this->asUser('admin@demo.com')->patchJson("/api/v1/custom-modules/{$module}", ['isActive' => false])->assertOk();
        $this->asUser('staff@demo.com')->getJson("/api/v1/custom-modules/{$module}/records")->assertForbidden();
        $this->asUser('admin@demo.com')->getJson("/api/v1/custom-modules/{$module}/records")->assertOk();
    }

    public function test_admin_reorders_modules(): void
    {
        $rooms = $this->module(key: 'rooms');
        $books = $this->module(key: 'books');
        $events = $this->module(key: 'events');

        $this->asUser('staff@demo.com')->putJson('/api/v1/custom-modules/order', ['ids' => [$events]])->assertForbidden();

        // Listed modules go first, in the given order; the rest keep their relative order after them.
        $keys = array_column($this->asUser('admin@demo.com')
            ->putJson('/api/v1/custom-modules/order', ['ids' => [$events, $rooms]])
            ->assertOk()
            ->json('data'), 'key');
        $this->assertSame(['events', 'rooms', 'books'], $keys);
        $this->assertSame([0, 1, 2], CustomModule::query()->whereKey([$events, $rooms, $books])->orderBy('sort_order')->pluck('sort_order')->all());

        $this->asUser('admin@demo.com')
            ->putJson('/api/v1/custom-modules/order', ['ids' => [$books, 999999]])
            ->assertJsonValidationErrors('ids.1');
    }

    public function test_deleting_a_module_removes_its_fields_and_records(): void
    {
        $module = $this->module();
        $this->insert('custom_field_definitions', [
            'entity' => "module_{$module}", 'key' => 'capacity', 'label' => 'Capacity', 'type' => 'number',
            'is_required' => false, 'is_active' => true, 'sort_order' => 0,
        ]);
        $this->insert('custom_module_records', ['custom_module_id' => $module, 'title' => 'Room 1', 'status' => 'active']);

        $this->asUser('admin@demo.com')->deleteJson("/api/v1/custom-modules/{$module}")->assertOk();

        $this->asUser('admin@demo.com')->getJson('/api/v1/custom-modules')->assertJsonCount(0, 'data');
        $this->asUser('admin@demo.com')->getJson("/api/v1/custom-modules/{$module}/records")->assertNotFound();
        $this->assertSame(0, CustomFieldDefinition::query()->where('entity', "module_{$module}")->count());
        $this->assertSame(0, CustomModuleRecord::query()->count());
        $this->assertSame(1, CustomModuleRecord::withTrashed()->count());
    }

    public function test_modules_are_isolated_per_institution(): void
    {
        $other = Institution::query()->create(['name' => 'Other College', 'code' => 'OTHER', 'slug' => 'other', 'status' => 'active'])->id;
        $foreign = DB::table('custom_modules')->insertGetId([
            'institution_id' => $other, 'key' => 'foreign', 'plural_label' => 'Foreign', 'singular_label' => 'Foreign',
            'category' => 'Operations', 'is_active' => true, 'sort_order' => 0, 'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->asUser('admin@demo.com')->getJson('/api/v1/custom-modules')->assertJsonCount(0, 'data');
        $this->asUser('admin@demo.com')->getJson("/api/v1/custom-modules/{$foreign}/records")->assertNotFound();
        $this->asUser('admin@demo.com')
            ->postJson('/api/v1/custom-fields', ['entity' => "module_{$foreign}", 'label' => 'X', 'type' => 'text'])
            ->assertJsonValidationErrors('entity');
        // The same key is free in this institution.
        $this->asUser('admin@demo.com')
            ->postJson('/api/v1/custom-modules', ['pluralLabel' => 'Foreign', 'category' => 'Operations'])
            ->assertCreated();
        $this->assertSame(2, CustomModule::withoutGlobalScope(InstitutionScope::class)->count());
    }

    /**
     * @param  list<string>  $viewRoles
     * @param  list<string>  $editRoles
     */
    private function module(array $viewRoles = [], array $editRoles = [], string $key = 'hostel_rooms'): int
    {
        return $this->insert('custom_modules', [
            'key' => $key, 'plural_label' => 'Hostel Rooms', 'singular_label' => 'Hostel Room', 'category' => 'Operations',
            'view_roles' => json_encode($viewRoles), 'edit_roles' => json_encode($editRoles), 'is_active' => true, 'sort_order' => 0,
        ]);
    }
}
