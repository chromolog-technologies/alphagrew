<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Append-only history of a job application's status changes.
 */
class JobApplicationEvent extends Model
{
    use BelongsToInstitution;

    public const UPDATED_AT = null;

    protected $fillable = [
        'job_application_id',
        'from_status',
        'to_status',
        'actor_id',
        'note',
    ];

    public function application(): BelongsTo
    {
        return $this->belongsTo(JobApplication::class, 'job_application_id');
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
