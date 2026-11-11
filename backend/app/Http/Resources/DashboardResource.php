<?php

namespace App\Http\Resources;

use App\Models\Dashboard;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Dashboard
 */
class DashboardResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $isOwner = $this->isOwnedBy($request->user());

        return [
            'id' => $this->id,
            'key' => null,
            'name' => $this->name,
            'description' => $this->description,
            'templateKey' => $this->template_key,
            'isTemplate' => false,
            'isOwner' => $isOwner,
            'isHome' => $isOwner && $this->is_home,
            'owner' => ['id' => $this->owner_id, 'name' => $this->owner?->name],
            'sharing' => [
                'roles' => $this->shared_roles ?? [],
                'designationIds' => array_map('intval', $this->shared_designation_ids ?? []),
                'audienceDefault' => $this->audience_default,
            ],
            'widgets' => $this->widgets ?? [],
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }

    /**
     * A built-in template in the same shape, so the frontend renders both alike.
     *
     * @param  array{key: string, name: string, description: string, widgets: list<array<string, mixed>>}  $template
     */
    public static function template(array $template): array
    {
        return [
            'id' => null,
            'key' => $template['key'],
            'name' => $template['name'],
            'description' => $template['description'],
            'templateKey' => $template['key'],
            'isTemplate' => true,
            'isOwner' => false,
            'isHome' => false,
            'owner' => null,
            'sharing' => ['roles' => [], 'designationIds' => [], 'audienceDefault' => false],
            'widgets' => $template['widgets'],
            'updatedAt' => null,
        ];
    }
}
