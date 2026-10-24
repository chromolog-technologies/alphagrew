<?php

namespace Tests\Feature;

use App\Events\InterviewEvaluated;
use App\Models\AiInterviewEvaluation;
use App\Models\ReadinessScore;
use App\Models\Student;
use App\Services\Ai\InterviewEvaluator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\InteractsWithInterviews;
use Tests\TestCase;

/**
 * AI Interview Journey §5 and §7.5: finishing an interview evaluates it, writes the skill gap
 * report and recommendations, and appends to the student's readiness history.
 */
class ReadinessIntegrationTest extends TestCase
{
    use InteractsWithInterviews;
    use RefreshDatabase;

    private Student $student;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->student = Student::query()->where('email', 'student@demo.com')->firstOrFail();
    }

    public function test_finishing_an_interview_evaluates_it_and_updates_readiness(): void
    {
        $this->scriptAi(['interview_turn_analysis' => self::signal(80, 'adequate')]);
        [$id, $turn] = $this->startInterview();

        $this->asUser()->getJson("/api/v1/interviews/{$id}/evaluation")->assertNotFound();

        $this->answer($id, $turn['id'], 'An answer.')->assertOk();
        $this->answer($id, $this->asUser()->getJson("/api/v1/interviews/{$id}")->json('data.turns.1.id'), 'Another answer.')->assertOk();

        $before = ReadinessScore::query()->where('student_id', $this->student->id)->count();

        $this->asUser()->postJson("/api/v1/interviews/{$id}/finish", ['reason' => 'user_ended'])
            ->assertStatus(202)
            ->assertJsonPath('data.status', 'evaluating');

        // The queued chain ran synchronously: evaluation → skill gap + recommendations, readiness.
        $evaluation = $this->asUser()->getJson("/api/v1/interviews/{$id}/evaluation")
            ->assertOk()
            ->assertJsonPath('data.modelName', 'rules-1.0')
            ->assertJsonPath('data.dimensionWeights.technicalDepth', 30)
            ->assertJsonCount(2, 'data.perTurnEvaluations')
            ->json('data');

        $expected = (int) round(collect(InterviewEvaluator::DIMENSIONS)->map(fn ($w, $d) => $evaluation['dimensionScores'][$d] * $w / 100)->sum());
        $this->assertSame($expected, $evaluation['overallScore']);

        $this->asUser()->getJson("/api/v1/interviews/{$id}")
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.endReason', 'user_ended');

        $gap = $this->asUser()->getJson("/api/v1/interviews/{$id}/skill-gap")
            ->assertOk()
            ->assertJsonPath('data.targetRole', 'Backend Engineer')
            ->json('data');
        $byStatus = collect($gap['competencies'])->groupBy('status');
        $this->assertTrue($byStatus->has('missing') || $byStatus->has('gap') || $byStatus->has('unverified'));
        $this->assertSame('interview', collect($gap['competencies'])->firstWhere('skill', $turn['competency'])['evidence']);

        $this->asUser()->getJson('/api/v1/students/me/recommendations')
            ->assertOk()
            ->assertJsonPath('data.0.priority', 'high');

        $history = ReadinessScore::query()->where('student_id', $this->student->id)->orderBy('id')->get();
        $this->assertSame($before + 1, $history->count());
        $this->assertSame('interview_evaluated', $history->last()->trigger);
        $this->assertEquals(AiInterviewEvaluation::query()->value('overall_score'), $history->last()->components['interview']['score']);
    }

    public function test_interview_evaluated_appends_to_readiness_history(): void
    {
        InterviewEvaluated::dispatch($this->student->institution_id, $this->student->id, 0);
        InterviewEvaluated::dispatch($this->student->institution_id, $this->student->id, 0);

        $this->assertSame(2, ReadinessScore::query()->where('student_id', $this->student->id)->where('trigger', 'interview_evaluated')->count());
    }

    public function test_unmeasured_components_are_left_out_not_counted_as_zero(): void
    {
        // student@demo.com: CGPA 8.7, no resume, no interviews, no assessments.
        $this->asUser()->getJson('/api/v1/students/me/readiness-score')
            ->assertOk()
            ->assertJsonPath('data.overall', 87)
            ->assertJsonPath('data.components.academics.score', 87)
            ->assertJsonPath('data.components.resume.score', null)
            ->assertJsonPath('data.components.interview.score', null)
            ->assertJsonPath('data.components.interview.weight', 30)
            ->assertJsonCount(1, 'data.history');
    }

    public function test_only_one_active_interview_and_consent_is_required(): void
    {
        $id = $this->asUser()->postJson('/api/v1/students/me/interviews', ['mode' => 'hr', 'targetRole' => 'Data Analyst'])
            ->assertCreated()
            ->assertJsonPath('data.status', 'planned')
            ->assertJsonPath('data.plan.competencies.0.name', 'Motivation & Career Goals')
            ->json('data.id');

        $this->asUser()->postJson('/api/v1/students/me/interviews', ['mode' => 'technical', 'targetRole' => 'Data Analyst'])->assertStatus(409);
        $this->asUser()->postJson("/api/v1/interviews/{$id}/start", ['consentAccepted' => false])->assertUnprocessable();

        $this->asUser()->postJson("/api/v1/interviews/{$id}/finish")->assertStatus(202)->assertJsonPath('data.status', 'abandoned');
        $this->asUser()->postJson("/api/v1/interviews/{$id}/start", ['consentAccepted' => true])->assertStatus(409);

        $this->asUser()->getJson('/api/v1/students/me/interviews?status=abandoned')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $id);
    }
}
