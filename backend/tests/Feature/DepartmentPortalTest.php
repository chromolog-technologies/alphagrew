<?php

namespace Tests\Feature;

use App\Enums\MarkStatus;
use App\Models\Designation;
use App\Models\User;
use App\Support\Campus\CampusPermission;
use App\Support\Tenancy\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Concerns\BuildsMarksFixtures;
use Tests\TestCase;

/**
 * The department staff portal: real overview and reports for the user's own department, and
 * HOD management of staff accounts limited to their department and their own level of access.
 */
class DepartmentPortalTest extends TestCase
{
    use BuildsMarksFixtures;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->buildMarksFixtures();
    }

    public function test_staff_see_their_own_department_figures(): void
    {
        $this->classMarks('DS101', 30, 50, MarkStatus::Locked);
        DB::table('students')->where('id', $this->ids['students']['S1'])->update(['placed_company' => 'Acme']);

        $this->asUser('hod@dsc.test')->getJson('/api/v1/department-portal/summary')
            ->assertOk()
            ->assertJsonPath('data.department.code', 'DSC')
            ->assertJsonPath('data.counts.students', 3)
            ->assertJsonPath('data.counts.courses', 1)
            ->assertJsonPath('data.placedStudents', 1)
            ->assertJsonPath('data.averages.placementRate', 33.3);

        $reports = $this->asUser('hod@dsc.test')->getJson('/api/v1/department-portal/reports')->assertOk()->json('data');
        $ds101 = collect($reports['academic'])->firstWhere('code', 'DS101');
        $this->assertSame(3, $ds101['students']);
        $this->assertSame(80.0, (float) $ds101['averageMarks']);
        $this->assertSame(100.0, (float) $ds101['passPercentage']);
        $this->assertSame([['company' => 'Acme', 'students' => 1]], $reports['placement']['topCompanies']);

        // Another department's HOD sees their own department, not DSC.
        $this->asUser('hod@cse.test')->getJson('/api/v1/department-portal/summary')->assertJsonPath('data.department.code', 'CSE');
        // Admins choose a department.
        $this->asUser('admin@demo.com')->getJson('/api/v1/department-portal/summary?departmentCode=DSC')->assertJsonPath('data.department.code', 'DSC');
    }

    public function test_staff_without_a_department_are_refused(): void
    {
        $this->tenant(fn () => User::query()->whereKey($this->ids['faculty@dsc.test'])->update(['department_code' => null]));

        $this->asUser('faculty@dsc.test')->getJson('/api/v1/department-portal/summary')->assertForbidden();
    }

    public function test_department_staff_list_shows_teaching_allocations(): void
    {
        $staff = collect($this->asUser('hod@dsc.test')->getJson('/api/v1/department-portal/staff')->assertOk()->json('data'));

        $faculty = $staff->firstWhere('email', 'faculty@dsc.test');
        $this->assertNotNull($faculty);
        $this->assertSame('DS101', $faculty['subjects'][0]['code']);
        $this->assertNull($staff->firstWhere('email', 'hod@cse.test'), 'Other departments are not listed.');
    }

    public function test_hods_manage_staff_of_their_department_within_their_own_access(): void
    {
        $payload = ['name' => 'New Lecturer', 'email' => 'lecturer@dsc.test', 'password' => 'secret123', 'designationId' => $this->facultyDesignation()];

        // Without staff.* the HOD can only look.
        $this->asUser('hod@dsc.test')->postJson('/api/v1/department-portal/staff', $payload)->assertForbidden();

        $this->grantHod([CampusPermission::STAFF_VIEW, CampusPermission::STAFF_CREATE, CampusPermission::STAFF_EDIT, CampusPermission::STAFF_DELETE]);

        $this->asUser('hod@dsc.test')->getJson('/api/v1/department-portal/staff')
            ->assertJsonPath('meta.canCreate', true)
            ->assertJsonPath('meta.department.code', 'DSC');

        $id = $this->asUser('hod@dsc.test')->postJson('/api/v1/department-portal/staff', $payload)
            ->assertCreated()
            ->assertJsonPath('data.email', 'lecturer@dsc.test')
            ->json('data.id');
        $this->assertSame('DSC', DB::table('users')->where('id', $id)->value('department_code'));

        // No designation with more access than the HOD (the coordinator can publish results).
        $coordinator = DB::table('designations')->where('slug', 'exam-coordinator-test')->value('id');
        $this->asUser('hod@dsc.test')->putJson("/api/v1/department-portal/staff/{$id}", [...$payload, 'designationId' => $coordinator])
            ->assertJsonValidationErrors('designationId');

        // Staff of other departments are out of reach; HODs cannot remove themselves.
        $other = $this->ids['coordinator@ece.test'];
        $this->asUser('hod@dsc.test')->putJson("/api/v1/department-portal/staff/{$other}", [...$payload, 'email' => 'x@ece.test'])->assertNotFound();
        $this->asUser('hod@dsc.test')->deleteJson("/api/v1/department-portal/staff/{$this->ids['hod@dsc.test']}")->assertStatus(422);

        $this->asUser('hod@dsc.test')->putJson("/api/v1/department-portal/staff/{$id}", [...$payload, 'name' => 'Lecturer Renamed', 'password' => null])
            ->assertOk()
            ->assertJsonPath('data.name', 'Lecturer Renamed');
        $this->asUser('hod@dsc.test')->deleteJson("/api/v1/department-portal/staff/{$id}")->assertOk();
        $this->assertSoftDeleted('users', ['id' => $id]);
    }

    /** A designation with less access than the HOD's (marks.view only). */
    private function facultyDesignation(): int
    {
        return $this->tenant(fn () => Designation::query()->create([
            'name' => 'Lecturer', 'slug' => 'lecturer-test', 'status' => 'active', 'permissions' => [CampusPermission::MARKS_VIEW],
        ])->id);
    }

    /** @param  list<string>  $extra */
    private function grantHod(array $extra): void
    {
        $this->tenant(function () use ($extra): void {
            $designation = Designation::query()->where('slug', 'hod-test')->firstOrFail();
            $designation->update(['permissions' => [...$designation->permissions, ...$extra]]);
        });
        // Permissions are re-synced at sign-in.
        unset($this->tokens['hod@dsc.test']);
    }

    private function tenant(callable $callback): mixed
    {
        return app(Tenant::class)->runAs($this->institutionId, $callback);
    }
}
