<?php

namespace App\Http\Resources;

use App\Models\CustomModule;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CustomModule
 */
class CustomModuleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $request->user();

        return [
            'id' => $this->id,
            'key' => $this->key,
            'entity' => $this->customFieldEntity(),
            'pluralLabel' => $this->plural_label,
            'singularLabel' => $this->singular_label,
            'category' => $this->category,
            'description' => $this->description,
            'viewRoles' => $this->view_roles ?? [],
            'editRoles' => $this->edit_roles ?? [],
            'isActive' => $this->is_active,
            'sortOrder' => $this->sort_order,
            'recordsCount' => $this->whenCounted('records'),
            'canEdit' => $user ? $this->canEdit($user) : false,
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
