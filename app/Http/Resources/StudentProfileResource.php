<?php

namespace App\Http\Resources;

use App\Models\Student;
use App\Models\StudentProfile;
use App\Services\Students\ProfileCompleteness;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\URL;

/**
 * A student's career profile with completeness. Wraps the Student, since the
 * profile row may not exist yet.
 *
 * @mixin Student
 */
class StudentProfileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var StudentProfile $profile */
        $profile = $this->profile ?? new StudentProfile();

        return [
            'studentId' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'registrationNumber' => $this->registration_number,
            'departmentCode' => $this->department_code,
            'headline' => $profile->headline,
            'about' => $profile->about,
            'dateOfBirth' => $profile->date_of_birth?->toDateString(),
            'phone' => $profile->phone,
            'alternateEmail' => $profile->alternate_email,
            'city' => $profile->city,
            'state' => $profile->state,
            'country' => $profile->country,
            'linkedinUrl' => $profile->linkedin_url,
            'githubUrl' => $profile->github_url,
            'portfolioUrl' => $profile->portfolio_url,
            'photoUrl' => $profile->photo_path
                ? URL::temporarySignedRoute('students.photo', now()->addMinutes(10), ['student' => $this->id])
                : null,
            'preferredRoles' => $profile->preferred_roles ?? [],
            'preferredLocations' => $profile->preferred_locations ?? [],
            'willingToRelocate' => $profile->willing_to_relocate ?? true,
            'visibility' => $profile->resolvedVisibility(),
            'completeness' => app(ProfileCompleteness::class)->for($this->resource),
            'completedAt' => $profile->completed_at?->toIso8601String(),
        ];
    }
}
