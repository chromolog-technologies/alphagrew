<?php

namespace App\DTOs;

use Illuminate\Http\UploadedFile;

/**
 * Fields for creating or updating a staff or placement-officer account.
 */
final readonly class StaffMemberData
{
    public function __construct(
        public string $name,
        public string $email,
        public ?string $role,
        public int $designationId,
        public string $departmentCode,
        public ?string $password,
        public ?string $phone,
        public ?string $communicationAddress,
        public ?string $permanentAddress,
        public ?string $emergencyContactPerson,
        public ?string $emergencyContactNumber,
        public ?string $biometricId,
        public ?int $experienceYears,
        public ?string $specialization,
        public ?UploadedFile $image,
    ) {
    }

    /**
     * @param  array<string, mixed>  $validated  Output of StoreStaffMemberRequest / UpdateStaffMemberRequest.
     */
    public static function fromValidated(array $validated, ?UploadedFile $image): self
    {
        return new self(
            name: $validated['name'],
            email: $validated['email'],
            role: $validated['role'] ?? null,
            designationId: (int) $validated['designationId'],
            departmentCode: strtoupper($validated['departmentCode']),
            password: $validated['password'] ?? null,
            phone: $validated['phone'] ?? null,
            communicationAddress: $validated['communicationAddress'] ?? null,
            permanentAddress: $validated['permanentAddress'] ?? null,
            emergencyContactPerson: $validated['emergencyContactPerson'] ?? null,
            emergencyContactNumber: $validated['emergencyContactNumber'] ?? null,
            biometricId: $validated['biometricId'] ?? null,
            experienceYears: isset($validated['experienceYears']) ? (int) $validated['experienceYears'] : null,
            specialization: $validated['specialization'] ?? null,
            image: $image,
        );
    }
}
