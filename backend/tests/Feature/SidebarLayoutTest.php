<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Institution;
use App\Models\InstitutionSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\BuildsMarksFixtures;
use Tests\TestCase;

/**
 * The institution's sidebar arrangement: admins save item order and hidden items per group,
 * every member reads it, and it stays out of the owner console's setting overrides.
 */
class SidebarLayoutTest extends TestCase
{
    use BuildsMarksFixtures;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->buildMarksFixtures();
    }

    public function test_admin_saves_layout_and_members_read_it(): void
    {
        $this->asUser('student@demo.com')->getJson('/api/v1/institution/sidebar-layout')
            ->assertOk()
            ->assertExactJson(['data' => ['groups' => []]]);

        $layout = ['groups' => [
            'master_data' => ['order' => ['courses', 'departments', 'module_5'], 'hidden' => ['batches']],
            'other' => ['hidden' => ['reports']],
        ]];

        $this->asUser('admin@demo.com')->putJson('/api/v1/institution/sidebar-layout', $layout)
            ->assertOk()
            ->assertJsonPath('data.groups.master_data.order', ['courses', 'departments', 'module_5'])
            ->assertJsonPath('data.groups.other.order', []);

        $this->asUser('staff@demo.com')->getJson('/api/v1/institution/sidebar-layout')
            ->assertOk()
            ->assertJsonPath('data.groups.master_data.hidden', ['batches'])
            ->assertJsonPath('data.groups.other.hidden', ['reports']);

        // Saving again replaces the layout.
        $this->asUser('admin@demo.com')->putJson('/api/v1/institution/sidebar-layout', ['groups' => []])->assertOk();
        $this->asUser('staff@demo.com')->getJson('/api/v1/institution/sidebar-layout')->assertExactJson(['data' => ['groups' => []]]);
    }

    public function test_only_settings_managers_change_it_and_input_is_validated(): void
    {
        $this->asUser('staff@demo.com')
            ->putJson('/api/v1/institution/sidebar-layout', ['groups' => ['other' => ['hidden' => ['reports']]]])
            ->assertForbidden();

        $this->asUser('admin@demo.com')
            ->putJson('/api/v1/institution/sidebar-layout', ['groups' => ['other' => ['order' => ['Bad Id', 'reports', 'reports']]]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['groups.other.order.0', 'groups.other.order.1']);

        $this->asUser('admin@demo.com')
            ->putJson('/api/v1/institution/sidebar-layout', ['groups' => ['other' => ['extra' => ['x']]]])
            ->assertJsonValidationErrors('groups.other');
    }

    public function test_layout_is_not_reported_as_an_owner_setting_override(): void
    {
        $institution = Institution::query()->findOrFail($this->institutionId);
        InstitutionSetting::query()->create(['institution_id' => $institution->id, 'key' => 'sidebarLayout', 'value' => ['groups' => []]]);
        InstitutionSetting::query()->create(['institution_id' => $institution->id, 'key' => 'currency', 'value' => 'INR']);

        // Platform owner, signed in with a token as OwnerOperationsTest does.
        $owner = new User(['name' => 'Owner', 'email' => 'layout-owner@test.dev', 'password' => 'secret123', 'role' => UserRole::SuperAdmin->value]);
        $owner->forceFill(['institution_id' => null, 'email_verified_at' => now()])->save();
        $this->app['auth']->forgetGuards();

        $this->withToken($owner->createToken('test')->plainTextToken)
            ->getJson("/api/v1/owner/institutions/{$institution->id}/settings")
            ->assertOk()
            ->assertJsonPath('data.overrides', ['currency' => 'INR']);
    }
}
