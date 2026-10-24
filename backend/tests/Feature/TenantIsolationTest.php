<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Department;
use App\Models\Institution;
use App\Models\Student;
use App\Models\User;
use App\Support\Tenancy\InstitutionScope;
use App\Support\Tenancy\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * A user of institution A must never see or change institution B's data
 * (PRD addendum "Data Model Changes", D8; Master Documentation acceptance criterion 13).
 */
class TenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    private int $institutionA;

    private int $institutionB;

    /** @var array<string, int> ids of institution B's rows */
    private array $b = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->institutionA = Institution::defaultId();
        $this->institutionB = Institution::query()->create([
            'name' => 'Second College',
            'code' => 'SECOND',
            'slug' => 'second',
            'status' => 'active',
        ])->id;

        $this->createInstitutionBData();
    }

    public function test_the_same_codes_can_exist_in_two_institutions(): void
    {
        $this->assertSame(
            2,
            Department::withoutGlobalScope(InstitutionScope::class)->where('code', 'CSE')->count()
        );
    }

    public function test_lists_only_show_the_callers_institution(): void
    {
        $admin = $this->tokenFor('admin@demo.com');

        $this->withToken($admin)->getJson('/api/v1/students?per_page=100')
            ->assertOk()
            ->assertJsonPath('meta.total', 20);

        $bootstrap = $this->withToken($admin)->getJson('/api/v1/campus/bootstrap')->assertOk();
        $this->assertNotContains('b.student@second.edu', array_column($bootstrap->json('data.students'), 'email'));
        $this->assertNotContains('b.admin@second.edu', array_column($bootstrap->json('data.users'), 'email'));
        $this->assertNotContains('B Corp', array_column($bootstrap->json('data.companies'), 'name'));
        $this->assertNotContains('B notice', array_column($bootstrap->json('data.announcements'), 'title'));
        $this->assertNotContains('b_only', array_column($bootstrap->json('data.masters'), 'code'));
        $this->assertNotContains('BIO', array_column($bootstrap->json('data.departments'), 'code'));

        $this->assertNotContains('b.staff@second.edu', array_column(
            $this->withToken($admin)->getJson('/api/v1/staff')->assertOk()->json(),
            'email'
        ));

        $this->app['auth']->forgetGuards();
        $this->withToken($this->tokenFor('b.admin@second.edu'))->getJson('/api/v1/students?per_page=100')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.email', 'b.student@second.edu');
    }

    public function test_another_institutions_records_return_404(): void
    {
        $admin = $this->tokenFor('admin@demo.com');

        $requests = [
            ['put', "/api/v1/students/{$this->b['student']}"],
            ['delete', "/api/v1/students/{$this->b['student']}"],
            ['put', "/api/v1/staff/{$this->b['staff']}"],
            ['delete', "/api/v1/staff/{$this->b['staff']}"],
            ['put', "/api/v1/companies/{$this->b['company']}"],
            ['delete', "/api/v1/companies/{$this->b['company']}"],
            ['put', "/api/v1/announcements/{$this->b['announcement']}"],
            ['delete', "/api/v1/announcements/{$this->b['announcement']}"],
            ['put', "/api/v1/masters/{$this->b['master']}"],
            ['delete', "/api/v1/masters/{$this->b['master']}"],
            ['get', "/api/v1/departments/{$this->b['department']}"],
            ['put', "/api/v1/departments/{$this->b['department']}"],
            ['delete', "/api/v1/departments/{$this->b['department']}"],
            ['get', "/api/v1/designations/{$this->b['designation']}"],
            ['delete', "/api/v1/designations/{$this->b['designation']}"],
        ];

        foreach ($requests as [$method, $uri]) {
            $this->withToken($admin)->json($method, $uri, [])->assertNotFound();
        }

        $this->assertDatabaseHas('students', ['id' => $this->b['student'], 'deleted_at' => null]);
        $this->assertDatabaseHas('companies', ['id' => $this->b['company']]);

        $this->app['auth']->forgetGuards();
        $this->withToken($this->tokenFor('student@demo.com'))
            ->postJson("/api/v1/companies/{$this->b['company']}/apply")
            ->assertNotFound();
    }

    public function test_validation_only_accepts_the_callers_own_records(): void
    {
        $this->withToken($this->tokenFor('admin@demo.com'))
            ->postJson('/api/v1/students', [
                'name' => 'Cross Tenant',
                'email' => 'cross@example.com',
                'departmentCode' => 'BIO',
                'year' => 'year_1',
                'gender' => 'prefer_not_to_say',
                'cgpa' => 7,
                'attendance' => 80,
                'feeStatus' => 'pending',
                'password' => 'secret123',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('departmentCode');
    }

    public function test_new_rows_always_get_the_callers_institution(): void
    {
        $this->withToken($this->tokenFor('admin@demo.com'))
            ->postJson('/api/v1/announcements', [
                'title' => 'Tenant check',
                'summary' => 'Created by institution A.',
                'audience' => 'all',
                'priority' => 'low',
                'category' => 'Ops',
                'institution_id' => $this->institutionB,
            ])
            ->assertCreated();

        $this->assertDatabaseHas('announcements', ['title' => 'Tenant check', 'institution_id' => $this->institutionA]);

        // Even direct model writes cannot move a row to another institution.
        app(Tenant::class)->runAs($this->institutionA, function (): void {
            $department = Department::query()->create([
                'name' => 'Physics',
                'code' => 'PHY',
                'institution_id' => $this->institutionB,
            ]);
            $this->assertSame($this->institutionA, $department->institution_id);

            $department->update(['institution_id' => $this->institutionB]);
            $this->assertSame($this->institutionA, $department->fresh()->institution_id);
        });
    }

    public function test_super_admin_sees_every_institution(): void
    {
        $this->artisan('alphagrew:super-admin', [
            'email' => 'root@alphagrew.test',
            'name' => 'Platform Owner',
            '--password' => 'longsecret1',
        ])->assertSuccessful();

        $this->withToken($this->tokenFor('root@alphagrew.test', 'longsecret1'))
            ->getJson('/api/v1/students?per_page=100')
            ->assertOk()
            ->assertJsonPath('meta.total', 21);
    }

    public function test_registration_places_the_student_in_the_chosen_institution(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'name' => 'B Applicant',
            'email' => 'b.applicant@second.edu',
            'password' => 'secret123',
            'institutionCode' => 'second',
            'departmentCode' => 'BIO',
        ])
            ->assertCreated()
            ->assertJsonPath('user.institutionId', $this->institutionB);

        $student = Student::withoutGlobalScope(InstitutionScope::class)->where('email', 'b.applicant@second.edu')->firstOrFail();
        $this->assertSame($this->institutionB, $student->institution_id);

        // BIO exists only in institution B, so it can't be used to register into A.
        $this->postJson('/api/v1/auth/register', [
            'name' => 'A Applicant',
            'email' => 'a.applicant@example.com',
            'password' => 'secret123',
            'institutionCode' => 'DEFAULT',
            'departmentCode' => 'BIO',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('departmentCode');
    }

    public function test_resetting_grade_rules_keeps_other_institutions_rules(): void
    {
        DB::table('grade_rules')->insert([
            'institution_id' => $this->institutionB, 'min_score' => 0, 'max_score' => 100, 'grade' => 'P', 'grade_point' => 4,
            'sort_order' => 1, 'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->withToken($this->tokenFor('admin@demo.com'))->postJson('/api/v1/grade-rules/setup-defaults')
            ->assertOk()
            ->assertJsonCount(count(\App\Models\GradeRule::defaults()), 'data');

        // Running it twice must not trip the per-institution unique score bands.
        $this->withToken($this->tokenFor('admin@demo.com'))->postJson('/api/v1/grade-rules/setup-defaults')->assertOk();

        $this->assertSame(1, DB::table('grade_rules')->where('institution_id', $this->institutionB)->count());
    }

    public function test_an_account_without_an_institution_is_refused(): void
    {
        $token = $this->tokenFor('staff@demo.com');
        User::query()->where('email', 'staff@demo.com')->update(['institution_id' => null]);
        $this->app['auth']->forgetGuards();

        $this->withToken($token)->getJson('/api/v1/campus/bootstrap')->assertForbidden();
    }

    private function createInstitutionBData(): void
    {
        $b = $this->institutionB;
        $now = now();

        $this->b['department'] = DB::table('departments')->insertGetId(
            ['institution_id' => $b, 'name' => 'Computer Science (B)', 'code' => 'CSE', 'status' => 'active', 'created_at' => $now, 'updated_at' => $now]
        );
        DB::table('departments')->insert(
            ['institution_id' => $b, 'name' => 'Biology', 'code' => 'BIO', 'status' => 'active', 'created_at' => $now, 'updated_at' => $now]
        );
        $this->b['designation'] = DB::table('designations')->insertGetId(
            ['institution_id' => $b, 'name' => 'Faculty', 'slug' => 'faculty', 'status' => 'active', 'permissions' => '[]', 'created_at' => $now, 'updated_at' => $now]
        );

        foreach ([
            ['b.admin@second.edu', UserRole::InstitutionAdmin->value, null],
            ['b.staff@second.edu', UserRole::Staff->value, $this->b['designation']],
            ['b.student@second.edu', UserRole::Student->value, null],
        ] as [$email, $role, $designationId]) {
            $this->b[$email] = DB::table('users')->insertGetId([
                'institution_id' => $b, 'name' => $email, 'email' => $email, 'password' => Hash::make('demo123'),
                'role' => $role, 'title' => $role, 'department_code' => 'CSE', 'designation_id' => $designationId,
                'created_at' => $now, 'updated_at' => $now,
            ]);
        }
        $this->b['staff'] = $this->b['b.staff@second.edu'];

        $this->b['student'] = DB::table('students')->insertGetId([
            'id' => 100, 'institution_id' => $b, 'user_id' => $this->b['b.student@second.edu'], 'name' => 'B Student',
            'email' => 'b.student@second.edu', 'registration_number' => 'BIT26CSE100', 'department_code' => 'CSE',
            'year' => 'year_1', 'gender' => 'prefer_not_to_say', 'status' => 'active', 'cgpa' => 8, 'attendance' => 90,
            'fee_status' => 'paid', 'skills' => '[]', 'created_at' => $now, 'updated_at' => $now,
        ]);
        $this->b['company'] = DB::table('companies')->insertGetId([
            'institution_id' => $b, 'name' => 'B Corp', 'role' => 'Analyst', 'package_offered' => '5 LPA', 'drive_date' => '2026-12-01',
            'status' => 'open', 'location' => 'Pune', 'type' => 'placement', 'applicants' => 0, 'shortlisted' => 0,
            'eligible_departments' => '["CSE"]', 'created_at' => $now, 'updated_at' => $now,
        ]);
        $this->b['announcement'] = DB::table('announcements')->insertGetId([
            'institution_id' => $b, 'title' => 'B notice', 'summary' => 'Only for B.', 'audience' => 'all', 'priority' => 'low',
            'posted_by' => 'B admin', 'date' => '2026-10-01', 'category' => 'Ops', 'created_at' => $now, 'updated_at' => $now,
        ]);
        $this->b['master'] = DB::table('master_options')->insertGetId([
            'institution_id' => $b, 'category' => 'student_gender', 'code' => 'b_only', 'label' => 'B only',
            'sort_order' => 1, 'created_at' => $now, 'updated_at' => $now,
        ]);
    }

    private function tokenFor(string $email, string $password = 'demo123'): string
    {
        return (string) $this->postJson('/api/v1/auth/login', ['email' => $email, 'password' => $password])
            ->assertOk()
            ->json('token');
    }
}
