<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Course;
use App\Models\CustomFieldValue;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Feature\Concerns\BuildsMarksFixtures;
use Tests\TestCase;

/**
 * Custom fields on the standard records' own create/update/list endpoints (staff, department,
 * course, subject, designation, company): validated with the record, required on create, kept
 * when left out of an update, and returned with the record.
 */
class CustomFieldRecordsTest extends TestCase
{
    use BuildsMarksFixtures;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->buildMarksFixtures();
    }

    /** @return array<string, array{0: string, 1: string, 2: string}> entity, collection URL, model class */
    public static function entities(): array
    {
        return [
            'department' => ['department', '/api/v1/departments', Department::class],
            'course' => ['course', '/api/v1/courses', Course::class],
            'subject' => ['subject', '/api/v1/subjects', Subject::class],
            'designation' => ['designation', '/api/v1/designations', Designation::class],
            'staff' => ['staff', '/api/v1/staff', User::class],
            'company' => ['company', '/api/v1/companies', Company::class],
        ];
    }

    #[DataProvider('entities')]
    public function test_custom_fields_are_validated_saved_and_kept_on_the_record_endpoints(string $entity, string $url, string $model): void
    {
        $this->asUser('admin@demo.com')
            ->postJson('/api/v1/custom-fields', ['entity' => $entity, 'label' => 'Ref code', 'type' => 'text', 'isRequired' => true])
            ->assertCreated();
        $payload = $this->payload($entity);

        // Required on create, validated together with the record's own fields.
        $this->asUser('admin@demo.com')->postJson($url, $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('customFields');
        $this->asUser('admin@demo.com')->postJson($url, [...$payload, 'customFields' => ['ref_code' => '']])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('customFields.ref_code');
        $this->asUser('admin@demo.com')->postJson($url, [...$payload, 'customFields' => ['unknown' => 'x', 'ref_code' => 'A']])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('customFields');

        $this->asUser('admin@demo.com')->postJson($url, [...$payload, 'customFields' => ['ref_code' => 'ABC-1']])->assertCreated();
        $id = $model::query()->latest('id')->value('id');
        $this->assertSame('ABC-1', $this->value($entity, $id));

        // Left out on update: the value stays. Sent: it changes.
        $method = 'putJson';
        $this->asUser('admin@demo.com')->{$method}("{$url}/{$id}", $this->updatePayload($entity, $payload))->assertOk();
        $this->assertSame('ABC-1', $this->value($entity, $id));

        $this->asUser('admin@demo.com')
            ->{$method}("{$url}/{$id}", [...$this->updatePayload($entity, $payload), 'customFields' => ['ref_code' => 'XYZ-9']])
            ->assertOk();
        $this->assertSame('XYZ-9', $this->value($entity, $id));
    }

    public function test_lists_and_details_return_custom_field_values(): void
    {
        foreach (['department', 'course', 'subject', 'designation', 'staff', 'exam'] as $entity) {
            $this->asUser('admin@demo.com')
                ->postJson('/api/v1/custom-fields', ['entity' => $entity, 'label' => 'Note', 'type' => 'text'])
                ->assertCreated();
        }

        $course = Course::query()->where('code', 'BTDS')->value('id');
        $this->asUser('admin@demo.com')->putJson("/api/v1/custom-fields/values/course/{$course}", ['customFields' => ['note' => 'NBA']])->assertOk();

        $courses = collect($this->asUser('admin@demo.com')->getJson('/api/v1/courses')->assertOk()->json());
        $this->assertSame(['note' => 'NBA'], $courses->firstWhere('id', $course)['customFields']);
        $this->asUser('admin@demo.com')->getJson("/api/v1/courses/{$course}")->assertJsonPath('customFields.note', 'NBA');

        // Every other list carries the key, with null for unset values.
        $this->asUser('admin@demo.com')->getJson('/api/v1/departments')->assertJsonPath('data.0.customFields', ['note' => null]);
        $this->asUser('admin@demo.com')->getJson('/api/v1/subjects')->assertJsonPath('0.customFields', ['note' => null]);
        $this->asUser('admin@demo.com')->getJson('/api/v1/designations')->assertJsonPath('data.0.customFields', ['note' => null]);
        $this->asUser('admin@demo.com')->getJson('/api/v1/staff')->assertJsonPath('0.customFields', ['note' => null]);
        $this->asUser('admin@demo.com')->getJson('/api/v1/exams')->assertJsonPath('data.0.customFields', ['note' => null]);

        $department = Department::query()->where('code', 'DSC')->value('id');
        $this->asUser('admin@demo.com')->getJson("/api/v1/departments/{$department}")->assertJsonPath('data.customFields', ['note' => null]);
    }

    /** @return array<string, mixed> A valid create payload for the entity. */
    private function payload(string $entity): array
    {
        $departmentId = Department::query()->where('code', 'DSC')->value('id');

        return match ($entity) {
            'department' => ['name' => 'Robotics', 'code' => 'ROB'],
            'course' => ['name' => 'B.Tech Robotics', 'code' => 'BTROB', 'department_id' => $departmentId, 'total_semesters' => 8],
            'subject' => [
                'name' => 'Kinematics', 'code' => 'ROB101', 'course_id' => Course::query()->where('code', 'BTDS')->value('id'),
                'semester_number' => 1, 'credit_hours' => 4, 'lecture_hours' => 3, 'practical_hours' => 2,
            ],
            'designation' => ['name' => 'Lab Coordinator'],
            'staff' => [
                'name' => 'New Faculty', 'email' => 'new.faculty@dsc.test', 'password' => 'secret123',
                'designationId' => Designation::query()->value('id'), 'departmentCode' => 'DSC',
            ],
            'company' => [
                'name' => 'Acme Robotics', 'role' => 'Engineer', 'packageOffered' => '8 LPA', 'driveDate' => '2026-12-01',
                'status' => 'upcoming', 'location' => 'Kochi', 'type' => 'placement', 'eligibleDepartments' => ['DSC'],
            ],
        };
    }

    /** @return array<string, mixed> */
    private function updatePayload(string $entity, array $payload): array
    {
        return match ($entity) {
            'staff' => array_diff_key($payload, ['password' => true]),
            default => $payload,
        };
    }

    private function value(string $entity, int $id): ?string
    {
        $definitionId = DB::table('custom_field_definitions')->where('entity', $entity)->where('key', 'ref_code')->value('id');

        return CustomFieldValue::query()->where('definition_id', $definitionId)->where('entity_id', $id)->value('value_text');
    }
}
