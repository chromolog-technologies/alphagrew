<?php

namespace App\Jobs;

use App\Enums\ResumeStatus;
use App\Events\ResumeAnalyzed;
use App\Models\AiResumeAnalysis;
use App\Models\Resume;
use App\Services\Ai\RecommendationGenerator;
use App\Services\Resumes\ResumeAnalyzer;
use App\Support\Tenancy\Tenant;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * ATS compatibility scores and improvement tips for a parsed resume; tips on the default
 * resume become resume_fix recommendations. Fires ResumeAnalyzed (readiness).
 */
class AnalyzeResumeJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public readonly int $institutionId, public readonly int $resumeId)
    {
    }

    public function handle(Tenant $tenant, ResumeAnalyzer $analyzer, RecommendationGenerator $recommendations): void
    {
        $tenant->runAs($this->institutionId, function () use ($analyzer, $recommendations): void {
            $resume = Resume::query()->find($this->resumeId);

            if (! $resume || $resume->status !== ResumeStatus::Parsed) {
                return;
            }

            $analysis = AiResumeAnalysis::query()->updateOrCreate(
                ['resume_id' => $resume->id],
                [...$analyzer->analyze($resume), 'institution_id' => $resume->institution_id],
            );

            if ($resume->is_default) {
                $recommendations->fromResumeAnalysis($resume, $analysis);
            }

            ResumeAnalyzed::dispatch($this->institutionId, $resume->student_id, $resume->id);
        });
    }
}
