<?php

namespace App\Http\Requests\Students\Me;

use App\Enums\InterviewMode;
use App\Support\Tenancy\TenantRule;
use Illuminate\Validation\Rule;

/**
 * POST /students/me/interviews — stage 4: target role (or a campus job), mode, difficulty.
 */
class CreateInterviewRequest extends StudentSelfRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'mode' => ['required', Rule::in(InterviewMode::values())],
            'targetRole' => ['nullable', 'required_without:jobPostingId', 'string', 'max:100'],
            'targetExperienceLevel' => ['sometimes', Rule::in(['fresher', 'junior', 'intermediate'])],
            'baseDifficulty' => ['sometimes', 'integer', 'between:1,5'],
            'resumeId' => ['nullable', 'integer'],
            'jobPostingId' => ['nullable', 'integer', TenantRule::exists('job_postings', 'id')],
            'timeLimitMinutes' => ['sometimes', 'integer', 'between:10,45'],
        ];
    }

    /**
     * @return array{mode: InterviewMode, targetRole: ?string, targetExperienceLevel: string, baseDifficulty: int,
     *               resumeId: ?int, jobPostingId: ?int, timeLimitMinutes: int}
     */
    public function toData(): array
    {
        return [
            'mode' => InterviewMode::from($this->validated('mode')),
            'targetRole' => $this->validated('targetRole'),
            'targetExperienceLevel' => $this->validated('targetExperienceLevel', 'fresher'),
            'baseDifficulty' => (int) $this->validated('baseDifficulty', 2),
            'resumeId' => $this->validated('resumeId') !== null ? (int) $this->validated('resumeId') : null,
            'jobPostingId' => $this->validated('jobPostingId') !== null ? (int) $this->validated('jobPostingId') : null,
            'timeLimitMinutes' => (int) $this->validated('timeLimitMinutes', 20),
        ];
    }
}
