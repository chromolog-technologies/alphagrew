<?php

namespace App\Support\Owner;

/**
 * Platform-owner permissions (Owner Dashboard SRS §3). Deliberately separate from the
 * institution permissions in CampusPermission and from Spatie/Gate: Gate::before lets every
 * institution admin through, so owner routes check these with User::ownerCan() instead.
 * Super Admins hold all of them; platform staff hold their platform role's list.
 */
final class OwnerPermission
{
    public const DASHBOARD_VIEW = 'owner.dashboard.view';

    public const INSTITUTIONS_VIEW = 'owner.institutions.view';
    public const INSTITUTIONS_CREATE = 'owner.institutions.create';
    public const INSTITUTIONS_EDIT = 'owner.institutions.edit';
    public const INSTITUTIONS_VERIFY = 'owner.institutions.verify';
    public const INSTITUTIONS_SUSPEND = 'owner.institutions.suspend';
    public const INSTITUTIONS_EXPORT = 'owner.institutions.export';

    public const USERS_VIEW = 'owner.users.view';
    public const USERS_INVITE = 'owner.users.invite';
    public const USERS_SUSPEND = 'owner.users.suspend';
    public const USERS_SESSIONS = 'owner.users.sessions';

    public const ROLES_VIEW = 'owner.roles.view';
    public const ROLES_MANAGE = 'owner.roles.manage';

    public const SETTINGS_VIEW = 'owner.settings.view';
    public const SETTINGS_MANAGE = 'owner.settings.manage';

    public const AUDIT_VIEW = 'owner.audit.view';
    public const SECURITY_VIEW = 'owner.security.view';
    public const SYSTEM_VIEW = 'owner.system.view';

    /** module => [permission => label], for the role editor. */
    public const CATALOG = [
        'Overview' => [
            self::DASHBOARD_VIEW => 'View the platform overview',
        ],
        'Institutions' => [
            self::INSTITUTIONS_VIEW => 'View institutions',
            self::INSTITUTIONS_CREATE => 'Create institutions',
            self::INSTITUTIONS_EDIT => 'Edit institution profiles',
            self::INSTITUTIONS_VERIFY => 'Verify institutions',
            self::INSTITUTIONS_SUSPEND => 'Change lifecycle (activate, suspend, reactivate, close)',
            self::INSTITUTIONS_EXPORT => 'Export institution lists',
        ],
        'Users' => [
            self::USERS_VIEW => 'View users',
            self::USERS_INVITE => 'Invite platform staff',
            self::USERS_SUSPEND => 'Suspend and reactivate users',
            self::USERS_SESSIONS => 'Reset passwords and revoke sessions',
        ],
        'Roles' => [
            self::ROLES_VIEW => 'View platform roles',
            self::ROLES_MANAGE => 'Create and change platform roles',
        ],
        'Settings' => [
            self::SETTINGS_VIEW => 'View global settings',
            self::SETTINGS_MANAGE => 'Change global settings and maintenance mode',
        ],
        'Security' => [
            self::AUDIT_VIEW => 'Search the audit log',
            self::SECURITY_VIEW => 'View login history and sessions',
        ],
        'System' => [
            self::SYSTEM_VIEW => 'View system health',
        ],
    ];

    /** @return list<string> */
    public static function all(): array
    {
        return array_merge(...array_map('array_keys', array_values(self::CATALOG)));
    }

    /**
     * The platform roles of SRS §3, created as system roles. Finance and sales have little in
     * R1 because billing and CRM arrive in later releases.
     *
     * @return list<array{name: string, slug: string, description: string, permissions: list<string>}>
     */
    public static function systemRoles(): array
    {
        $read = [self::DASHBOARD_VIEW, self::INSTITUTIONS_VIEW];

        return [
            ['name' => 'Platform Manager', 'slug' => 'platform-manager', 'description' => 'Institution operations, onboarding and user support.', 'permissions' => [
                ...$read, self::INSTITUTIONS_CREATE, self::INSTITUTIONS_EDIT, self::INSTITUTIONS_VERIFY, self::INSTITUTIONS_SUSPEND, self::INSTITUTIONS_EXPORT,
                self::USERS_VIEW, self::USERS_SUSPEND, self::USERS_SESSIONS, self::SYSTEM_VIEW,
            ]],
            ['name' => 'Finance Manager', 'slug' => 'finance-manager', 'description' => 'Plans, invoices and revenue (billing arrives in release 2).', 'permissions' => [
                ...$read, self::INSTITUTIONS_EXPORT,
            ]],
            ['name' => 'Support Manager', 'slug' => 'support-manager', 'description' => 'Customer records, institution status and user support.', 'permissions' => [
                ...$read, self::USERS_VIEW, self::USERS_SESSIONS,
            ]],
            ['name' => 'Technical Admin', 'slug' => 'technical-admin', 'description' => 'System health, maintenance mode and settings.', 'permissions' => [
                self::DASHBOARD_VIEW, self::SYSTEM_VIEW, self::SETTINGS_VIEW, self::SETTINGS_MANAGE, self::SECURITY_VIEW,
            ]],
            ['name' => 'Security Auditor', 'slug' => 'security-auditor', 'description' => 'Read-only security events, audit logs and access reports.', 'permissions' => [
                self::DASHBOARD_VIEW, self::INSTITUTIONS_VIEW, self::USERS_VIEW, self::ROLES_VIEW, self::SETTINGS_VIEW, self::AUDIT_VIEW, self::SECURITY_VIEW, self::SYSTEM_VIEW,
            ]],
            ['name' => 'Sales / Customer Success', 'slug' => 'customer-success', 'description' => 'Onboarding status and approved institution summaries.', 'permissions' => [
                ...$read,
            ]],
        ];
    }
}
