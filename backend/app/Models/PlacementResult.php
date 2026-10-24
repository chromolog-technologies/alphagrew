<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlacementResult extends Model
{
    use BelongsToInstitution, LogsActivity;

    protected $table = 'placement_results';

    protected $fillable = [
        'student_id',
        'company_id',
        'round_id',
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
