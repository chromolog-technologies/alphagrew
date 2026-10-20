<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\LogsActivity;

class Student extends Model
{
    use BelongsToInstitution, SoftDeletes, LogsActivity;
    protected $fillable = [
        'user_id',
        'name',
        'email',
        'registration_number',
        'department_code',
        'year',
        'gender',
        'status',
        'cgpa',
        'attendance',
        'phone',
        'mentor',
        'fee_status',
        'placed_company',
        'placement_score',
        'risk_level',
        'resume_profile',
    ];

    protected function casts(): array
    {
        return [
            'cgpa' => 'float',
            'attendance' => 'integer',
            'skills' => 'array',
            'resume_profile' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function applications(): HasMany
    {
        return $this->hasMany(CompanyApplication::class);
    }

    public function profile(): HasOne
    {
        return $this->hasOne(StudentProfile::class);
    }

    public function projects(): HasMany
    {
        return $this->hasMany(StudentProject::class)->orderBy('sort_order')->orderBy('id');
    }

    public function certifications(): HasMany
    {
        return $this->hasMany(StudentCertification::class)->orderBy('sort_order')->orderBy('id');
    }

    public function experience(): HasMany
    {
        return $this->hasMany(StudentExperience::class)->orderBy('sort_order')->orderByDesc('start_date');
    }

    /** Skills with level and source (student_skills rows). Replaces the legacy students.skills JSON. */
    public function studentSkills(): HasMany
    {
        return $this->hasMany(StudentSkill::class);
    }

    /** Prior education (10th, 12th, diploma, previous degree). */
    public function education(): HasMany
    {
        return $this->hasMany(StudentAcademic::class);
    }

    /** CGPA, backlogs and attendance derived from published results. */
    public function academicSummary(): HasOne
    {
        return $this->hasOne(StudentAcademicSummary::class);
    }

    /** Uploaded resume files (AI Interview Journey stage 1). */
    public function resumes(): HasMany
    {
        return $this->hasMany(Resume::class);
    }

    public function interviews(): HasMany
    {
        return $this->hasMany(AiInterview::class);
    }

    /** Readiness history, newest last. */
    public function readinessScores(): HasMany
    {
        return $this->hasMany(ReadinessScore::class)->orderBy('calculated_at')->orderBy('id');
    }
}
