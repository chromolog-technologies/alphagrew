<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A sign-in attempt and its outcome (success, failed, locked, refused, mfa_failed). Platform-wide. */
class LoginHistory extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['user_id', 'institution_id', 'email', 'outcome', 'reason', 'ip_address', 'user_agent'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }
}
