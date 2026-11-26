<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/** Work set for the students of a subject, with a due time and maximum marks. */
class Assignment extends Model
{
    use BelongsToInstitution, SoftDeletes;

    protected $fillable = ['subject_id', 'created_by', 'title', 'instructions', 'due_at', 'max_marks', 'allow_late'];

    protected $casts = ['due_at' => 'datetime', 'max_marks' => 'integer', 'allow_late' => 'boolean'];

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function submissions(): HasMany
    {
        return $this->hasMany(AssignmentSubmission::class);
    }
}
