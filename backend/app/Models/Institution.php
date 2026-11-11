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

    /** Lifecycle (Owner Dashboard SRS FR-IN-005). Users can sign in while trial or active. */
    public const STATUSES = ['prospect', 'trial', 'active', 'suspended', 'expired', 'closed'];

    public const VERIFICATION_STATUSES = ['pending', 'verified', 'rejected', 'requires_information'];

    public const TYPES = ['college', 'university', 'institute', 'school', 'training_centre'];

    protected $fillable = [
        'name',
        'code',
        'slug',
        'domain',
        'status',
        'settings',
        'institution_type',
        'registration_number',
        'official_email',
        'contact_phone',
        'website',
        'country',
        'state',
        'district',
        'address',
        'pincode',
        'verification_status',
        'trial_ends_at',
        'suspended_at',
        'suspension_reason',
    ];

    protected $casts = [
        'settings' => 'array',
        'trial_ends_at' => 'datetime',
        'suspended_at' => 'datetime',
    ];

    public function statusEvents(): HasMany
    {
        return $this->hasMany(InstitutionStatusEvent::class)->latest('created_at')->latest('id');
    }

    public function students(): HasMany
    {
        return $this->hasMany(Student::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function isActive(): bool
    {
        return in_array($this->status, ['trial', 'active'], true);
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
