<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\VerifyAccountNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Tests\Feature\Concerns\BuildsMarksFixtures;
use Tests\TestCase;

/**
 * CSV imports of students and staff: validation per row, dry runs, setup emails, permissions.
 */
class BulkImportTest extends TestCase
{
    use BuildsMarksFixtures;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->buildMarksFixtures();
        Notification::fake();
    }

    public function test_student_import_checks_every_row_and_dry_runs_save_nothing(): void
    {
        $csv = "\xEF\xBB\xBFName,Email,Department Code,Year,Gender\n"
            ."Asha Menon,asha@import.test,dsc,year_1,female\n"
            ."Bad Dept,bad@import.test,NOPE,year_1,female\n"
            ."Asha Again,ASHA@import.test,DSC,year_1,female\n"
            ."Existing,student@demo.com,DSC,year_9,female\n"
            .",,,,\n";

        $report = $this->asUser('admin@demo.com')->post('/api/v1/imports/students', ['file' => $this->csv($csv), 'dryRun' => 1])
            ->assertOk()
            ->json('data');

        $this->assertTrue($report['dryRun']);
        $this->assertSame(4, $report['total'], 'Blank lines are skipped.');
        $this->assertSame(1, $report['valid']);
        $this->assertSame(0, $report['created']);
        $failures = collect($report['failed'])->keyBy('row');
        $this->assertArrayHasKey('departmentCode', $failures[3]['errors']);
        $this->assertStringContainsString('more than once', $failures[4]['errors']['email']);
        $this->assertArrayHasKey('email', $failures[5]['errors']);
        $this->assertArrayHasKey('year', $failures[5]['errors']);
        $this->assertSame(0, DB::table('students')->where('email', 'asha@import.test')->count());

        $report = $this->asUser('admin@demo.com')->post('/api/v1/imports/students', ['file' => $this->csv($csv)])->json('data');
        $this->assertSame(1, $report['created']);
        $student = DB::table('students')->where('email', 'asha@import.test')->first();
        $this->assertSame('DSC', $student->department_code);

        // The new account sets its own password from an email.
        Notification::assertSentTo(User::query()->withoutGlobalScopes()->find($student->user_id), VerifyAccountNotification::class);
    }

    public function test_staff_import_resolves_designations_and_is_admin_only(): void
    {
        DB::table('designations')->where('slug', 'hod-test')->update(['name' => 'Head of Department']);
        $csv = "name,email,department_code,designation,role\n"
            ."Ravi Kumar,ravi@import.test,DSC,head of department,staff\n"
            ."Nope,nope@import.test,DSC,Wizard,staff\n";

        $this->asUser('faculty@dsc.test')->post('/api/v1/imports/staff', ['file' => $this->csv($csv)])->assertForbidden();

        $report = $this->asUser('admin@demo.com')->post('/api/v1/imports/staff', ['file' => $this->csv($csv)])->assertOk()->json('data');
        $this->assertSame(1, $report['created']);
        $this->assertStringContainsString('No designation with this name', $report['failed'][0]['errors']['designationId']);

        $ravi = User::query()->withoutGlobalScopes()->where('email', 'ravi@import.test')->firstOrFail();
        $this->assertSame('DSC', $ravi->department_code);
        $this->assertSame('staff', $ravi->role);
        Notification::assertSentTo($ravi, VerifyAccountNotification::class);
    }

    public function test_templates_and_file_validation(): void
    {
        $response = $this->asUser('admin@demo.com')->get('/api/v1/imports/students/template')->assertOk();
        $this->assertStringStartsWith('name,email,department_code,year,gender', $response->streamedContent());

        $this->asUser('admin@demo.com')->postJson('/api/v1/imports/students', [])->assertJsonValidationErrors('file');
    }

    private function csv(string $content): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('import.csv', $content);
    }
}
