<?php

namespace App\Models;

use App\Enums\ApplicationStatus;
use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A student's application to a job posting. Status changes only through
 * App\Actions\Placement\ChangeApplicationStatusAction, which writes the history.
 */
class JobApplication extends Model
{
    use BelongsToInstitution;

    protected $fillable = [
        'job_posting_id',
        'student_id',
        'resume_id',
        'status',
        'eligibility_snapshot',
        'applied_at',
        'withdrawn_at',
        'decided_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => ApplicationStatus::class,
            'eligibility_snapshot' => 'array',
            'applied_at' => 'datetime',
            'withdrawn_at' => 'datetime',
            'decided_at' => 'datetime',
        ];
    }

    public function jobPosting(): BelongsTo
    {
        return $this->belongsTo(JobPosting::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(JobApplicationEvent::class)->orderBy('created_at')->orderBy('id');
    }
}
