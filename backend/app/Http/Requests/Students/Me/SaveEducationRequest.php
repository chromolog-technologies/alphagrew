<?php

namespace App\Http\Requests\Students\Me;

use App\Models\StudentAcademic;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * A prior-education record. Changing a verified record clears its verification.
 */
class SaveEducationRequest extends StudentSelfRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $existing = $this->route('education');

        return [
            'level' => [
                'required',
                Rule::in(StudentAcademic::LEVELS),
                // One record per level per student.
                Rule::unique('student_academics', 'level')
                    ->where('student_id', $this->student()->id)
                    ->ignore($existing?->id),
            ],
            'boardOrUniversity' => ['required', 'string', 'max:255'],
            'institutionName' => ['required', 'string', 'max:255'],
            'yearOfPassing' => ['required', 'integer', 'between:1980,'.((int) now()->format('Y') + 1)],
            'scoreType' => ['required', Rule::in(StudentAcademic::SCORE_TYPES)],
            'score' => ['required', 'numeric', 'min:0'],
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $max = $this->input('scoreType') === 'cgpa' ? 10 : 100;

                if (is_numeric($this->input('score')) && (float) $this->input('score') > $max) {
                    $validator->errors()->add('score', "The score can't be more than {$max} for this score type.");
                }
            },
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function attributesForModel(): array
    {
        $v = $this->validated();

        return [
            'level' => $v['level'],
            'board_or_university' => $v['boardOrUniversity'],
            'institution_name' => $v['institutionName'],
            'year_of_passing' => $v['yearOfPassing'],
            'score_type' => $v['scoreType'],
            'score' => $v['score'],
            'verified_by' => null,
            'verified_at' => null,
            'verification_remarks' => null,
        ];
    }
}
