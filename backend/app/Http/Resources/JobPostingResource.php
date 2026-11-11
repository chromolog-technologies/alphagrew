<?php

namespace App\Http\Resources;

use App\Models\JobPosting;
use App\Services\Placement\EligibilityEvaluator;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A job (posting + drive + company). Students also get `assessment` (their eligibility and
 * blockers) and `application`; officers get `counts` per application status.
 *
 * @mixin JobPosting
 */
class JobPostingResource extends JsonResource
{
    /** @var array<string, mixed>|null */
    public ?array $assessment = null;

    /** @var array<string, int>|null */
    public ?array $counts = null;

    public ?JobApplicationResource $application = null;

    public function toArray(Request $request): array
    {
        $lpa = fn (?int $paise) => $paise === null ? null : round($paise / 10_000_000, 2);

        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'employmentType' => $this->employment_type,
            'location' => $this->location,
            'ctcMinLpa' => $lpa($this->ctc_min_paise),
            'ctcMaxLpa' => $lpa($this->ctc_max_paise),
            'stipendMonthly' => $this->stipend_paise === null ? null : round($this->stipend_paise / 100, 2),
            'packageDisplay' => $this->package_display,
            'openings' => $this->openings,
            'requiredSkills' => $this->required_skills ?? [],
            'applyDeadline' => $this->apply_deadline?->toIso8601String(),
            'driveDate' => $this->drive?->starts_on?->toDateString(),
            'status' => $this->status,
            'isOpen' => $this->isOpen(),
            'publishedAt' => $this->published_at?->toIso8601String(),
            'company' => $this->company ? [
                'id' => $this->company->id,
                'name' => $this->company->name,
                'industry' => $this->company->industry,
                'website' => $this->company->website,
                'logoUrl' => $this->company->logo_url,
            ] : null,
            'eligibility' => $this->whenLoaded('eligibilityRules', fn () => $this->eligibilityRules->map(fn ($rule) => [
                'field' => $rule->field,
                'label' => EligibilityEvaluator::LABELS[$rule->field] ?? $rule->field,
                'operator' => $rule->operator,
                'value' => $rule->value,
            ])->values()),
            'assessment' => $this->when($this->assessment !== null, fn () => $this->assessment),
            'application' => $this->when($this->application !== null, fn () => $this->application),
            'counts' => $this->when($this->counts !== null, fn () => $this->counts),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
