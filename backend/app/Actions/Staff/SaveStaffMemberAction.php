<?php

namespace App\Actions\Staff;

use App\DTOs\StaffMemberData;
use App\Enums\UserRole;
use App\Models\Designation;
use App\Models\User;
use App\Support\Campus\CampusPermission;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Creates or updates a staff / placement-officer account: profile fields, photo,
 * role, and permissions (role base + designation).
 */
class SaveStaffMemberAction
{
    /**
     * @param  User|null  $staff  Existing account to update, or null to create one.
     * @param  int|null  $institutionId  Required when creating.
     */
    public function execute(StaffMemberData $data, ?User $staff = null, ?int $institutionId = null): User
    {
        $designation = Designation::query()->findOrFail($data->designationId);
        $role = $data->role ?? $staff?->role ?? UserRole::Staff->value;

        $attributes = [
            'name' => $data->name,
            'email' => $data->email,
            'role' => $role,
            'title' => $designation->name,
            'department_code' => $data->departmentCode,
            'designation_id' => $designation->id,
            'phone' => $data->phone,
            'image_url' => $this->storeImage($data->image, $staff?->image_url),
            'communication_address' => $data->communicationAddress,
            'permanent_address' => $data->permanentAddress,
            'emergency_contact_person' => $data->emergencyContactPerson,
            'emergency_contact_number' => $data->emergencyContactNumber,
            'biometric_id' => $data->biometricId,
            'experience_years' => $data->experienceYears,
            'specialization' => $data->specialization,
            ...(! empty($data->password) ? ['password' => $data->password] : []),
        ];

        if ($staff) {
            $staff->update($attributes);
        } else {
            $staff = User::query()->create([
                ...$attributes,
                'institution_id' => $institutionId,
                'email_verified_at' => now(),
            ]);
        }

        $staff->syncRoles([$role]);
        $staff->syncPermissions(CampusPermission::forRole($role, $designation->resolvedPermissions()));

        return $staff;
    }

    /**
     * Stores a new photo on the public disk, removing the previous local one.
     * Returns the current path unchanged when no new photo was uploaded.
     */
    private function storeImage(?UploadedFile $image, ?string $currentPath): ?string
    {
        if (! $image) {
            return $currentPath;
        }

        if ($currentPath && ! Str::startsWith($currentPath, ['http://', 'https://'])) {
            $relativePath = Str::startsWith($currentPath, '/storage/')
                ? Str::after($currentPath, '/storage/')
                : ltrim($currentPath, '/');

            Storage::disk('public')->delete($relativePath);
        }

        return $image->store('staff-images', 'public');
    }
}
