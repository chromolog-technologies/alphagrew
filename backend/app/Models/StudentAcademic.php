<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One prior-education record (10th, 12th, diploma, previous degree).
 */
class StudentAcademic extends Model
{
    use BelongsToInstitution;

    public const LEVELS = ['class_10', 'class_12', 'diploma', 'ug', 'pg'];

    public const SCORE_TYPES = ['percentage', 'cgpa'];

    protected $fillable = [
        'student_id',
        'level',
        'board_or_university',
        'institution_name',
        'year_of_passing',
        'score_type',
        'score',
        'verified_by',
        'verified_at',
        'verification_remarks',
    ];

    protected function casts(): array
    {
        return [
            'year_of_passing' => 'integer',
            'score' => 'float',
            'verified_at' => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function isVerified(): bool
    {
        return $this->verified_at !== null;
    }
}
