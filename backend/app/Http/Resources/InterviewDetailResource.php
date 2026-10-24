<?php

namespace App\Http\Resources;

use App\Enums\InterviewStatus;
use App\Models\AiInterviewTurn;
use Illuminate\Http\Request;

/**
 * Session state plus every turn; quick signals appear once the interview is completed.
 */
class InterviewDetailResource extends InterviewSessionResource
{
    public function toArray(Request $request): array
    {
        $completed = $this->status === InterviewStatus::Completed;

        return [
            ...parent::toArray($request),
            'turns' => $this->turns->map(fn (AiInterviewTurn $turn) => new TurnResource($turn, $completed))->values(),
        ];
    }
}
