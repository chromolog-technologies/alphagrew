<?php

namespace App\Http\Requests\Institutions;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Institution profile, contact details, branding colours and email sender settings.
 */
class UpdateInstitutionSettingsRequest extends FormRequest
{
    /** Keys stored in institutions.settings, with their request field names. */
    public const SETTINGS = [
        'contactEmail',
        'contactPhone',
        'website',
        'address',
        'primaryColor',
        'accentColor',
        'emailSenderName',
        'emailReplyTo',
    ];

    public function authorize(): bool
    {
        return $this->user()?->institution_id !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $color = ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'];

        return [
            'name' => ['required', 'string', 'max:255'],
            'contactEmail' => ['nullable', 'email', 'max:255'],
            'contactPhone' => ['nullable', 'string', 'max:30'],
            'website' => ['nullable', 'url:https,http', 'max:255'],
            'address' => ['nullable', 'string', 'max:500'],
            'primaryColor' => $color,
            'accentColor' => $color,
            'emailSenderName' => ['nullable', 'string', 'max:100'],
            'emailReplyTo' => ['nullable', 'email', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'primaryColor.regex' => 'Use a hex colour such as #1D4ED8.',
            'accentColor.regex' => 'Use a hex colour such as #1D4ED8.',
        ];
    }
}
