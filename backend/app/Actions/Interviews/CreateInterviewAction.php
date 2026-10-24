<?php

namespace App\Actions\Interviews;

use App\Enums\InterviewMode;
use App\Enums\InterviewStatus;
use App\Enums\ResumeStatus;
use App\Exceptions\BusinessRuleException;
use App\Models\AiInterview;
use App\Models\JobPosting;
use App\Models\Student;
use App\Services\Ai\CandidateProfileBuilder;
use App\Services\Ai\InterviewPlanner;

/**
 * Stages 4–5 — the student picks a target role (or campus job), mode and difficulty; the
 * candidate profile is built and the interview plan generated synchronously. One active
 * (planned or in-progress) interview per student.
 */
class CreateInterviewAction
{
    public function __construct(private readonly CandidateProfileBuilder $profiles, private readonly InterviewPlanner $planner)
    {
    }

    /**
     * @param  array{mode: InterviewMode, targetRole: ?string, targetExperienceLevel: string, baseDifficulty: int,
     *               resumeId: ?int, jobPostingId: ?int, timeLimitMinutes: int}  $data
     */
    public function execute(Student $student, array $data): AiInterview
    {
        $active = $student->interviews()->whereIn('status', [InterviewStatus::Planned->value, InterviewStatus::InProgress->value])->first();

        if ($active) {
            throw BusinessRuleException::conflict("You already have an active interview (#{$active->id}). Finish it before starting another.");
        }

        $resume = $data['resumeId']
            ? $student->resumes()->findOrFail($data['resumeId'])
            : $student->resumes()->where('is_default', true)->first();

        // An unparsed default resume is simply skipped; an explicitly chosen one is an error.
        if ($resume && $resume->status !== ResumeStatus::Parsed) {
            if ($data['resumeId']) {
                throw BusinessRuleException::unprocessable('This resume has not been parsed yet; wait for parsing to finish or choose another.');
            }

            $resume = null;
        }

        $job = $data['jobPostingId'] ? JobPosting::query()->findOrFail($data['jobPostingId']) : null;
        $targetRole = mb_substr($data['targetRole'] ?: $job?->title ?: 'Software Engineer', 0, 100);
        $profile = $this->profiles->build($student, $resume);

        $plan = $this->planner->plan([
            'mode' => $data['mode'],
            'targetRole' => $targetRole,
            'targetExperienceLevel' => $data['targetExperienceLevel'],
            'timeLimitMinutes' => $data['timeLimitMinutes'],
        ], $profile, $job, $student->user_id);

        return $student->interviews()->create([
            'institution_id' => $student->institution_id,
            'resume_id' => $resume?->id,
            'job_posting_id' => $job?->id,
            'mode' => $data['mode'],
            'target_role' => $targetRole,
            'target_experience_level' => $data['targetExperienceLevel'],
            'base_difficulty' => $data['baseDifficulty'],
            'current_difficulty' => $data['baseDifficulty'],
            'status' => InterviewStatus::Planned,
            'time_limit_minutes' => $data['timeLimitMinutes'],
            'plan' => $plan,
        ]);
    }
}
