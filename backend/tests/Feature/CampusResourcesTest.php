<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\Company;
use App\Models\Designation;
use App\Models\Institution;
use App\Models\MasterOption;
use App\Models\User;
use App\Support\Campus\CampusMasterCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Pins the request/response contract of the campus endpoints (masters, staff,
 * companies, announcements, resume, summary) so internal restructuring can't change it.
 */
class CampusResourcesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
    }

    public function test_masters_crud_is_admin_only_and_returns_the_dataset(): void
    {
        $admin = $this->tokenFor('admin@demo.com');

        $this->withToken($admin)->getJson('/api/v1/masters')->assertOk();

        $this->withToken($admin)
            ->postJson('/api/v1/masters', [
                'category' => CampusMasterCatalog::STUDENT_GENDER,
                'label' => 'Non Binary',
                'sortOrder' => 5,
            ])
            ->assertCreated()
            ->assertJsonStructure(['data' => ['masters', 'students', 'users']])
            ->assertJsonFragment(['code' => 'non_binary', 'label' => 'Non Binary']);

        $this->withToken($admin)
            ->postJson('/api/v1/masters', ['category' => CampusMasterCatalog::STUDENT_GENDER, 'label' => 'Non Binary'])
            ->assertUnprocessable();

        $master = MasterOption::query()->where('code', 'non_binary')->firstOrFail();

        $this->withToken($admin)
            ->putJson("/api/v1/masters/{$master->id}", ['label' => 'Non-binary'])
            ->assertOk()
            ->assertJsonFragment(['label' => 'Non-binary']);

        $this->withToken($admin)->deleteJson("/api/v1/masters/{$master->id}")->assertOk();
        $this->assertDatabaseMissing('master_options', ['id' => $master->id]);

        $this->app['auth']->forgetGuards();
        $this->withToken($this->tokenFor('placement@demo.com'))->getJson('/api/v1/masters')->assertForbidden();
    }

    public function test_staff_update_and_delete(): void
    {
        $designation = Designation::query()->create([
            'institution_id' => Institution::defaultId(),
            'name' => 'Faculty',
            'slug' => 'faculty',
            'status' => 'active',
            'permissions' => [],
        ]);
        $staff = User::query()->where('email', 'staff@demo.com')->firstOrFail();
        $admin = $this->tokenFor('admin@demo.com');

        $this->withToken($admin)
            ->putJson("/api/v1/staff/{$staff->id}", [
                'name' => 'Meera Nair',
                'email' => 'staff@demo.com',
                'designationId' => $designation->id,
                'departmentCode' => 'CSE',
            ])
            ->assertOk()
            ->assertJsonStructure(['data' => ['users', 'students']]);

        $staff->refresh();
        $this->assertSame('Faculty', $staff->title);
        $this->assertSame('CSE', $staff->department_code);
        $this->assertSame($designation->id, $staff->designation_id);

        $student = User::query()->where('email', 'student@demo.com')->firstOrFail();
        $this->withToken($admin)->putJson("/api/v1/staff/{$student->id}", [])->assertNotFound();

        $this->withToken($admin)->deleteJson("/api/v1/staff/{$staff->id}")->assertOk();
        $this->assertSoftDeleted('users', ['id' => $staff->id]);
    }

    public function test_staff_manage_only_students_in_their_own_department(): void
    {
        $designation = Designation::query()->create([
            'institution_id' => Institution::defaultId(),
            'name' => 'Department Coordinator',
            'slug' => 'department-coordinator-test',
            'status' => 'active',
            'permissions' => ['students.view', 'students.create'],
        ]);
        User::query()->where('email', 'staff@demo.com')->firstOrFail()->update(['designation_id' => $designation->id]);

        $staff = $this->tokenFor('staff@demo.com');
        $eceStudent = \App\Models\Student::query()->where('department_code', 'ECE')->firstOrFail();

        $this->withToken($staff)
            ->deleteJson("/api/v1/students/{$eceStudent->id}")
            ->assertForbidden()
            ->assertJsonPath('message', 'You can only manage students in your own department.');

        // Staff always create students in their own department, whatever they send.
        $this->withToken($staff)
            ->postJson('/api/v1/students', [
                'name' => 'Dept Student',
                'email' => 'dept.student@example.com',
                'departmentCode' => 'ECE',
                'year' => 'year_1',
                'gender' => 'prefer_not_to_say',
                'cgpa' => 8,
                'attendance' => 90,
                'feeStatus' => 'pending',
                'password' => 'secret123',
            ])
            ->assertCreated()
            ->assertJsonPath('student.departmentCode', 'CSE')
            ->assertJsonPath('student.mentor', 'Meera Nair')
            ->assertJsonPath('user', null);
    }

    public function test_companies_crud_and_student_apply(): void
    {
        $admin = $this->tokenFor('admin@demo.com');
        $payload = [
            'name' => 'Acme Labs',
            'role' => 'Software Engineer',
            'packageOffered' => '8 LPA',
            'driveDate' => '2026-12-01',
            'status' => 'open',
            'location' => 'Kochi',
            'type' => 'placement',
            'eligibleDepartments' => ['CSE'],
        ];

        $this->withToken($admin)
            ->postJson('/api/v1/companies', $payload)
            ->assertCreated()
            ->assertJsonFragment(['name' => 'Acme Labs', 'eligibleDepartments' => ['CSE']]);

        $company = Company::query()->where('name', 'Acme Labs')->firstOrFail();

        $this->withToken($admin)
            ->putJson("/api/v1/companies/{$company->id}", [...$payload, 'location' => 'Chennai'])
            ->assertOk()
            ->assertJsonFragment(['location' => 'Chennai']);

        $this->app['auth']->forgetGuards();
        $student = $this->tokenFor('student@demo.com');

        $this->withToken($student)->postJson("/api/v1/companies/{$company->id}/apply")->assertOk();
        $this->withToken($student)->postJson("/api/v1/companies/{$company->id}/apply")->assertOk();
        $this->assertSame(1, $company->fresh()->applicants);

        $this->app['auth']->forgetGuards();
        $this->withToken($admin)->deleteJson("/api/v1/companies/{$company->id}")->assertOk();
        $this->assertDatabaseMissing('company_applications', ['company_id' => $company->id]);
    }

    public function test_announcements_crud_and_audience_rules(): void
    {
        $admin = $this->tokenFor('admin@demo.com');
        $payload = [
            'title' => 'Board meeting',
            'summary' => 'Agenda shared by email.',
            'audience' => 'admin',
            'priority' => 'high',
            'category' => 'Governance',
        ];

        $this->withToken($admin)
            ->postJson('/api/v1/announcements', $payload)
            ->assertCreated()
            ->assertJsonFragment(['title' => 'Board meeting', 'postedBy' => 'Dr. Nandita Roy']);

        $announcement = Announcement::query()->where('title', 'Board meeting')->firstOrFail();

        $this->withToken($admin)
            ->putJson("/api/v1/announcements/{$announcement->id}", [...$payload, 'title' => 'Board meeting moved'])
            ->assertOk()
            ->assertJsonFragment(['title' => 'Board meeting moved']);

        $this->app['auth']->forgetGuards();
        $officer = $this->tokenFor('placement@demo.com');

        $this->withToken($officer)
            ->postJson('/api/v1/announcements', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('audience');

        $this->withToken($officer)
            ->postJson('/api/v1/announcements', [...$payload, 'audience' => 'students'])
            ->assertCreated();

        $this->app['auth']->forgetGuards();
        $this->withToken($admin)->deleteJson("/api/v1/announcements/{$announcement->id}")->assertOk();
        $this->assertDatabaseMissing('announcements', ['id' => $announcement->id]);
    }

    public function test_student_updates_own_resume_and_others_cannot(): void
    {
        $student = $this->tokenFor('student@demo.com');

        $response = $this->withToken($student)
            ->putJson('/api/v1/students/me/resume', [
                'template' => 'modern_ats',
                'headline' => '  Full-stack developer  ',
                'links' => ['https://github.com/rahul', '  https://rahul.dev '],
            ])
            ->assertOk();

        $this->assertSame('modern_ats', $response->json('data.students.0.resume.template'));
        $this->assertSame('Full-stack developer', $response->json('data.students.0.resume.headline'));
        $this->assertSame(['https://github.com/rahul', 'https://rahul.dev'], $response->json('data.students.0.resume.links'));

        $this->app['auth']->forgetGuards();
        $this->withToken($this->tokenFor('admin@demo.com'))
            ->putJson('/api/v1/students/me/resume', ['template' => 'modern_ats'])
            ->assertForbidden();
    }

    public function test_summary_returns_counts(): void
    {
        $this->withToken($this->tokenFor('admin@demo.com'))
            ->getJson('/api/v1/reports/summary')
            ->assertOk()
            ->assertJsonPath('students', 20)
            ->assertJsonStructure(['students', 'placed', 'placementReady', 'openDrives', 'departments', 'announcements', 'placementRate']);
    }

    private function tokenFor(string $email): string
    {
        return (string) $this->postJson('/api/v1/auth/login', ['email' => $email, 'password' => 'demo123'])
            ->assertOk()
            ->json('token');
    }
}
