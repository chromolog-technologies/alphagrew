<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class StudentExperience extends Model
{
    use BelongsToInstitution, SoftDeletes;

    public const TYPES = ['internship', 'job', 'freelance'];

    protected $table = 'student_experience';

    protected $fillable = [
        'student_id',
        'type',
        'organisation',
        'role',
        'start_date',
        'end_date',
        'description',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }
}
