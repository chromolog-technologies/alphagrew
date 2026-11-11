<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Timetable extends Model
{
    use BelongsToInstitution, SoftDeletes;

    protected $fillable = [
        'class_id',
        'subject_id',
        'faculty_id',
        'day_of_week',
        'start_time',
        'end_time',
        'room_number',
        'session_type',
        'effective_from',
        'effective_to',
    ];

    // start_time / end_time stay "HH:MM:SS" strings: Eloquent has no "time" cast.
    protected $casts = [
        'effective_from' => 'date',
        'effective_to' => 'date',
    ];

    /** A class's slots that are in effect today. */
    public function scopeActiveFor(Builder $query, int $classId): Builder
    {
        $today = now()->toDateString();

        return $query->where('class_id', $classId)
            ->whereDate('effective_from', '<=', $today)
            ->where(function (Builder $query) use ($today) {
                $query->whereNull('effective_to')->orWhereDate('effective_to', '>=', $today);
            });
    }

    public function class(): BelongsTo
    {
        return $this->belongsTo(\App\Models\ClassModel::class, 'class_id');
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function faculty(): BelongsTo
    {
        return $this->belongsTo(User::class, 'faculty_id');
    }
}
