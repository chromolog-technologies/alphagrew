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

    // Release 2 — SaaS Commercial Controls (Plans, Subscriptions, Billing, AI Credits).
    public const PLANS_VIEW = 'owner.plans.view';
    public const PLANS_MANAGE = 'owner.plans.manage';

    public const SUBSCRIPTIONS_VIEW = 'owner.subscriptions.view';
    public const SUBSCRIPTIONS_MANAGE = 'owner.subscriptions.manage';

    public const BILLING_VIEW = 'owner.billing.view';
    public const BILLING_MANAGE = 'owner.billing.manage';
    public const BILLING_REFUND = 'owner.billing.refund';

    public const AI_VIEW = 'owner.ai.view';
    public const AI_MANAGE = 'owner.ai.manage';
    public const AI_CREDITS = 'owner.ai.credits';

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
        'Plans & Subscriptions' => [
            self::PLANS_VIEW => 'View plans and feature entitlements',
            self::PLANS_MANAGE => 'Create, edit, publish and archive plans',
            self::SUBSCRIPTIONS_VIEW => 'View institution subscriptions and trials',
            self::SUBSCRIPTIONS_MANAGE => 'Assign, upgrade, pause, extend and cancel subscriptions',
        ],
        'Billing & Finance' => [
            self::BILLING_VIEW => 'View invoices, payments, refunds and revenue',
            self::BILLING_MANAGE => 'Generate invoices, record payments, manage tax and coupons',
            self::BILLING_REFUND => 'Approve and execute payment refunds',
        ],
        'AI & Credits' => [
            self::AI_VIEW => 'View AI usage logs, wallets and providers',
            self::AI_MANAGE => 'Configure AI rate cards, quotas and warning thresholds',
            self::AI_CREDITS => 'Allocate and adjust AI credits',
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
     * The platform roles of SRS §3, created as system roles.
     *
     * @return list<array{name: string, slug: string, description: string, permissions: list<string>}>
     */
    public static function systemRoles(): array
    {
        $read = [self::DASHBOARD_VIEW, self::INSTITUTIONS_VIEW];

        return [
            ['name' => 'Platform Manager', 'slug' => 'platform-manager', 'description' => 'Institution operations, onboarding, subscriptions and user support.', 'permissions' => [
                ...$read, self::INSTITUTIONS_CREATE, self::INSTITUTIONS_EDIT, self::INSTITUTIONS_VERIFY, self::INSTITUTIONS_SUSPEND, self::INSTITUTIONS_EXPORT,
                self::USERS_VIEW, self::USERS_SUSPEND, self::USERS_SESSIONS, self::SYSTEM_VIEW,
                self::PLANS_VIEW, self::SUBSCRIPTIONS_VIEW, self::SUBSCRIPTIONS_MANAGE, self::AI_VIEW,
            ]],
            ['name' => 'Finance Manager', 'slug' => 'finance-manager', 'description' => 'Plans, subscriptions, invoices, payments, refunds and revenue reports.', 'permissions' => [
                ...$read, self::INSTITUTIONS_EXPORT,
                self::PLANS_VIEW, self::PLANS_MANAGE, self::SUBSCRIPTIONS_VIEW, self::SUBSCRIPTIONS_MANAGE,
                self::BILLING_VIEW, self::BILLING_MANAGE, self::BILLING_REFUND,
                self::AI_VIEW, self::AI_CREDITS,
            ]],
            ['name' => 'Support Manager', 'slug' => 'support-manager', 'description' => 'Customer records, institution status and user support.', 'permissions' => [
                ...$read, self::USERS_VIEW, self::USERS_SESSIONS, self::SUBSCRIPTIONS_VIEW,
            ]],
            ['name' => 'Technical Admin', 'slug' => 'technical-admin', 'description' => 'System health, AI providers, maintenance mode and settings.', 'permissions' => [
                self::DASHBOARD_VIEW, self::SYSTEM_VIEW, self::SETTINGS_VIEW, self::SETTINGS_MANAGE, self::SECURITY_VIEW,
                self::AI_VIEW, self::AI_MANAGE,
            ]],
            ['name' => 'Security Auditor', 'slug' => 'security-auditor', 'description' => 'Read-only security events, audit logs and access reports.', 'permissions' => [
                self::DASHBOARD_VIEW, self::INSTITUTIONS_VIEW, self::USERS_VIEW, self::ROLES_VIEW, self::SETTINGS_VIEW, self::AUDIT_VIEW, self::SECURITY_VIEW, self::SYSTEM_VIEW,
                self::PLANS_VIEW, self::SUBSCRIPTIONS_VIEW, self::BILLING_VIEW, self::AI_VIEW,
            ]],
            ['name' => 'Sales / Customer Success', 'slug' => 'customer-success', 'description' => 'Onboarding status and approved institution summaries.', 'permissions' => [
                ...$read, self::PLANS_VIEW, self::SUBSCRIPTIONS_VIEW,
            ]],
        ];
    }
}
