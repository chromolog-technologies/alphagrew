<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Institution extends Model
{
    use SoftDeletes;

    /** Code of the institution existing single-campus data is attached to. */
    public const DEFAULT_CODE = 'DEFAULT';

    protected $fillable = [
        'name',
        'code',
        'slug',
        'domain',
        'status',
        'settings',
    ];

    protected $casts = [
        'settings' => 'array',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public static function defaultId(): int
    {
        return static::query()->where('code', self::DEFAULT_CODE)->valueOrFail('id');
    }

    /**
     * Institution for accounts created by $actor. Super Admins have no institution of their
     * own, so their accounts go to the default institution until the super-admin console
     * lets them pick one.
     */
    public static function forNewAccountsOf(User $actor): int
    {
        return $actor->institution_id ?? self::defaultId();
    }
}
