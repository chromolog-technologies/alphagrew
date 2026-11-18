<?php

namespace App\Http\Requests\Students;

use App\Enums\UserRole;
use Illuminate\Auth\Access\Response;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStudentResumeRequest extends FormRequest
{
    public function authorize(): Response
    {
        $user = $this->user();

        return $user->role === UserRole::Student->value && $user->student
            ? Response::allow()
            : Response::deny('Only student accounts can manage resume profiles.');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'template' => ['required', Rule::in(['classic_ats', 'modern_ats', 'compact_ats'])],
            'headline' => ['nullable', 'string', 'max:255'],
            'summary' => ['nullable', 'string', 'max:2500'],
            'targetRole' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'links' => ['nullable', 'array'],
            'links.*' => ['string', 'max:255'],
            'certifications' => ['nullable', 'array'],
            'certifications.*' => ['string', 'max:255'],
            'achievements' => ['nullable', 'array'],
            'achievements.*' => ['string', 'max:500'],
            'projects' => ['nullable', 'array'],
            'projects.*' => ['string', 'max:500'],
            'experience' => ['nullable', 'array'],
            'experience.*' => ['string', 'max:500'],
            'uploadedResumeText' => ['nullable', 'string', 'max:50000'],
            'uploadedResumeFileName' => ['nullable', 'string', 'max:255'],
        ];
    }
}
