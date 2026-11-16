<?php

namespace Tests\Feature;

use App\Enums\MarkStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\BuildsMarksFixtures;
use Tests\TestCase;

/**
 * CSV exports: content, scoping to what the user can see, published results only, permissions.
 */
class ExportTest extends TestCase
{
    use BuildsMarksFixtures;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->buildMarksFixtures();
    }

    public function test_students_export_is_limited_to_visible_students(): void
    {
        $all = $this->csv('admin@demo.com', '/api/v1/exports/students');
        $dsc = $this->csv('hod@dsc.test', '/api/v1/exports/students');

        $this->assertSame('registration_number', $all[0][0]);
        $this->assertGreaterThan(count($dsc), count($all));
        $this->assertSame(['DSC'], array_values(array_unique(array_column(array_slice($dsc, 1), 3))), 'An HOD exports their own department only.');
    }

    public function test_results_export_contains_published_marks_only(): void
    {
        $this->markEntry('DS101', 'S1', 30, 50, MarkStatus::Locked);
        $this->markEntry('DS101', 'S2', 20, 40, MarkStatus::Draft);

        $rows = $this->csv('admin@demo.com', '/api/v1/exports/results');

        $this->assertCount(2, $rows, 'Header plus the one published entry.');
        $this->assertSame(['DS101', '80'], [$rows[1][0], (string) (int) $rows[1][6]]);
    }

    public function test_attendance_export_needs_a_date_range_and_students_cannot_export(): void
    {
        $this->asUser('admin@demo.com')->getJson('/api/v1/exports/attendance')->assertJsonValidationErrors(['from', 'to']);
        $this->assertSame('date', $this->csv('admin@demo.com', '/api/v1/exports/attendance?from=2026-01-01&to=2026-12-31')[0][0]);

        $this->asUser('student@demo.com')->get('/api/v1/exports/results')->assertForbidden();
        $this->asUser('student@demo.com')->get('/api/v1/exports/staff')->assertForbidden();
        $this->asUser('admin@demo.com')->get('/api/v1/exports/salaries')->assertNotFound();
    }

    /** @return list<list<string>> */
    private function csv(string $email, string $url): array
    {
        $response = $this->asUser($email)->get($url)->assertOk();
        $this->assertStringContainsString('text/csv', $response->headers->get('Content-Type'));
        $content = preg_replace('/^\xEF\xBB\xBF/', '', $response->streamedContent());

        return array_map('str_getcsv', array_values(array_filter(explode("\n", $content))));
    }
}
