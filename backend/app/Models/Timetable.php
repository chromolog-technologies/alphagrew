<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
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

    protected $casts = [
        'start_time' => 'time',
        'end_time' => 'time',
        'effective_from' => 'date',
        'effective_to' => 'date',
    ];

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
