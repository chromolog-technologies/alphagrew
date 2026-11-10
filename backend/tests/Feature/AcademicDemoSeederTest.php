<?php

namespace Tests\Feature;

use Database\Seeders\AcademicDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * The demo academic data: published results through the real publishing flow, a current
 * term at every review stage, and demo accounts whose dashboards read that data.
 */
class AcademicDemoSeederTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(); // Outside tests CampusDemoSeeder runs AcademicDemoSeeder itself.
        $this->seed(AcademicDemoSeeder::class);
    }

    public function test_seeds_published_results_and_a_current_term_in_progress(): void
    {
        $this->assertSame(24, DB::table('subjects')->count());
        $this->assertSame(24, DB::table('subject_allocations')->count());
        $this->assertSame(2, DB::table('result_publishing_logs')->count());

        // Every student has both past terms published, and a summary derived from them.
        $students = DB::table('students')->count();
        $this->assertSame($students * 2, DB::table('semester_results')->where('is_published', true)->count());
        $this->assertSame($students, DB::table('student_academic_summaries')->where('source', 'results')->count());

        $statuses = DB::table('mark_entries')->distinct()->pluck('status')->sort()->values()->all();
        $this->assertSame(['approved', 'draft', 'locked', 'submitted', 'verified'], $statuses);
        $this->assertTrue(DB::table('exams')->where('status', 'scheduled')->where('exam_date', '>', '2026-11-10')->exists());
        $this->assertGreaterThan(1000, DB::table('attendance')->count());
    }

    public function test_running_it_again_replaces_the_data_instead_of_duplicating_it(): void
    {
        $counts = fn () => collect(['subjects', 'exams', 'mark_entries', 'attendance', 'semester_results', 'designations', 'users'])
            ->mapWithKeys(fn (string $table) => [$table => DB::table($table)->count()])->all();
        $before = $counts();

        $this->seed(AcademicDemoSeeder::class);

        $this->assertSame($before, $counts());
    }

    public function test_demo_staff_accounts_open_their_role_dashboards_with_data(): void
    {
        foreach ([
            'staff@demo.com' => ['teacher', 'subjects'],
            'hod.cse@demo.com' => ['hod', 'department'],
            'exam@demo.com' => ['examination', 'institution'],
            'student@demo.com' => ['student', 'self'],
        ] as $email => [$template, $scope]) {
            $token = $this->postJson('/api/v1/auth/login', ['email' => $email, 'password' => 'demo123'])->assertOk()->json('token');
            $this->app['auth']->forgetGuards();

            $home = $this->withToken($token)->getJson('/api/v1/dashboards/home')->assertOk();
            $this->assertSame($template, $home->json('data.templateKey'), $email);

            $records = $this->withToken($token)->postJson('/api/v1/dashboards/query', [
                'spec' => ['source' => 'marks', 'measures' => [['field' => 'records', 'agg' => 'count']]],
            ])->assertOk();

            $this->assertSame($scope, $records->json('data.scope.level'), $email);
            $this->assertGreaterThan(0, $records->json('data.rows.0.m0'), "{$email} sees no marks");
        }
    }
}
