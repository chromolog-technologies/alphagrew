<?php

namespace App\Actions\Interviews;

use App\Enums\InterviewStatus;
use App\Events\InterviewFinished;
use App\Exceptions\BusinessRuleException;
use App\Models\AiInterview;

/**
 * Ends a session. With at least one answered turn it moves to evaluating and queues the
 * evaluation (InterviewFinished); with none, or if it never started, it is abandoned.
 */
class FinishInterviewAction
{
    public function execute(AiInterview $interview, string $reason): AiInterview
    {
        if (! $interview->status->isActive()) {
            throw BusinessRuleException::conflict("This interview is already {$interview->status->value}.");
        }

        $answered = $interview->turns()->whereNotNull('answered_at')->exists();
        $status = $interview->status === InterviewStatus::InProgress && $answered ? InterviewStatus::Evaluating : InterviewStatus::Abandoned;

        $interview->update(['status' => $status, 'ended_at' => now(), 'end_reason' => mb_substr($reason, 0, 40)]);

        if ($status === InterviewStatus::Evaluating) {
            InterviewFinished::dispatch($interview->institution_id, $interview->id);
        }

        return $interview;
    }
}
