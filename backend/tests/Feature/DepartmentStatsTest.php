<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Department;
use App\Models\Institution;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DepartmentStatsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_department_stats_returns_computed_metrics(): void
    {
        $admin = $this->tokenFor('admin@demo.com');
        $department = Department::query()->where('code', 'CSE')->firstOrFail();

        $response = $this->withToken($admin)
            ->getJson("/api/v1/departments/{$department->id}/stats")
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'name',
                    'code',
                    'staff_count',
                    'total_faculty',
                    'student_count',
                    'total_students',
                    'average_cgpa',
                    'placement_rate',
                    'courses_count',
                    'intake_capacity',
                    'status',
                ],
            ]);

        $data = $response->json('data');
        $this->assertSame($department->id, $data['id']);
        $this->assertSame('CSE', $data['code']);
        $this->assertIsNumeric($data['average_cgpa']);
        $this->assertIsNumeric($data['placement_rate']);
    }

    public function test_academic_years_list_returns_valid_options(): void
    {
        $admin = $this->tokenFor('admin@demo.com');

        AcademicYear::query()->firstOrCreate(
            ['year' => '2025-2026', 'institution_id' => Institution::defaultId()],
            [
                'code' => 'AY-2025-26',
                'start_date' => '2025-06-01',
                'end_date' => '2026-05-31',
                'is_active' => true,
            ]
        );

        $response = $this->withToken($admin)
            ->getJson('/api/v1/semesters/list/academic-years')
            ->assertOk();

        $this->assertNotEmpty($response->json());
        $first = $response->json()[0];
        $this->assertArrayHasKey('id', $first);
        $this->assertArrayHasKey('year', $first);
        $this->assertArrayHasKey('name', $first);
        $this->assertArrayHasKey('start_date', $first);
        $this->assertArrayHasKey('end_date', $first);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $department = Department::query()->firstOrFail();

        $this->getJson("/api/v1/departments/{$department->id}/stats")->assertUnauthorized();
        $this->getJson('/api/v1/semesters/list/academic-years')->assertUnauthorized();
    }

    private function tokenFor(string $email): string
    {
        return (string) $this->postJson('/api/v1/auth/login', [
            'email' => $email,
            'password' => 'demo123',
        ])->json('token');
    }
}
