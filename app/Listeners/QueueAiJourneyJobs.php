<?php

namespace App\Listeners;

use App\Events\InterviewEvaluated;
use App\Events\InterviewFinished;
use App\Events\ResumeAnalyzed;
use App\Events\ResumeParsed;
use App\Events\ResumeUploaded;
use App\Events\StudentResultsChanged;
use App\Jobs\AnalyzeResumeJob;
use App\Jobs\EvaluateInterviewJob;
use App\Jobs\GenerateSkillGapReportJob;
use App\Jobs\ParseResumeJob;
use App\Jobs\RecalculateReadinessJob;

/**
 * The AI Interview Journey pipeline (spec §6): each event queues the next stage.
 */
class QueueAiJourneyJobs
{
    public function handleResumeUploaded(ResumeUploaded $event): void
    {
        ParseResumeJob::dispatch($event->institutionId, $event->resumeId);
    }

    public function handleResumeParsed(ResumeParsed $event): void
    {
        AnalyzeResumeJob::dispatch($event->institutionId, $event->resumeId);
    }

    public function handleResumeAnalyzed(ResumeAnalyzed $event): void
    {
        RecalculateReadinessJob::dispatch($event->institutionId, $event->studentId, 'resume_analyzed');
    }

    public function handleInterviewFinished(InterviewFinished $event): void
    {
        EvaluateInterviewJob::dispatch($event->institutionId, $event->interviewId);
    }

    public function handleInterviewEvaluated(InterviewEvaluated $event): void
    {
        GenerateSkillGapReportJob::dispatch($event->institutionId, $event->interviewId);
        RecalculateReadinessJob::dispatch($event->institutionId, $event->studentId, 'interview_evaluated');
    }

    /**
     * Published results change the academic component of readiness. Delayed so the academic
     * summary (RecalculateAcademicSummary, queued by the same event) is refreshed first.
     */
    public function handleStudentResultsChanged(StudentResultsChanged $event): void
    {
        foreach (array_unique($event->studentIds) as $studentId) {
            RecalculateReadinessJob::dispatch($event->institutionId, (int) $studentId, 'results_changed')->delay(now()->addMinute());
        }
    }
}
