<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** One lifecycle or verification change of an institution; scheduled changes wait with applied = false. */
class InstitutionStatusEvent extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['institution_id', 'kind', 'from_status', 'to_status', 'reason', 'effective_at', 'applied', 'actor_id'];

    protected function casts(): array
    {
        return ['effective_at' => 'datetime', 'applied' => 'boolean'];
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
