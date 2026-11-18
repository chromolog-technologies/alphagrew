<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * An emailed invitation to join an institution as a student, staff member or
 * placement officer. Only the SHA-256 of the token is stored.
 */
class Invitation extends Model
{
    use BelongsToInstitution;

    public const VALID_DAYS = 7;

    protected $fillable = [
        'email',
        'role',
        'department_code',
        'designation_id',
        'token_hash',
        'invited_by',
        'expires_at',
        'accepted_at',
        'accepted_user_id',
        'revoked_at',
    ];

    protected $hidden = ['token_hash'];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'accepted_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    public static function hashToken(string $token): string
    {
        return hash('sha256', $token);
    }

    /** Sets a new token and expiry; returns the plain token to put in the email. */
    public function issueToken(): string
    {
        $token = Str::random(48);
        $this->forceFill([
            'token_hash' => self::hashToken($token),
            'expires_at' => now()->addDays(self::VALID_DAYS),
        ]);

        return $token;
    }

    /** pending | accepted | revoked | expired */
    public function status(): string
    {
        return match (true) {
            $this->accepted_at !== null => 'accepted',
            $this->revoked_at !== null => 'revoked',
            $this->expires_at->isPast() => 'expired',
            default => 'pending',
        };
    }

    public function isPending(): bool
    {
        return $this->status() === 'pending';
    }

    public function scopePending(Builder $query): Builder
    {
        return $query->whereNull('accepted_at')->whereNull('revoked_at')->where('expires_at', '>', now());
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function designation(): BelongsTo
    {
        return $this->belongsTo(Designation::class);
    }

    public function inviter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by');
    }
}
