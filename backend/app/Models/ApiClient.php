<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Scoped API client credential (stores SHA-256 hash only; raw secret returned once) (SRS §5.21).
 */
class ApiClient extends Model
{
    public const STATUSES = ['active', 'revoked'];

    protected $fillable = [
        'institution_id',
        'name',
        'key_prefix',
        'key_hash',
        'scopes',
        'rate_limit_per_min',
        'status',
        'last_used_at',
        'expires_at',
        'created_by',
    ];

    protected $hidden = ['key_hash'];

    protected function casts(): array
    {
        return [
            'scopes' => 'array',
            'rate_limit_per_min' => 'integer',
            'last_used_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

