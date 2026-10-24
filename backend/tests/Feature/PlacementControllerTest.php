<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\CompanyApplication;
use App\Models\Institution;
use App\Models\Mark;
use App\Models\PlacementResult;
use App\Models\PlacementRound;
use App\Models\RevaluationRequest;
use App\Models\Student;
use App\Support\Tenancy\InstitutionScope;
use App\Support\Tenancy\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlacementControllerTest extends TestCase
{
    use RefreshDatabase;

    private int $institutionA;

    private int $institutionB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->institutionA = Institution::defaultId();
        $this->institutionB = Institution::query()->create([
            'name' => 'Second University',
            'code' => 'SECOND_U',
            'slug' => 'second-u',
            'status' => 'active',
        ])->id;
    }

    public function test_placement_officer_can_fetch_drives_from_database(): void
    {
        $token = $this->tokenFor('placement@demo.com');

        $response = $this->withToken($token)
            ->getJson('/api/v1/staff/placement/drives')
            ->assertOk()
            ->assertJsonStructure([
                'status',
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'role',
                        'package_offered',
                        'status',
                    ],
                ],
                'total_drives',
            ]);

        $this->assertNotSame('sample', $response->headers->get('X-Data-Source'));

        // The old /placement/* duplicates were removed; /staff/placement/* is the only path.
        $this->withToken($token)
            ->getJson('/api/v1/placement/drives')
            ->assertNotFound();
    }

    public function test_placement_officer_can_create_drive_persisting_to_database(): void
    {
        $token = $this->tokenFor('placement@demo.com');

        $payload = [
            'name' => 'Acme Technologies',
            'role' => 'Senior Backend Engineer',
            'package_offered' => '14-16 LPA',
            'drive_date' => now()->addDays(14)->toDateString(),
            'location' => 'Bengaluru, India',
            'type' => 'Full-time',
            'eligible_departments' => ['CSE', 'IT'],
            'status' => 'upcoming',
        ];

        $response = $this->withToken($token)
            ->postJson('/api/v1/staff/placement/drives', $payload)
            ->assertCreated()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.name', 'Acme Technologies')
            ->assertJsonPath('data.role', 'Senior Backend Engineer');

        $driveId = $response->json('data.id');

        $this->assertDatabaseHas('companies', [
            'id' => $driveId,
            'name' => 'Acme Technologies',
            'role' => 'Senior Backend Engineer',
            'institution_id' => $this->institutionA,
        ]);
    }

    public function test_placement_officer_can_update_drive_status(): void
    {
        $token = $this->tokenFor('placement@demo.com');

        // Create a drive first
        $createResponse = $this->withToken($token)
            ->postJson('/api/v1/staff/placement/drives', [
                'name' => 'Global Logistics Inc',
                'role' => 'Cloud Specialist',
                'package_offered' => '10 LPA',
                'status' => 'upcoming',
            ])
            ->assertCreated();

        $driveId = $createResponse->json('data.id');

        // Update the drive
        $this->withToken($token)
            ->putJson("/api/v1/staff/placement/drives/{$driveId}", [
                'status' => 'completed',
                'location' => 'Hyderabad',
            ])
            ->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.location', 'Hyderabad');

        $this->assertDatabaseHas('companies', [
            'id' => $driveId,
            'status' => 'Completed',
            'location' => 'Hyderabad',
        ]);
    }

    public function test_placement_statistics_calculates_real_metrics(): void
    {
        $token = $this->tokenFor('placement@demo.com');

        $response = $this->withToken($token)
            ->getJson('/api/v1/staff/placement/statistics')
            ->assertOk()
            ->assertJsonStructure([
                'status',
                'data' => [
                    'total_drives',
                    'total_students',
                    'placed_students',
                    'placement_rate',
                    'highest_package',
                    'average_package',
                    'top_recruiter',
                ],
            ]);

        $this->assertNotSame('sample', $response->headers->get('X-Data-Source'));
        $data = $response->json('data');
        $this->assertIsInt($data['total_drives']);
        $this->assertIsInt($data['total_students']);
        $this->assertIsInt($data['placed_students']);
    }

    public function test_placement_results_by_batch(): void
    {
        $token = $this->tokenFor('placement@demo.com');

        $this->withToken($token)
            ->getJson('/api/v1/staff/placement/results-by-batch')
            ->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonStructure([
                'status',
                'data' => [
                    '*' => [
                        'batch',
                        'total',
                        'placed',
                        'percentage',
                    ],
                ],
            ]);
    }

    public function test_export_report_returns_summary(): void
    {
        $token = $this->tokenFor('placement@demo.com');

        $this->withToken($token)
            ->getJson('/api/v1/staff/placement/report')
            ->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonStructure([
                'status',
                'data' => [
                    'file_name',
                    'download_url',
                    'generated_at',
                    'metrics' => [
                        'total_students',
                        'placed_students',
                        'total_drives',
                    ],
                ],
            ]);
    }

    public function test_tenant_isolation_prevents_viewing_and_editing_other_institution_drives(): void
    {
        // Create a company in Institution B directly without global scope
        $companyB = Company::withoutGlobalScope(InstitutionScope::class)->create([
            'institution_id' => $this->institutionB,
            'name' => 'Foreign Corporate Ltd',
            'role' => 'Data Analyst',
            'package_offered' => '12 LPA',
            'drive_date' => now()->addDays(20)->toDateString(),
            'location' => 'Hyderabad',
            'type' => 'Placement',
            'eligible_departments' => ['CSE'],
            'status' => 'Upcoming',
        ]);

        $tokenA = $this->tokenFor('placement@demo.com');

        // Institution A's drive list should NOT contain Institution B's company
        $response = $this->withToken($tokenA)
            ->getJson('/api/v1/staff/placement/drives')
            ->assertOk();

        $drives = collect($response->json('data'));
        $this->assertFalse(
            $drives->contains('name', 'Foreign Corporate Ltd'),
            'Institution A drives list must not contain Institution B company'
        );

        // Attempting to update Institution B's company should return 404
        $this->withToken($tokenA)
            ->putJson("/api/v1/staff/placement/drives/{$companyB->id}", [
                'status' => 'cancelled',
            ])
            ->assertNotFound();

        // Ensure database was not modified
        $this->assertDatabaseHas('companies', [
            'id' => $companyB->id,
            'status' => 'Upcoming',
        ]);
    }

    public function test_applications_list_shows_only_the_callers_institution(): void
    {
        $companyB = Company::withoutGlobalScope(InstitutionScope::class)->create([
            'institution_id' => $this->institutionB,
            'name' => 'Foreign Corporate Ltd',
            'role' => 'Data Analyst',
            'package_offered' => '12 LPA',
            'drive_date' => now()->addDays(20)->toDateString(),
            'location' => 'Hyderabad',
            'type' => 'Placement',
            'eligible_departments' => ['CSE'],
            'status' => 'open',
        ]);
        $studentB = Student::withoutGlobalScope(InstitutionScope::class)->create([
            'institution_id' => $this->institutionB,
            'name' => 'Foreign Student',
            'email' => 'foreign.student@second.edu',
            'registration_number' => 'SEC26CSE001',
            'department_code' => 'CSE',
            'year' => 'year_4',
            'gender' => 'prefer_not_to_say',
            'status' => 'active',
            'cgpa' => 8.1,
            'attendance' => 90,
            'fee_status' => 'paid',
            'skills' => [],
        ]);
        $applicationB = CompanyApplication::withoutGlobalScope(InstitutionScope::class)->create([
            'institution_id' => $this->institutionB,
            'student_id' => $studentB->id,
            'company_id' => $companyB->id,
        ]);

        $tokenA = $this->tokenFor('placement@demo.com');

        $all = collect($this->withToken($tokenA)->getJson('/api/v1/staff/placement/applications')->assertOk()->json('data'));
        $this->assertNotEmpty($all, 'Institution A has demo applications');
        $this->assertFalse($all->contains('id', $applicationB->id));
        $this->assertFalse($all->contains('email', 'foreign.student@second.edu'));

        // Filtering by another institution's drive id returns nothing.
        $this->withToken($tokenA)
            ->getJson("/api/v1/staff/placement/applications?drive_id={$companyB->id}")
            ->assertOk()
            ->assertJsonPath('total_applications', 0);
    }

    public function test_students_cannot_list_applications(): void
    {
        $this->withToken($this->tokenFor('student@demo.com'))
            ->getJson('/api/v1/staff/placement/applications')
            ->assertForbidden();
    }

    public function test_placement_and_marks_child_rows_are_scoped_and_stamped_with_the_institution(): void
    {
        $this->assertSame(0, CompanyApplication::withoutGlobalScope(InstitutionScope::class)->whereNull('institution_id')->count());

        $companyA = Company::query()->firstOrFail();
        $studentA = Student::query()->firstOrFail();

        app(Tenant::class)->runAs($this->institutionB, function () use ($companyA, $studentA): void {
            // Institution B sees none of A's rows, and new rows are stamped with B.
            $this->assertSame(0, CompanyApplication::query()->count());
            $round = PlacementRound::query()->create(['company_id' => $companyA->id, 'name' => 'Aptitude', 'type' => 'aptitude']);
            $this->assertSame($this->institutionB, $round->institution_id);
            $result = PlacementResult::query()->create(['student_id' => $studentA->id, 'company_id' => $companyA->id, 'round_id' => $round->id, 'status' => 'cleared']);
            $this->assertSame($this->institutionB, $result->institution_id);
        });

        app(Tenant::class)->runAs($this->institutionA, function (): void {
            $this->assertSame(0, PlacementRound::query()->count());
            $this->assertSame(0, PlacementResult::query()->count());
            $this->assertSame(0, Mark::query()->count());
            $this->assertSame(0, RevaluationRequest::query()->count());
        });
    }

    private function tokenFor(string $email): string
    {
        return (string) $this->postJson('/api/v1/auth/login', ['email' => $email, 'password' => 'demo123'])
            ->assertOk()
            ->json('token');
    }
}
