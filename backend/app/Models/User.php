<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;
use App\Enums\UserRole;
use App\Traits\LogsActivity;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use BelongsToInstitution, HasApiTokens, HasFactory, HasRoles, Notifiable, SoftDeletes, LogsActivity;

    protected string $guard_name = 'sanctum';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'first_name',
        'last_name',
        'email',
        'password',
        'role',
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
        ];
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
