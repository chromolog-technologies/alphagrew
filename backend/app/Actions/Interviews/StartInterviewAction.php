<?php

namespace App\Actions\Interviews;

use App\Enums\InterviewStatus;
use App\Exceptions\BusinessRuleException;
use App\Models\AiInterview;
use App\Models\AiInterviewTurn;
use App\Services\Ai\InterviewConductor;

/**
 * Records the student's explicit consent (recording and AI evaluation of their answers),
 * starts the clock and asks the first question.
 */
class StartInterviewAction
{
    public function __construct(private readonly InterviewConductor $conductor)
    {
    }

    public function execute(AiInterview $interview): AiInterviewTurn
    {
        if ($interview->status !== InterviewStatus::Planned) {
            throw BusinessRuleException::conflict("This interview is {$interview->status->value} and cannot be started.");
        }

        $interview->update([
            'status' => InterviewStatus::InProgress,
            'consent_given_at' => now(),
            'started_at' => now(),
            'current_difficulty' => $interview->base_difficulty,
        ]);

        return $this->conductor->first($interview);
    }
}
