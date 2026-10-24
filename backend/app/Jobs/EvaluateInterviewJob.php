<?php

namespace App\Jobs;

use App\Enums\InterviewStatus;
use App\Events\InterviewEvaluated;
use App\Models\AiInterview;
use App\Models\AiInterviewEvaluation;
use App\Services\Ai\InterviewEvaluator;
use App\Support\Tenancy\Tenant;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

/**
 * Stage 11 — writes the scorecard, marks the interview completed and fires InterviewEvaluated.
 * If no evaluation can be produced the interview is marked failed.
 */
class EvaluateInterviewJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public readonly int $institutionId, public readonly int $interviewId)
    {
    }

    public function handle(Tenant $tenant, InterviewEvaluator $evaluator): void
    {
        $tenant->runAs($this->institutionId, function () use ($evaluator): void {
            $interview = AiInterview::query()->with(['turns', 'student:id,user_id'])->find($this->interviewId);

            if (! $interview || $interview->status !== InterviewStatus::Evaluating) {
                return;
            }

            try {
                AiInterviewEvaluation::query()->updateOrCreate(
                    ['interview_id' => $interview->id],
                    [...$evaluator->evaluate($interview), 'institution_id' => $interview->institution_id],
                );
            } catch (Throwable $e) {
                $interview->update(['status' => InterviewStatus::Failed]);
                report($e);

                return;
            }

            $interview->update(['status' => InterviewStatus::Completed]);
            InterviewEvaluated::dispatch($this->institutionId, $interview->student_id, $interview->id);
        });
    }
}
