<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentProfile extends Model
{
    use BelongsToInstitution;

    /** Sections a student can hide from recruiters, with their default visibility. */
    public const VISIBILITY_DEFAULTS = [
        'contact' => false,
        'links' => true,
        'academics' => true,
        'projects' => true,
        'certifications' => true,
        'experience' => true,
        'skills' => true,
    ];

    protected $fillable = [
        'student_id',
        'headline',
        'about',
        'date_of_birth',
        'phone',
        'alternate_email',
        'city',
        'state',
        'country',
        'linkedin_url',
        'github_url',
        'portfolio_url',
        'photo_path',
        'preferred_roles',
        'preferred_locations',
        'willing_to_relocate',
        'visibility',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'preferred_roles' => 'array',
            'preferred_locations' => 'array',
            'willing_to_relocate' => 'boolean',
            'visibility' => 'array',
            'completed_at' => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    /** @return array<string, bool> */
    public function resolvedVisibility(): array
    {
        return array_merge(self::VISIBILITY_DEFAULTS, array_intersect_key($this->visibility ?? [], self::VISIBILITY_DEFAULTS));
    }
}
