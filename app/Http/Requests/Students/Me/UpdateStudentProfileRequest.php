<?php

namespace App\Http\Requests\Students\Me;

use App\Models\StudentProfile;

class UpdateStudentProfileRequest extends StudentSelfRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'headline' => ['nullable', 'string', 'max:160'],
            'about' => ['nullable', 'string', 'max:2000'],
            'dateOfBirth' => ['nullable', 'date', 'before:-14 years'],
            'phone' => ['nullable', 'string', 'max:30'],
            'alternateEmail' => ['nullable', 'email', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'country' => ['nullable', 'string', 'max:100'],
            'linkedinUrl' => ['nullable', 'url', 'max:255'],
            'githubUrl' => ['nullable', 'url', 'max:255'],
            'portfolioUrl' => ['nullable', 'url', 'max:255'],
            'preferredRoles' => ['nullable', 'array', 'max:5'],
            'preferredRoles.*' => ['string', 'max:100'],
            'preferredLocations' => ['nullable', 'array', 'max:5'],
            'preferredLocations.*' => ['string', 'max:100'],
            'willingToRelocate' => ['nullable', 'boolean'],
            // Keys other than StudentProfile::VISIBILITY_DEFAULTS are ignored.
            'visibility' => ['nullable', 'array'],
            'visibility.*' => ['boolean'],
        ];
    }

    /**
     * Validated input mapped to student_profiles columns. Fields not sent are left unchanged.
     *
     * @return array<string, mixed>
     */
    public function profileAttributes(): array
    {
        $map = [
            'headline' => 'headline',
            'about' => 'about',
            'dateOfBirth' => 'date_of_birth',
            'phone' => 'phone',
            'alternateEmail' => 'alternate_email',
            'city' => 'city',
            'state' => 'state',
            'country' => 'country',
            'linkedinUrl' => 'linkedin_url',
            'githubUrl' => 'github_url',
            'portfolioUrl' => 'portfolio_url',
            'preferredRoles' => 'preferred_roles',
            'preferredLocations' => 'preferred_locations',
            'willingToRelocate' => 'willing_to_relocate',
        ];

        $validated = $this->validated();
        $attributes = [];

        foreach ($map as $input => $column) {
            if (array_key_exists($input, $validated)) {
                $attributes[$column] = $validated[$input];
            }
        }

        if (array_key_exists('visibility', $validated)) {
            $attributes['visibility'] = array_intersect_key(
                array_map('boolval', $validated['visibility'] ?? []),
                StudentProfile::VISIBILITY_DEFAULTS,
            );
        }

        return $attributes;
    }
}
