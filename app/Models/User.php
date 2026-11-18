<?php

namespace App\Models;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Traits\BelongsToInstitution;
use App\Traits\LogsActivity;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use BelongsToInstitution, HasApiTokens, HasFactory, HasRoles, LogsActivity, Notifiable, SoftDeletes;

    protected string $guard_name = 'sanctum';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'platform_role_id',
        'name',
        'first_name',
        'last_name',
        'email',
        'password',
        'role',
        'status',
        'status_reason',
        'institution_id',
        'title',
        'department_code',
        'designation_id',
        'phone',
        'image_url',
        'communication_address',
        'permanent_address',
        'emergency_contact_person',
        'emergency_contact_number',
        'biometric_id',
        'experience_years',
        'specialization',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'mfa_secret',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'locked_until' => 'datetime',
            'mfa_secret' => 'encrypted',
            'mfa_enabled_at' => 'datetime',
            'last_login_at' => 'datetime',
        ];
    }

    /** Unknown or missing values count as active (accounts created before statuses existed). */
    public function statusEnum(): UserStatus
    {
        return UserStatus::tryFrom((string) $this->status) ?? UserStatus::Active;
    }

    public function isLocked(): bool
    {
        return $this->locked_until !== null && $this->locked_until->isFuture();
    }

    /** The role as an enum; null for a value that isn't one of the six roles. */
    public function roleEnum(): ?UserRole
    {
        return UserRole::tryFrom((string) $this->role);
    }

    /** Super Admin or Institution Admin. */
    public function isAdmin(): bool
    {
        return $this->roleEnum()?->isAdmin() ?? false;
    }

    public function isSuperAdmin(): bool
    {
        return $this->roleEnum() === UserRole::SuperAdmin;
    }

    /** Super Admin or platform staff: uses the owner console. */
    public function isPlatformUser(): bool
    {
        return $this->roleEnum()?->isPlatform() ?? false;
    }

    public function platformRole(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(PlatformRole::class);
    }

    /** @return list<string> owner permissions held (none for institution users) */
    public function ownerPermissions(): array
    {
        return match (true) {
            $this->isSuperAdmin() => \App\Support\Owner\OwnerPermission::all(),
            $this->roleEnum() === UserRole::PlatformStaff => array_values($this->platformRole?->permissions ?? []),
            default => [],
        };
    }

    /**
     * Owner-console permission check. Deliberately not Gate/Spatie: Gate::before lets every
     * institution admin through, and institution roles must never reach platform routes.
     */
    public function ownerCan(string $permission): bool
    {
        return $this->statusEnum() === \App\Enums\UserStatus::Active && in_array($permission, $this->ownerPermissions(), true);
    }

    public function isInstitutionStaff(): bool
    {
        return $this->roleEnum()?->isInstitutionStaff() ?? false;
    }

    public function student(): HasOne
    {
        return $this->hasOne(Student::class);
    }

    public function designation(): BelongsTo
    {
        return $this->belongsTo(Designation::class);
    }
}
