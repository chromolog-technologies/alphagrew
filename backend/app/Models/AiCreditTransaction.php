<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Append-only AI credit ledger entry (SRS §5.9 FR-AI-003).
 */
class AiCreditTransaction extends Model
{
    public const UPDATED_AT = null;

    public const TYPES = [
        'plan_allocation',
        'bonus',
        'purchased',
        'usage_debit',
        'manual_adjustment',
        'reversal',
        'expiry',
    ];

    protected $fillable = [
        'wallet_id',
        'institution_id',
        'transaction_type',
        'credits_delta',
        'balance_after',
        'source_type',
        'source_id',
        'idempotency_key',
        'reason',
        'expires_at',
        'actor_id',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'credits_delta' => 'float',
            'balance_after' => 'float',
            'expires_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function wallet(): BelongsTo
    {
        return $this->belongsTo(AiCreditWallet::class, 'wallet_id');
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

