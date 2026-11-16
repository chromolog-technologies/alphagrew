<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Student;
use App\Models\User;
use App\Repositories\StudentRepository;
use App\Support\Tenancy\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\BuildsMarksFixtures;
use Tests\TestCase;

/**
 * Which students each role can see (StudentRepository::visibleTo), deny by default.
 */
class StudentVisibilityTest extends TestCase
{
    use BuildsMarksFixtures;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->buildMarksFixtures();
    }

    public function test_each_role_sees_only_its_students(): void
    {
        $all = $this->visibleCount($this->user(UserRole::InstitutionAdmin));
        $dsc = $this->visibleCount($this->user(UserRole::Staff, 'DSC'));

        $this->assertGreaterThanOrEqual(3, $all);
        $this->assertSame($all, $this->visibleCount($this->user(UserRole::PlacementOfficer)));
        $this->assertSame(3, $dsc, 'Staff see their own department (S1–S3 are in DSC).');
    }

    public function test_staff_without_a_department_see_no_students(): void
    {
        $this->assertSame(0, $this->visibleCount($this->user(UserRole::Staff, null)));
        $this->assertSame(0, $this->visibleCount($this->user(UserRole::Staff, '')));
    }

    public function test_recruiters_and_other_roles_see_no_students(): void
    {
        $this->assertSame(0, $this->visibleCount($this->user(UserRole::Recruiter)));
        $this->assertSame(0, $this->visibleCount($this->user(UserRole::PlatformStaff)));
    }

    public function test_students_see_only_themselves_and_nothing_without_a_record(): void
    {
        $studentUser = $this->user(UserRole::Student);
        $this->assertSame(0, $this->visibleCount($studentUser), 'A student account without a student record sees nothing.');

        $s1 = $this->ids['students']['S1'];
        app(Tenant::class)->runAs($this->institutionId, fn () => Student::query()->whereKey($s1)->update(['user_id' => $studentUser->id]));

        $visible = app(Tenant::class)->runAs($this->institutionId, fn () => app(StudentRepository::class)->visibleTo($studentUser->fresh())->pluck('id')->all());
        $this->assertSame([$s1], $visible);
    }

    private function visibleCount(User $user): int
    {
        return app(Tenant::class)->runAs($this->institutionId, fn () => app(StudentRepository::class)->visibleTo($user)->count());
    }

    private function user(UserRole $role, ?string $departmentCode = null): User
    {
        static $n = 0;
        $n++;

        $user = new User(['name' => "User {$n}", 'email' => "visibility{$n}@test.dev", 'password' => 'secret123', 'role' => $role->value]);
        $user->forceFill(['institution_id' => $this->institutionId, 'department_code' => $departmentCode])->saveQuietly();

        return $user;
    }
}
