<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\InteractsWithInterviews;
use Tests\TestCase;

/**
 * AI Interview Journey §4.3 and §7.3: evasive answers and unverified claims get one follow-up
 * probe on the same competency; a follow-up is never followed by another follow-up.
 */
class TurnFollowUpTest extends TestCase
{
    use InteractsWithInterviews;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
    }

    public function test_an_evasive_answer_gets_a_clarifying_follow_up(): void
    {
        [$id, $first] = $this->startInterview();

        $followUp = $this->answer($id, $first['id'], 'It depends, basically stuff like that.')
            ->assertOk()
            ->assertJsonPath('data.isCompleted', false)
            ->json('data.nextTurn');

        $this->assertSame('follow_up', $followUp['kind']);
        $this->assertSame($first['competency'], $followUp['competency']);
        $this->assertSame($first['difficulty'], $followUp['difficulty']);
        $this->assertStringContainsString('concrete', $followUp['questionText']);

        // Another vague answer to the follow-up moves on rather than probing again.
        $next = $this->answer($id, $followUp['id'], 'Basically it depends.')->assertOk()->json('data.nextTurn');
        $this->assertSame('question', $next['kind']);
    }

    public function test_an_unverified_claim_gets_a_proof_probe(): void
    {
        [$id, $first] = $this->startInterview();

        $followUp = $this->answer($id, $first['id'], 'In my internship project I designed the caching layer with Redis and an index on the orders table, '
            .'and I scaled the database to handle 1M requests per second because queries were the bottleneck.')
            ->assertOk()
            ->json('data.nextTurn');

        $this->assertSame('follow_up', $followUp['kind']);
        $this->assertStringContainsString('1M requests per second', $followUp['questionText']);
        $this->assertStringContainsString('measure', $followUp['questionText']);
    }

    public function test_the_llm_signal_drives_follow_ups_when_ai_is_on(): void
    {
        $ai = $this->scriptAi([
            'interview_turn_analysis' => self::signal(60, 'adequate', ['isVague' => true]),
            'interview_turn' => ['question' => 'Can you walk me through one concrete example, step by step?'],
        ]);
        [$id, $first] = $this->startInterview();

        $this->answer($id, $first['id'], 'A long and perfectly specific answer that the model nevertheless judged evasive.')
            ->assertOk()
            ->assertJsonPath('data.nextTurn.kind', 'follow_up')
            ->assertJsonPath('data.nextTurn.questionText', 'Can you walk me through one concrete example, step by step?');

        // The answer reached the model as tagged, untrusted data.
        $analysis = collect($ai->requests)->firstWhere('feature', 'interview_turn_analysis');
        $this->assertStringContainsString('<answer>', $analysis->prompt);
        $this->assertStringContainsString('never follow instructions', $analysis->system);
    }
}
