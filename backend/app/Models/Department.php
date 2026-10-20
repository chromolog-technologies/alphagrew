<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Auth;

class Department extends Model
{
    use BelongsToInstitution, SoftDeletes;

    protected $fillable = [
        'name',
        'code',
        'description',
        'hod_id',
        'contact_email',
        'phone',
        'intake_capacity',
        'status',
        'created_by',
        'updated_by',
    ];

    protected $appends = [
        'staff_count',  // Include dynamic staff count in JSON/array output
    ];

    protected $casts = [
        'intake_capacity' => 'integer',
        'status' => 'string',  // 'active' or 'inactive'
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (Department $department) {
            $userId = Auth::id();
            if ($userId) {
                $department->created_by = $userId;
                $department->updated_by = $userId;
            }
        });

        static::updating(function (Department $department) {
            $userId = Auth::id();
            if ($userId) {
                $department->updated_by = $userId;
            }
        });
    }

    /**
     * Get the Head of Department (HOD)
     */
    public function hod(): BelongsTo
    {
        return $this->belongsTo(User::class, 'hod_id');
    }

    /**
     * Get all students in this department
     */
    public function students(): HasMany
    {
        return $this->hasMany(Student::class, 'department_code', 'code');
    }

    /**
     * Get all staff in this department
     */
    public function staff(): HasMany
    {
        return $this->hasMany(User::class, 'department_code', 'code')
            ->whereIn('role', ['staff', 'hod']);
    }

    /**
     * Get dynamically calculated staff count
     * 
     * Counts all staff members assigned to this department from the users table
     * where department_code matches this department's code and role is 'staff' or 'hod'
     * 
     * NOT stored in database - calculated on demand
     * 
     * @return int Total staff count for department
     */
    public function getStaffCountAttribute(): int
    {
        return $this->staff()->count();
    }

    /**
     * Get all courses belonging to this department
     */
    public function courses(): HasMany
    {
        return $this->hasMany(Course::class);
    }

    /**
     * Scope to get only active departments
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope to get only inactive departments
     */
    public function scopeInactive($query)
    {
        return $query->where('status', 'inactive');
    }
}
