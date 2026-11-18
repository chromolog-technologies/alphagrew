<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\LogsActivity;

class Attendance extends Model
{
    use BelongsToInstitution, SoftDeletes, LogsActivity;

    protected $table = 'attendance';

    protected $fillable = [
        'student_id',
        'subject_id',
        'faculty_id',
        'attendance_date',
        'status',
        'remarks',
        'is_approved',
    ];

    protected $casts = [
        'attendance_date' => 'date',
        'is_approved' => 'boolean',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
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
