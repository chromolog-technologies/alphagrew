<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\LogsActivity;

class MarkScheme extends Model
{
    use BelongsToInstitution, SoftDeletes, LogsActivity;

    protected $fillable = [
        'subject_id',
        'semester_id',
        'internal_marks',
        'external_marks',
        'total_marks',
        'pass_mark',
        'extra_marks_allowed',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function semester(): BelongsTo
    {
        return $this->belongsTo(Semester::class);
    }

    public function markEntries(): HasMany
    {
        return $this->hasMany(MarkEntry::class);
    }
}
