<?php

namespace App\Jobs;

use App\Models\AiInterview;
use App\Models\SkillGapReport;
use App\Services\Ai\RecommendationGenerator;
use App\Services\Ai\SkillGapAnalyzer;
use App\Support\Tenancy\Tenant;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Stages 12–13 — the interview's skill gap report, then the practice recommendations from it.
 */
class GenerateSkillGapReportJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public readonly int $institutionId, public readonly int $interviewId)
    {
    }

    public function handle(Tenant $tenant, SkillGapAnalyzer $analyzer, RecommendationGenerator $recommendations): void
    {
        $tenant->runAs($this->institutionId, function () use ($analyzer, $recommendations): void {
            $interview = AiInterview::query()->with(['evaluation', 'jobPosting'])->find($this->interviewId);

            if (! $interview?->evaluation) {
                return;
            }

            $report = SkillGapReport::query()->updateOrCreate(
                ['interview_id' => $interview->id],
                [
                    ...$analyzer->analyze($interview, $interview->evaluation),
                    'institution_id' => $interview->institution_id,
                    'student_id' => $interview->student_id,
                    'generated_at' => now(),
                ],
            );

            $recommendations->fromSkillGap($report);
        });
    }
}
