<?php

namespace App\Enums;

/**
 * The six account types (PRD addendum "User Roles and Access", R2).
 * A role decides the portal; designations add permissions to staff inside one institution.
 *
 * users.role stores the enum value as a plain string.
 */
enum UserRole: string
{
    case SuperAdmin = 'super_admin';
    case InstitutionAdmin = 'institution_admin';
    case PlacementOfficer = 'placement_officer';
    case Staff = 'staff';
    case Student = 'student';
    case Recruiter = 'recruiter';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public function label(): string
    {
        return match ($this) {
            self::SuperAdmin => 'Super Admin',
            self::InstitutionAdmin => 'Institution Admin',
            self::PlacementOfficer => 'Placement Officer',
            self::Staff => 'Staff',
            self::Student => 'Student',
            self::Recruiter => 'Recruiter',
        };
    }

    /**
     * Full administrative access. Super Admin is platform-wide; Institution Admin
     * is limited to their institution once tenant scoping lands.
     */
    public function isAdmin(): bool
    {
        return $this === self::SuperAdmin || $this === self::InstitutionAdmin;
    }

    /** Institution employees managed through the staff endpoints. Both can hold a designation. */
    public function isInstitutionStaff(): bool
    {
        return $this === self::Staff || $this === self::PlacementOfficer;
    }

    /** Super Admin and Recruiter sit outside any institution. */
    public function requiresInstitution(): bool
    {
        return $this !== self::SuperAdmin && $this !== self::Recruiter;
    }

    /** Whether the web app has a portal for this role today. */
    public function hasPortal(): bool
    {
        return $this !== self::Recruiter;
    }
}
