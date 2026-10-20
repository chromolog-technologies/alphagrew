<?php

namespace App\Http\Resources;

use App\Models\User;
use App\Services\Campus\CampusDataService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A staff or placement-officer account as listed on the admin Staff screen.
 *
 * @mixin User
 */
class StaffMemberResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role,
            'title' => $this->title,
            'designationId' => $this->designation_id,
            'designationName' => $this->designation?->name,
            'departmentCode' => $this->department_code,
            'permissions' => app(CampusDataService::class)->permissionsFor($this->resource),
        ];
    }
}
