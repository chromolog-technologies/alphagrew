<?php

namespace Tests\Feature;

use App\Enums\MarkStatus;
use App\Notifications\MarksRejected;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Concerns\BuildsMarksFixtures;
use Tests\TestCase;

/**
 * Academic Results spec §3 and §7.1: marks.approve comes from the HOD / Exam Coordinator
 * designations, and HODs review only their own department's subjects.
 */
class MarkReviewPermissionTest extends TestCase
{
    use BuildsMarksFixtures;
    use RefreshDatabase;

    private int $entry;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->buildMarksFixtures();
        $this->entry = $this->markEntry('DS101', 'S1', 30, 45, MarkStatus::Submitted);
    }

    public function test_hod_with_marks_approve_verifies_with_moderation_and_approves(): void
    {
        $this->asUser('hod@dsc.test')
            ->postJson("/api/v1/mark-review/{$this->entry}/verify", [
                'remarks' => 'Moderation of +2 marks applied due to syllabus discrepancy in Q4',
                'adjustments' => ['extra_marks' => 2.0],
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'verified')
            ->assertJsonPath('data.extraMarks', 2)
            ->assertJsonPath('data.totalMarks', 77)
            ->assertJsonPath('data.grade', 'A')
            ->assertJsonPath('data.verifiedBy', $this->ids['hod@dsc.test']);

        $this->asUser('hod@dsc.test')
            ->postJson("/api/v1/mark-review/{$this->entry}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.approvedBy', $this->ids['hod@dsc.test']);
    }

    public function test_faculty_without_a_designation_is_forbidden(): void
    {
        foreach (['verify', 'approve', 'reject'] as $action) {
            $this->asUser('faculty@dsc.test')
                ->postJson("/api/v1/mark-review/{$this->entry}/{$action}", ['remarks' => 'x'])
                ->assertForbidden();
        }

        $this->asUser('faculty@dsc.test')
            ->postJson('/api/v1/mark-review/bulk-approve', ['subjectId' => $this->ids['subjects']['DS101']])
            ->assertForbidden();

        $this->assertSame('submitted', $this->entryStatus($this->entry));
    }

    public function test_hod_cannot_review_another_departments_marks(): void
    {
        $response = $this->asUser('hod@cse.test')
            ->postJson("/api/v1/mark-review/{$this->entry}/verify")
            ->assertForbidden();

        $this->assertMessage($response, 'You can only verify marks for your own department (CSE)');

        // ...and does not see them in the review queue.
        $this->asUser('hod@cse.test')
            ->getJson('/api/v1/mark-review/get-submitted-marks')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_exam_coordinator_reviews_any_department(): void
    {
        $this->asUser('coordinator@ece.test')
            ->getJson('/api/v1/mark-review/get-submitted-marks')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('stats.submitted', 1);

        $this->asUser('coordinator@ece.test')->postJson("/api/v1/mark-review/{$this->entry}/verify")->assertOk();
        $this->asUser('coordinator@ece.test')->postJson("/api/v1/mark-review/{$this->entry}/approve")->assertOk();

        $this->assertSame('approved', $this->entryStatus($this->entry));
    }

    public function test_stages_cannot_be_skipped(): void
    {
        $this->asUser('hod@dsc.test')
            ->postJson("/api/v1/mark-review/{$this->entry}/approve")
            ->assertUnprocessable();

        $locked = $this->markEntry('DS101', 'S2', 30, 45, MarkStatus::Locked);
        $this->asUser('hod@dsc.test')->postJson("/api/v1/mark-review/{$locked}/verify")->assertUnprocessable();
        $this->asUser('hod@dsc.test')->postJson("/api/v1/mark-review/{$locked}/reject", ['remarks' => 'Wrong'])->assertUnprocessable();

        $this->assertSame('submitted', $this->entryStatus($this->entry));
        $this->assertSame('locked', $this->entryStatus($locked));
    }

    public function test_rejection_needs_remarks_returns_to_draft_and_alerts_the_faculty(): void
    {
        $this->asUser('hod@dsc.test')
            ->postJson("/api/v1/mark-review/{$this->entry}/reject")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('remarks');

        $this->asUser('hod@dsc.test')
            ->postJson("/api/v1/mark-review/{$this->entry}/reject", ['remarks' => 'External marks do not match the answer sheet'])
            ->assertOk()
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.remarks', 'External marks do not match the answer sheet');

        $notification = DB::table('notifications')->where('notifiable_id', $this->ids['faculty@dsc.test'])->first();
        $this->assertNotNull($notification);
        $this->assertSame(MarksRejected::class, $notification->type);
        $this->assertSame($this->entry, json_decode($notification->data, true)['markEntryId']);

        // The faculty can correct the marks again.
        $payload = $this->draftPayload('DS101');
        $payload['entries'] = [['studentId' => $this->ids['students']['S1'], 'internalMarks' => 30, 'externalMarks' => 50]];
        $this->asUser('faculty@dsc.test')->postJson('/api/v1/mark-entries/save-draft', $payload)->assertOk();
    }

    public function test_bulk_approve_approves_only_verified_entries(): void
    {
        $verified = [
            $this->markEntry('DS101', 'S2', 30, 45, MarkStatus::Verified),
            $this->markEntry('DS101', 'S3', 30, 45, MarkStatus::Verified),
        ];

        $this->asUser('hod@dsc.test')
            ->postJson('/api/v1/mark-review/bulk-approve', ['subjectId' => $this->ids['subjects']['DS101']])
            ->assertOk()
            ->assertJsonPath('data.approvedCount', 2);

        $this->assertSame(['approved', 'approved'], array_map(fn (int $id) => $this->entryStatus($id), $verified));
        $this->assertSame('submitted', $this->entryStatus($this->entry));
    }

    public function test_students_cannot_open_staff_mark_sheets(): void
    {
        $this->asUser('student@demo.com')->getJson('/api/v1/mark-entries')->assertForbidden();
        $this->asUser('student@demo.com')->getJson('/api/v1/mark-review/get-submitted-marks')->assertForbidden();
        $this->asUser('student@demo.com')->getJson('/api/v1/result-publishing/logs')->assertForbidden();
    }
}
