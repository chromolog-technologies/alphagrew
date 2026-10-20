<?php

namespace App\Http\Resources;

use App\Models\ReadinessScore;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Collection;

/**
 * The student's current readiness score with its components and recent history.
 *
 * @mixin ReadinessScore
 */
class StudentReadinessResource extends JsonResource
{
    /** @param  Collection<int, ReadinessScore>  $history  oldest first */
    public function __construct(ReadinessScore $score, private readonly Collection $history)
    {
        parent::__construct($score);
    }

    public function toArray(Request $request): array
    {
        return [
            'overall' => $this->overall,
            'components' => $this->components,
            'calculatedAt' => $this->calculated_at?->toIso8601String(),
            'history' => $this->history->map(fn (ReadinessScore $point) => [
                'overall' => $point->overall,
                'trigger' => $point->trigger,
                'calculatedAt' => $point->calculated_at?->toIso8601String(),
            ])->values(),
            'note' => 'A coaching indicator to guide your practice. It is never an employability verdict and never blocks you from applying.',
        ];
    }
}
