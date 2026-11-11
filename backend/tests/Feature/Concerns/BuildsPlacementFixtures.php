<?php

namespace Tests\Feature\Concerns;

use App\Enums\UserRole;
use App\Models\Institution;
use App\Models\Student;
use App\Models\StudentAcademicSummary;
use App\Models\User;
use App\Support\Tenancy\Tenant;

/**
 * Students with sign-in accounts for placement tests (password demo123), in the demo
 * institution, plus token-based requests per user. Call after $this->seed().
 */
trait BuildsPlacementFixtures
{
    /** @var array<string, string> */
    private array $placementTokens = [];

    /**
     * @param  array{cgpa?: float, backlogs?: int, department?: string, year?: string, batchId?: int, verified?: bool}  $facts
     */
    protected function placementStudent(string $key, array $facts = []): Student
    {
        $institutionId = Institution::defaultId();

        return app(Tenant::class)->runAs($institutionId, function () use ($key, $facts, $institutionId): Student {
            $user = User::query()->create([
                'name' => "Student {$key}", 'email' => "{$key}@placement.test", 'password' => 'demo123',
                'role' => UserRole::Student->value, 'institution_id' => $institutionId, 'title' => 'Student',
                'department_code' => $facts['department'] ?? 'CSE',
            ]);
            // Not fillable on User.
            $user->forceFill(['email_verified_at' => ($facts['verified'] ?? true) ? now() : null])->save();

            $student = Student::query()->create([
                'user_id' => $user->id, 'name' => "Student {$key}", 'email' => $user->email,
                'registration_number' => 'PLC'.strtoupper($key), 'department_code' => $facts['department'] ?? 'CSE',
                'year' => $facts['year'] ?? '4th Year', 'status' => 'Active', 'cgpa' => $facts['cgpa'] ?? 8.0,
                'attendance' => 90, 'fee_status' => 'Paid', 'skills' => [], 'batch_id' => $facts['batchId'] ?? null,
            ]);

            StudentAcademicSummary::query()->create([
                'student_id' => $student->id, 'institution_id' => $institutionId, 'cgpa' => $facts['cgpa'] ?? 8.0,
                'active_backlogs' => $facts['backlogs'] ?? 0, 'backlog_history' => $facts['backlogs'] ?? 0,
                'attendance_percentage' => 90, 'source' => 'results', 'calculated_at' => now(),
            ]);

            return $student;
        });
    }

    /** Requests as the given user (password demo123), signing in once per test. */
    protected function as(string $email): static
    {
        $this->app['auth']->forgetGuards();

        $this->placementTokens[$email] ??= (string) $this->postJson('/api/v1/auth/login', ['email' => $email, 'password' => 'demo123'])
            ->assertOk()
            ->json('token');

        return $this->withToken($this->placementTokens[$email]);
    }

    /** @param array<string, mixed> $overrides */
    protected function jobPayload(array $overrides = []): array
    {
        return [
            'companyName' => 'Acme Systems',
            'industry' => 'Software',
            'title' => 'Graduate Engineer',
            'employmentType' => 'full_time',
            'location' => 'Chennai',
            'ctcMinLpa' => 6,
            'ctcMaxLpa' => 8,
            'openings' => 5,
            'requiredSkills' => ['Java', 'SQL'],
            'applyDeadline' => now()->addDays(10)->toIso8601String(),
            'driveDate' => now()->addDays(14)->toDateString(),
            'eligibility' => [
                ['field' => 'cgpa', 'operator' => 'gte', 'value' => 7.5],
                ['field' => 'active_backlogs', 'operator' => 'lte', 'value' => 0],
                ['field' => 'department', 'operator' => 'in', 'value' => ['CSE', 'ECE']],
            ],
            ...$overrides,
        ];
    }

    /** Creates and publishes a job as the placement officer; returns its id. */
    protected function publishedJob(array $overrides = []): int
    {
        $id = $this->as('placement@demo.com')->postJson('/api/v1/placement/jobs', $this->jobPayload($overrides))->assertCreated()->json('data.id');
        $this->as('placement@demo.com')->postJson("/api/v1/placement/jobs/{$id}/publish")->assertOk();

        return $id;
    }
}
