<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use App\Support\Campus\CampusStaffAccess;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Designation extends Model
{
    use BelongsToInstitution;

    protected $fillable = [
        'name',
        'slug',
        'department_id',
        'description',
        'status',
        'permissions',
    ];

    protected $casts = [
        'status' => 'string',
        'permissions' => 'array',
    ];

    /**
     * Get the department this designation belongs to
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * Get all users with this designation
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Get module-level access rows for this designation.
     */
    public function moduleAccesses(): HasMany
    {
        return $this->hasMany(DesignationModuleMap::class);
    }

    /**
     * Resolve designation permissions used for Spatie sync.
     */
    public function resolvedPermissions(): array
    {
        $loadedAccesses = $this->relationLoaded('moduleAccesses')
            ? $this->moduleAccesses
            : $this->moduleAccesses()->with('module:id,module_name')->get();

        $fromModules = $loadedAccesses
            ->flatMap(function (DesignationModuleMap $access): array {
                $moduleName = strtolower((string) ($access->module?->module_name ?? ''));
                $actions = collect($access->permissions ?? [])
                    ->map(fn ($action) => strtolower((string) $action))
                    ->filter(fn (string $action) => in_array($action, ['view', 'create', 'edit', 'delete'], true))
                    ->unique()
                    ->values();

                if ($moduleName === '' || $actions->isEmpty()) {
                    return [];
                }

                return $actions->map(fn (string $action) => $moduleName.'.'.$action)->all();
            })
            ->unique()
            ->values()
            ->all();

        if (!empty($fromModules)) {
            return CampusStaffAccess::normalize($fromModules);
        }

        return CampusStaffAccess::normalize($this->permissions ?? []);
    }

    /**
     * Scope to get only active designations
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope to get only inactive designations
     */
    public function scopeInactive($query)
    {
        return $query->where('status', 'inactive');
    }

    /**
     * Scope to filter by department
     */
    public function scopeByDepartment($query, $departmentId)
    {
        return $query->where('department_id', $departmentId);
    }

    /**
     * Scope to get global designations (no specific department)
     */
    public function scopeGlobal($query)
    {
        return $query->whereNull('department_id');
    }
}
