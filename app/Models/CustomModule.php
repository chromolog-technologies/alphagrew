<?php

namespace App\Models;

use App\Enums\UserRole;
use App\Support\Campus\CampusPermission;
use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A module an institution admin created. Its records have a title and a status; all other
 * attributes are custom fields under the entity returned by customFieldEntity().
 *
 * Admins (custom_fields.manage) always have full access. Other roles get access through
 * view_roles / edit_roles, and only while the module is active.
 *
 * @property string $key
 * @property string $plural_label
 * @property string $singular_label
 * @property string $category
 * @property array<int, string>|null $view_roles
 * @property array<int, string>|null $edit_roles
 * @property bool $is_active
 */
class CustomModule extends Model
{
    use BelongsToInstitution, SoftDeletes;

    public const CATEGORIES = ['Academics', 'People & Roles', 'Career & Placement', 'Administration', 'Operations'];

    /** Roles an admin may let read the records. */
    public const VIEWABLE_BY = [UserRole::PlacementOfficer->value, UserRole::Staff->value, UserRole::Student->value];

    /** Roles an admin may let change the records. Students only ever read. */
    public const EDITABLE_BY = [UserRole::PlacementOfficer->value, UserRole::Staff->value];

    protected $fillable = [
        'key',
        'plural_label',
        'singular_label',
        'category',
        'description',
        'view_roles',
        'edit_roles',
        'is_active',
        'sort_order',
        'created_by',
    ];

    protected $casts = [
        'view_roles' => 'array',
        'edit_roles' => 'array',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function records(): HasMany
    {
        return $this->hasMany(CustomModuleRecord::class);
    }

    /** The custom field entity of this module's records. */
    public function customFieldEntity(): string
    {
        return CustomFieldDefinition::moduleEntity($this->id);
    }

    public function canView(User $user): bool
    {
        if ($this->canManage($user)) {
            return true;
        }

        $role = (string) $user->role;

        return $this->is_active
            && (in_array($role, $this->view_roles ?? [], true) || in_array($role, $this->edit_roles ?? [], true));
    }

    public function canEdit(User $user): bool
    {
        return $this->canManage($user)
            || ($this->is_active && in_array((string) $user->role, $this->edit_roles ?? [], true));
    }

    private function canManage(User $user): bool
    {
        return $user->can(CampusPermission::CUSTOM_FIELDS_MANAGE);
    }
}
