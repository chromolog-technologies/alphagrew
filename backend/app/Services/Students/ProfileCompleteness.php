<?php

namespace App\Services\Students;

use App\Models\Student;

/**
 * How complete a student's career profile is (0-100), by weighted section.
 * Shown on the dashboard and used later as a readiness input.
 */
class ProfileCompleteness
{
    public const WEIGHTS = [
        'basics' => 15,       // headline and about
        'contact' => 10,      // phone and city
        'links' => 10,        // any of LinkedIn, GitHub, portfolio
        'photo' => 5,
        'preferences' => 10,  // preferred roles
        'skills' => 20,       // at least 3 skills
        'projects' => 15,     // at least 1 project
        'experience' => 15,   // at least 1 internship/job or certification
    ];

    /**
     * @return array{percent: int, sections: array<string, bool>}
     */
    public function for(Student $student): array
    {
        $student->loadMissing('profile');
        $profile = $student->profile;

        $sections = [
            'basics' => filled($profile?->headline) && filled($profile?->about),
            'contact' => filled($profile?->phone) && filled($profile?->city),
            'links' => filled($profile?->linkedin_url) || filled($profile?->github_url) || filled($profile?->portfolio_url),
            'photo' => filled($profile?->photo_path),
            'preferences' => ! empty($profile?->preferred_roles),
            'skills' => $student->studentSkills()->count() >= 3,
            'projects' => $student->projects()->exists(),
            'experience' => $student->experience()->exists() || $student->certifications()->exists(),
        ];

        $percent = 0;
        foreach ($sections as $section => $done) {
            $percent += $done ? self::WEIGHTS[$section] : 0;
        }

        return ['percent' => $percent, 'sections' => $sections];
    }

    /**
     * Records when the profile first reaches 100%, and clears it if it drops below.
     */
    public function refresh(Student $student): void
    {
        $student->unsetRelation('profile');
        $complete = $this->for($student)['percent'] === 100;
        $profile = $student->profile;

        if (! $profile) {
            return;
        }

        if ($complete && ! $profile->completed_at) {
            $profile->update(['completed_at' => now()]);
        } elseif (! $complete && $profile->completed_at) {
            $profile->update(['completed_at' => null]);
        }
    }
}
