<?php

namespace App\DTOs;

use App\Support\Campus\CampusMasterCatalog;

/**
 * Student fields shared by admin/staff create and update and by self-registration.
 */
final readonly class StudentData
{
    /**
     * @param  list<string>  $skills
     */
    public function __construct(
        public string $name,
        public string $email,
        public ?string $password,
        public ?string $departmentCode,
        public string $year,
        public string $gender,
        public ?string $status,
        public float $cgpa,
        public int $attendance,
        public ?string $phone,
        public string $feeStatus,
        public array $skills,
    ) {
    }

    /**
     * @param  array<string, mixed>  $validated  Output of StoreStudentRequest / UpdateStudentRequest.
     */
    public static function fromValidated(array $validated): self
    {
        return new self(
            name: $validated['name'],
            email: $validated['email'],
            password: $validated['password'] ?? null,
            departmentCode: $validated['departmentCode'] ?? null,
            year: $validated['year'],
            gender: $validated['gender'],
            status: $validated['status'] ?? null,
            cgpa: (float) $validated['cgpa'],
            attendance: (int) $validated['attendance'],
            phone: $validated['phone'] ?? null,
            feeStatus: $validated['feeStatus'],
            skills: $validated['skills'] ?? [],
        );
    }

    /**
     * A new applicant: first year, no academic record yet, fees pending.
     */
    public static function forSelfRegistration(string $name, string $email, string $password, string $departmentCode): self
    {
        return new self(
            name: $name,
            email: $email,
            password: $password,
            departmentCode: $departmentCode,
            year: CampusMasterCatalog::normalizeValue(CampusMasterCatalog::STUDENT_YEAR, '1st Year') ?? 'year_1',
            gender: CampusMasterCatalog::normalizeValue(CampusMasterCatalog::STUDENT_GENDER, 'Prefer not to say') ?? 'prefer_not_to_say',
            status: CampusMasterCatalog::normalizeValue(CampusMasterCatalog::STUDENT_STATUS, 'Active') ?? 'active',
            cgpa: 0,
            attendance: 0,
            phone: '',
            feeStatus: CampusMasterCatalog::normalizeValue(CampusMasterCatalog::PAYMENT_STATUS, 'Pending') ?? 'pending',
            skills: [],
        );
    }
}
