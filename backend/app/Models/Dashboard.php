<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A user-built dashboard. Only the owner edits it; people it is shared with can view it
 * (each sees data within their own scope) or copy it.
 *
 * @property list<array<string, mixed>> $widgets
 * @property list<string>|null $shared_roles
 * @property list<int>|null $shared_designation_ids
 */
class Dashboard extends Model
{
    use BelongsToInstitution, SoftDeletes;

    protected $fillable = [
        'owner_id',
        'name',
        'description',
        'template_key',
        'widgets',
        'shared_roles',
        'shared_designation_ids',
        'audience_default',
        'is_home',
    ];

    protected $casts = [
        'widgets' => 'array',
        'shared_roles' => 'array',
        'shared_designation_ids' => 'array',
        'audience_default' => 'boolean',
        'is_home' => 'boolean',
    ];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function isOwnedBy(User $user): bool
    {
        return $this->owner_id === $user->id;
    }

    public function isSharedWith(User $user): bool
    {
        return in_array($user->role, $this->shared_roles ?? [], true)
            || ($user->designation_id !== null && in_array((int) $user->designation_id, array_map('intval', $this->shared_designation_ids ?? []), true));
    }

    public function isVisibleTo(User $user): bool
    {
        return $this->isOwnedBy($user) || $this->isSharedWith($user);
    }

    public function isShared(): bool
    {
        return ($this->shared_roles ?? []) !== [] || ($this->shared_designation_ids ?? []) !== [];
    }
}
