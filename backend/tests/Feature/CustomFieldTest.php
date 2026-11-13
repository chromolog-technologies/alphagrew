<?php

namespace Tests\Feature;

use App\Models\CustomFieldDefinition;
use App\Models\Institution;
use App\Support\Tenancy\InstitutionScope;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Concerns\BuildsMarksFixtures;
use Tests\TestCase;

/**
 * Admin-defined custom form fields: definitions, validation, values on records,
 * permissions and tenant isolation.
 */
class CustomFieldTest extends TestCase
{
    use BuildsMarksFixtures;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->buildMarksFixtures();
    }

    public function test_admin_defines_fields_and_keys_are_generated_and_unique(): void
    {
        $this->asUser('admin@demo.com')
            ->postJson('/api/v1/custom-fields', ['entity' => 'student', 'label' => 'Blood Group', 'type' => 'select', 'options' => ['A+', 'B+', 'O+']])
            ->assertCreated()
            ->assertJsonPath('data.key', 'blood_group')
            ->assertJsonPath('data.options', ['A+', 'B+', 'O+']);

        $this->asUser('admin@demo.com')
            ->postJson('/api/v1/custom-fields', ['entity' => 'student', 'label' => 'Blood group', 'type' => 'text'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('key');

        // The same key is fine on another record type.
        $this->asUser('admin@demo.com')
            ->postJson('/api/v1/custom-fields', ['entity' => 'exam', 'label' => 'Blood group', 'type' => 'text'])
            ->assertCreated();

        $this->asUser('admin@demo.com')
            ->postJson('/api/v1/custom-fields', ['entity' => 'student', 'label' => 'Hostel', 'type' => 'select'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('options');

        $this->asUser('admin@demo.com')->getJson('/api/v1/custom-fields?entity=student')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_only_managers_change_definitions_but_everyone_reads_them(): void
    {
        $this->field('student', 'hostel', 'boolean');

        $this->asUser('faculty@dsc.test')
            ->postJson('/api/v1/custom-fields', ['entity' => 'student', 'label' => 'X', 'type' => 'text'])
            ->assertForbidden();
        $this->asUser('student@demo.com')->getJson('/api/v1/custom-fields?entity=student')
            ->assertOk()
            ->assertJsonPath('data.0.key', 'hostel');
    }

    public function test_student_create_and_update_validate_and_store_values(): void
    {
        $this->field('student', 'blood_group', 'select', options: ['A+', 'O+'], required: true);
        $this->field('student', 'family_income', 'number');
        $this->field('student', 'languages', 'multiselect', options: ['English', 'Hindi', 'Tamil']);

        $payload = [
            'name' => 'Custom Student', 'email' => 'custom.student@example.com', 'departmentCode' => 'CSE',
            'year' => 'year_1', 'gender' => 'prefer_not_to_say', 'cgpa' => 7.5, 'attendance' => 90,
            'feeStatus' => 'pending', 'password' => 'secret123',
        ];

        $this->asUser('admin@demo.com')->postJson('/api/v1/students', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('customFields.blood_group');

        $this->asUser('admin@demo.com')
            ->postJson('/api/v1/students', [...$payload, 'customFields' => ['blood_group' => 'AB-']])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('customFields.blood_group');

        $this->asUser('admin@demo.com')
            ->postJson('/api/v1/students', [...$payload, 'customFields' => ['blood_group' => 'O+', 'unknown' => 1]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('customFields');

        $id = $this->asUser('admin@demo.com')
            ->postJson('/api/v1/students', [...$payload, 'customFields' => [
                'blood_group' => 'O+', 'family_income' => '450000', 'languages' => ['English', 'Tamil'],
            ]])
            ->assertCreated()
            ->assertJsonPath('customFields.blood_group', 'O+')
            ->assertJsonPath('customFields.family_income', 450000)
            ->assertJsonPath('customFields.languages', ['English', 'Tamil'])
            ->json('student.id');

        // Leaving customFields out keeps the values; clearing an optional field removes it.
        $this->asUser('admin@demo.com')
            ->putJson("/api/v1/students/{$id}", [...$payload, 'password' => null])
            ->assertOk()
            ->assertJsonPath('customFields.blood_group', 'O+');

        $this->asUser('admin@demo.com')
            ->putJson("/api/v1/students/{$id}", [...$payload, 'password' => null, 'customFields' => ['family_income' => null]])
            ->assertOk()
            ->assertJsonPath('customFields.family_income', null)
            ->assertJsonPath('customFields.languages', ['English', 'Tamil']);

        $this->asUser('admin@demo.com')
            ->putJson("/api/v1/students/{$id}", [...$payload, 'password' => null, 'customFields' => ['blood_group' => null]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('customFields.blood_group');
    }

    public function test_values_endpoint_for_exams_and_permissions(): void
    {
        $this->field('exam', 'invigilator', 'text');
        $this->field('exam', 'paper_set_on', 'date');
        $exam = $this->ids['exams']['DS101'];

        $this->asUser('admin@demo.com')
            ->putJson("/api/v1/custom-fields/values/exam/{$exam}", ['customFields' => ['invigilator' => 'Dr. Rao', 'paper_set_on' => '2025-11-01']])
            ->assertOk()
            ->assertJsonPath('data.invigilator', 'Dr. Rao')
            ->assertJsonPath('data.paper_set_on', '2025-11-01');

        // Faculty can read exam fields (marks.view) but not change them (exams.edit).
        $this->asUser('faculty@dsc.test')->getJson("/api/v1/custom-fields/values/exam/{$exam}")
            ->assertOk()
            ->assertJsonPath('data.invigilator', 'Dr. Rao');
        $this->asUser('faculty@dsc.test')
            ->putJson("/api/v1/custom-fields/values/exam/{$exam}", ['customFields' => ['invigilator' => 'Me']])
            ->assertForbidden();

        $this->asUser('admin@demo.com')->getJson('/api/v1/custom-fields/values/exam/999999')->assertNotFound();
    }

    public function test_type_change_is_blocked_once_values_exist(): void
    {
        $id = $this->field('student', 'hostel_block', 'text');
        $student = $this->ids['students']['S1'];

        $this->asUser('admin@demo.com')->patchJson("/api/v1/custom-fields/{$id}", ['type' => 'number'])->assertOk();
        $this->asUser('admin@demo.com')
            ->putJson("/api/v1/custom-fields/values/student/{$student}", ['customFields' => ['hostel_block' => 4]])
            ->assertOk();

        $this->asUser('admin@demo.com')->patchJson("/api/v1/custom-fields/{$id}", ['type' => 'text'])->assertStatus(409);
        // Number and boolean share a column, so that change is allowed.
        $this->asUser('admin@demo.com')->patchJson("/api/v1/custom-fields/{$id}", ['type' => 'boolean'])->assertOk();

        $this->asUser('admin@demo.com')->deleteJson("/api/v1/custom-fields/{$id}")->assertOk();
        $this->asUser('admin@demo.com')->getJson("/api/v1/custom-fields/values/student/{$student}")
            ->assertOk()
            ->assertJsonMissingPath('data.hostel_block');
    }

    public function test_fields_are_isolated_per_institution(): void
    {
        $this->field('student', 'hostel', 'boolean');
        $other = Institution::query()->create(['name' => 'Other College', 'code' => 'OTHER', 'slug' => 'other', 'status' => 'active'])->id;
        DB::table('custom_field_definitions')->insert([
            'institution_id' => $other, 'entity' => 'student', 'key' => 'other_only', 'label' => 'Other only', 'type' => 'text',
            'is_required' => true, 'is_active' => true, 'sort_order' => 0, 'created_at' => now(), 'updated_at' => now(),
        ]);

        $keys = array_column($this->asUser('admin@demo.com')->getJson('/api/v1/custom-fields?entity=student')->json('data'), 'key');
        $this->assertSame(['hostel'], $keys);
        $this->assertSame(2, CustomFieldDefinition::withoutGlobalScope(InstitutionScope::class)->count());
    }

    public function test_course_department_designation_custom_fields_and_values(): void
    {
        $admin = $this->asUser('admin@demo.com');

        // 1. Create definitions for department, course, and designation
        $admin->postJson('/api/v1/custom-fields', [
            'entity' => 'department',
            'label' => 'Budget Code',
            'type' => 'text',
        ])->assertCreated()->assertJsonPath('data.key', 'budget_code');

        $admin->postJson('/api/v1/custom-fields', [
            'entity' => 'course',
            'label' => 'Accredited',
            'key' => 'nba_accredited',
            'type' => 'boolean',
        ])->assertCreated()->assertJsonPath('data.key', 'nba_accredited');

        $admin->postJson('/api/v1/custom-fields', [
            'entity' => 'designation',
            'label' => 'Pay Band',
            'type' => 'select',
            'options' => ['Band 1', 'Band 2', 'Band 3'],
        ])->assertCreated()->assertJsonPath('data.key', 'pay_band');

        $adminUser = \App\Models\User::where('email', 'admin@demo.com')->firstOrFail();
        $institutionId = $adminUser->institution_id;

        // 2. Fetch or create entities to test values (scoped to current institution)
        $department = \App\Models\Department::where('institution_id', $institutionId)->first();
        if (!$department) {
            $department = \App\Models\Department::create([
                'code' => 'TEST_DEPT', 'name' => 'Test Department', 'status' => 'active', 'institution_id' => $institutionId,
            ]);
        }

        $course = \App\Models\Course::where('institution_id', $institutionId)->first();
        if (!$course) {
            $course = \App\Models\Course::create([
                'code' => 'TEST_CRS', 'name' => 'Test Course', 'department_id' => $department->id,
                'total_semesters' => 8, 'duration_years' => 4, 'institution_id' => $institutionId,
            ]);
        }

        $designation = \App\Models\Designation::where('institution_id', $institutionId)->first();
        if (!$designation) {
            $designation = \App\Models\Designation::create([
                'slug' => 'test-lead', 'name' => 'Test Lead', 'department_id' => $department->id,
                'status' => 'active', 'institution_id' => $institutionId,
            ]);
        }

        // 3. Update values for department
        $admin->putJson("/api/v1/custom-fields/values/department/{$department->id}", [
            'customFields' => ['budget_code' => 'FIN-2026-CSE'],
        ])->assertOk()->assertJsonPath('data.budget_code', 'FIN-2026-CSE');

        // 4. Update values for course
        $admin->putJson("/api/v1/custom-fields/values/course/{$course->id}", [
            'customFields' => ['nba_accredited' => true],
        ])->assertOk()->assertJsonPath('data.nba_accredited', true);

        // 5. Update values for designation
        $admin->putJson("/api/v1/custom-fields/values/designation/{$designation->id}", [
            'customFields' => ['pay_band' => 'Band 2'],
        ])->assertOk()->assertJsonPath('data.pay_band', 'Band 2');

        // 6. Read back values via showValues
        $admin->getJson("/api/v1/custom-fields/values/department/{$department->id}")
            ->assertOk()
            ->assertJsonPath('data.budget_code', 'FIN-2026-CSE');

        $admin->getJson("/api/v1/custom-fields/values/course/{$course->id}")
            ->assertOk()
            ->assertJsonPath('data.nba_accredited', true);

        $admin->getJson("/api/v1/custom-fields/values/designation/{$designation->id}")
            ->assertOk()
            ->assertJsonPath('data.pay_band', 'Band 2');
    }

    private function field(string $entity, string $key, string $type, array $options = [], bool $required = false): int
    {
        return $this->insert('custom_field_definitions', [
            'entity' => $entity, 'key' => $key, 'label' => ucfirst(str_replace('_', ' ', $key)), 'type' => $type,
            'options' => $options ? json_encode($options) : null, 'is_required' => $required, 'is_active' => true, 'sort_order' => 0,
        ]);
    }
}
