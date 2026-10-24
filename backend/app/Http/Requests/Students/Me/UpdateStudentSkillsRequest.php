<?php

namespace App\Http\Requests\Students\Me;

use App\Support\Tenancy\Tenant;
use Illuminate\Database\Query\Builder;
use Illuminate\Validation\Rule;

class UpdateStudentSkillsRequest extends StudentSelfRequest
{
    public const MAX_SKILLS = 50;

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $institutionId = app(Tenant::class)->id();

        return [
            'skills' => ['present', 'array', 'max:'.self::MAX_SKILLS],
            'skills.*.skillId' => [
                'required',
                'integer',
                'distinct',
                // A platform skill or one of this institution's own.
                Rule::exists('skills', 'id')->where(fn (Builder $query) => $query
                    ->whereNull('institution_id')
                    ->orWhere('institution_id', $institutionId)),
            ],
            'skills.*.level' => ['required', 'integer', 'between:1,5'],
        ];
    }

    /**
     * @return array<int, int> skill id => level
     */
    public function levelsBySkillId(): array
    {
        return collect($this->validated('skills'))
            ->mapWithKeys(fn (array $row) => [(int) $row['skillId'] => (int) $row['level']])
            ->all();
    }
}
