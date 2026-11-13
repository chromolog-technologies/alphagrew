<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlacementResult extends Model
{
    use BelongsToInstitution, LogsActivity;

    public const STATUS_PASSED = 'passed';
    public const STATUS_FAILED = 'failed';
    public const STATUS_ABSENT = 'absent';
    public const STATUS_CLEARED = 'cleared';
    public const STATUS_REJECTED = 'rejected';
    public const STATUS_PENDING = 'pending';
    public const STATUS_WAITLIST = 'waitlist';

    public const STATUSES = [
        self::STATUS_PASSED,
        self::STATUS_FAILED,
        self::STATUS_ABSENT,
        self::STATUS_CLEARED,
        self::STATUS_REJECTED,
        self::STATUS_PENDING,
        self::STATUS_WAITLIST,
    ];

    protected $table = 'placement_results';

    protected $fillable = [
        'student_id',
        'company_id',
        'round_id',
        'job_application_id',
        'status',
        'score',
        'feedback',
    ];

    protected function casts(): array
    {
        return [
            'score' => 'decimal:2',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function round(): BelongsTo
    {
        return $this->belongsTo(PlacementRound::class, 'round_id');
    }
}
