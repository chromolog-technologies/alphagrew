<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Concerns\BuildsMarksFixtures;
use Tests\TestCase;

/**
 * Campus fees as record-keeping: structures, dues per student, payments with receipts, voids,
 * the student's own view, and permissions.
 */
class FeeTest extends TestCase
{
    use BuildsMarksFixtures;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->buildMarksFixtures();
    }

    public function test_dues_payments_receipts_and_voids(): void
    {
        // Due next month, so open balances show as partial rather than overdue.
        $structure = $this->structure(now()->addMonth()->toDateString());
        $student = $this->ids['students']['S1'];

        $this->asUser('admin@demo.com')->postJson("/api/v1/fee-structures/{$structure}/assign", ['studentIds' => [$student, $this->ids['students']['S2']]])
            ->assertOk()
            ->assertJsonPath('data.assigned', 2);
        // Assigning again skips students already billed.
        $this->asUser('admin@demo.com')->postJson("/api/v1/fee-structures/{$structure}/assign", ['studentIds' => [$student]])->assertJsonPath('data.skipped', 1);

        $fee = DB::table('student_fees')->where('student_id', $student)->value('id');
        $this->asUser('admin@demo.com')->postJson("/api/v1/student-fees/{$fee}/payments", ['amount' => 60000, 'method' => 'upi'])
            ->assertJsonValidationErrors('amount');

        $this->asUser('admin@demo.com')->postJson("/api/v1/student-fees/{$fee}/payments", ['amount' => 20000, 'method' => 'upi', 'reference' => 'UPI-1'])
            ->assertCreated()
            ->assertJsonPath('data.status', 'partial')
            ->assertJsonPath('data.balance', 30000)
            ->assertJsonPath('data.payments.0.method', 'upi');
        $this->assertMatchesRegularExpression('/^RCPT-\d{4}-\d{6}$/', DB::table('student_fee_payments')->value('receipt_number'));

        $paid = $this->asUser('admin@demo.com')->postJson("/api/v1/student-fees/{$fee}/payments", ['amount' => 30000, 'method' => 'cash'])
            ->assertJsonPath('data.status', 'paid')
            ->json('data');
        $this->assertSame('pending', DB::table('students')->where('id', $this->ids['students']['S2'])->value('fee_status'));
        $this->assertSame('paid', DB::table('students')->where('id', $student)->value('fee_status'));

        // A wrong payment is voided, never deleted, and stops counting.
        $cash = $paid['payments'][1]['id'];
        $this->asUser('admin@demo.com')->postJson("/api/v1/fee-payments/{$cash}/void", [])->assertJsonValidationErrors('reason');
        $this->asUser('admin@demo.com')->postJson("/api/v1/fee-payments/{$cash}/void", ['reason' => 'Entered twice'])
            ->assertOk()
            ->assertJsonPath('data.status', 'partial')
            ->assertJsonPath('data.payments.1.voided', true);
        $this->assertSame('pending', DB::table('students')->where('id', $student)->value('fee_status'));

        // With payments recorded the structure cannot be deleted.
        $this->asUser('admin@demo.com')->deleteJson("/api/v1/fee-structures/{$structure}")->assertStatus(409);
    }

    public function test_listing_filters_and_structure_changes_update_dues(): void
    {
        $structure = $this->structure();
        $this->asUser('admin@demo.com')->postJson("/api/v1/fee-structures/{$structure}/assign", ['studentIds' => [$this->ids['students']['S1']]]);

        $this->asUser('admin@demo.com')->getJson('/api/v1/fee-structures')->assertJsonPath('data.0.totalFee', 50000)->assertJsonPath('data.0.studentsBilled', 1);
        $this->asUser('admin@demo.com')->getJson('/api/v1/student-fees?status=overdue')->assertJsonCount(1, 'data');
        $this->asUser('admin@demo.com')->getJson('/api/v1/student-fees?search=S1')->assertJsonCount(1, 'data');

        $this->asUser('admin@demo.com')->putJson("/api/v1/fee-structures/{$structure}", [...$this->payload(), 'tuitionFee' => 30000])
            ->assertJsonPath('data.totalFee', 35000);
        $this->assertEquals(35000, DB::table('student_fees')->value('amount_due'));
    }

    public function test_students_see_their_own_fees_and_permissions_are_enforced(): void
    {
        $structure = $this->structure();
        $demo = DB::table('students')->where('email', 'student@demo.com')->value('id');
        $this->asUser('admin@demo.com')->postJson("/api/v1/fee-structures/{$structure}/assign", ['studentIds' => [$demo, $this->ids['students']['S1']]]);

        $this->asUser('student@demo.com')->getJson('/api/v1/students/me/fees')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.totalDue', 50000);
        $other = DB::table('student_fees')->where('student_id', $this->ids['students']['S1'])->value('id');
        $this->asUser('student@demo.com')->getJson("/api/v1/student-fees/{$other}")->assertForbidden();

        $this->asUser('faculty@dsc.test')->getJson('/api/v1/student-fees')->assertForbidden();
        $this->asUser('faculty@dsc.test')->postJson("/api/v1/student-fees/{$other}/payments", ['amount' => 10, 'method' => 'cash'])->assertForbidden();
    }

    private function structure(?string $dueDate = null): int
    {
        return $this->asUser('admin@demo.com')->postJson('/api/v1/fee-structures', [...$this->payload(), ...($dueDate ? ['dueDate' => $dueDate] : [])])
            ->assertCreated()
            ->assertJsonPath('data.totalFee', 50000)
            ->json('data.id');
    }

    /** @return array<string, mixed> */
    private function payload(): array
    {
        return [
            'academicYearId' => DB::table('academic_years')->where('code', 'AY2526')->value('id'),
            'courseId' => DB::table('courses')->where('code', 'BTDS')->value('id'),
            'semester' => 1,
            'tuitionFee' => 45000,
            'examFee' => 5000,
            // In the past, so the dues are overdue.
            'dueDate' => now()->subWeek()->toDateString(),
        ];
    }
}
