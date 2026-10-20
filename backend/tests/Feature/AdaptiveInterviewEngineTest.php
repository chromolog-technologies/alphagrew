<?php

namespace Tests\Feature;

use App\Models\AiInterview;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\InteractsWithInterviews;
use Tests\TestCase;

/**
 * AI Interview Journey §4.4 and §7.2: difficulty rises after pairs of strong answers and drops
 * (with a pivot to fundamentals) after a failing one.
 */
class AdaptiveInterviewEngineTest extends TestCase
{
    use InteractsWithInterviews;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
    }

    public function test_five_strong_answers_raise_difficulty_from_2_to_4(): void
    {
        $this->scriptAi(['interview_turn_analysis' => self::signal(92, 'profound')]);
        [$id, $turn] = $this->startInterview();

        $this->assertSame(2, $turn['difficulty']);
        $difficulties = [$turn['difficulty']];

        for ($i = 0; $i < 5; $i++) {
            $turn = $this->answer($id, $turn['id'], 'A detailed, correct answer.')
                ->assertOk()
                ->assertJsonPath('data.isCompleted', false)
                ->json('data.nextTurn');
            $difficulties[] = $turn['difficulty'];
        }

        // +1 after each pair of strong answers at the same level; the pair restarts after a change.
        $this->assertSame([2, 2, 3, 3, 4, 4], $difficulties);
        $this->assertSame(4, AiInterview::query()->findOrFail($id)->current_difficulty);
    }

    public function test_a_failing_answer_lowers_difficulty_and_pivots_to_fundamentals(): void
    {
        // AI off: the rule-based analyser recognises "I don't know".
        [$id, $first] = $this->startInterview(['baseDifficulty' => 3]);

        $next = $this->answer($id, $first['id'], "Sorry, I don't know.")
            ->assertOk()
            ->json('data.nextTurn');

        $this->assertSame('question', $next['kind']);
        $this->assertSame(2, $next['difficulty']);
        $this->assertSame($first['competency'].' — Fundamentals', $next['competency']);
        $this->assertSame(2, AiInterview::query()->findOrFail($id)->current_difficulty);
    }

    public function test_difficulty_never_leaves_1_to_5(): void
    {
        $this->scriptAi(['interview_turn_analysis' => self::signal(20, 'shallow', ['saysDontKnow' => true])]);
        [$id, $turn] = $this->startInterview(['baseDifficulty' => 1]);

        for ($i = 0; $i < 3; $i++) {
            $turn = $this->answer($id, $turn['id'], "I don't know.")->assertOk()->json('data.nextTurn');
            $this->assertSame(1, $turn['difficulty']);
        }
    }

    public function test_the_interview_completes_after_the_planned_questions(): void
    {
        $this->scriptAi(['interview_turn_analysis' => self::signal(70, 'adequate')]);
        [$id, $turn] = $this->startInterview(['timeLimitMinutes' => 12]); // 4 planned questions

        $answers = 0;
        while ($turn !== null && $answers < 10) {
            $response = $this->answer($id, $turn['id'], 'A reasonable answer.')->assertOk();
            $turn = $response->json('data.nextTurn');
            $answers++;
        }

        $this->assertSame(4, $answers);
        $response->assertJsonPath('data.isCompleted', true);

        // Finishing queues the evaluation, which runs synchronously in tests.
        $this->asUser()->getJson("/api/v1/interviews/{$id}")
            ->assertOk()
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.endReason', 'completed')
            ->assertJsonCount(4, 'data.turns')
            ->assertJsonPath('data.turns.0.quickSignal.technicalScore', 70);
    }
}
