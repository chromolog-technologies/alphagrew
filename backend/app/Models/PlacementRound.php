<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class PlacementRound extends Model
{
    use BelongsToInstitution, LogsActivity, SoftDeletes;

    protected $table = 'placement_rounds';

    protected $fillable = [
        'company_id',
        'name',
        'type',
        'scheduled_at',
        'duration_minutes',
        'description',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function results(): HasMany
    {
        return $this->hasMany(PlacementResult::class, 'round_id');
    }
}
