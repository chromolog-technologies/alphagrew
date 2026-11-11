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

    // Release 3 — Product Oversight & Reporting.
    public const OVERSIGHT_VIEW = 'owner.oversight.view';
    public const REPORTS_VIEW = 'owner.reports.view';
    public const REPORTS_EXPORT = 'owner.reports.export';

    // Release 4 — Operations, Customer Success, Integrations & Data Management.
    public const ONBOARDING_VIEW = 'owner.onboarding.view';
    public const ONBOARDING_MANAGE = 'owner.onboarding.manage';
    public const CRM_VIEW = 'owner.crm.view';
    public const CRM_MANAGE = 'owner.crm.manage';
    public const SUPPORT_VIEW = 'owner.support.view';
    public const SUPPORT_MANAGE = 'owner.support.manage';
    public const INTEGRATIONS_VIEW = 'owner.integrations.view';
    public const INTEGRATIONS_MANAGE = 'owner.integrations.manage';
    public const DATA_VIEW = 'owner.data.view';
    public const DATA_MANAGE = 'owner.data.manage';

    // Release 4/5 — Announcements, CMS & Product Releases.
    public const COMMUNICATIONS_VIEW = 'owner.communications.view';
    public const COMMUNICATIONS_MANAGE = 'owner.communications.manage';

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
            self::SYSTEM_VIEW => 'View system health and incidents',
        ],
        'Product Oversight & Reports' => [
            self::OVERSIGHT_VIEW => 'View cross-institution academic, placement, assessment, resume and AI interview oversight',
            self::REPORTS_VIEW => 'View analytics and generate report previews',
            self::REPORTS_EXPORT => 'Export reports and manage scheduled reports',
        ],
        'Onboarding & CRM' => [
            self::ONBOARDING_VIEW => 'View institution onboarding requests and checklists',
            self::ONBOARDING_MANAGE => 'Manage onboarding stages and convert requests into institutions',
            self::CRM_VIEW => 'View sales leads and follow-up pipeline',
            self::CRM_MANAGE => 'Create, update and convert CRM leads',
        ],
        'Support' => [
            self::SUPPORT_VIEW => 'View support tickets, SLA timers and customer feedback',
            self::SUPPORT_MANAGE => 'Reply to, escalate and resolve support tickets',
        ],
        'Communications & Content' => [
            self::COMMUNICATIONS_VIEW => 'View announcements, CMS pages and product releases',
            self::COMMUNICATIONS_MANAGE => 'Publish announcements, CMS pages and product releases',
        ],
        'Integrations & Data' => [
            self::INTEGRATIONS_VIEW => 'View integrations catalog, API clients and webhooks',
            self::INTEGRATIONS_MANAGE => 'Configure integrations, issue API keys and manage webhooks',
            self::DATA_VIEW => 'View backups, restore verifications and tenant data requests',
            self::DATA_MANAGE => 'Trigger backups, verify restores and approve export/deletion requests',
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
                self::OVERSIGHT_VIEW, self::REPORTS_VIEW, self::REPORTS_EXPORT,
                self::ONBOARDING_VIEW, self::ONBOARDING_MANAGE, self::SUPPORT_VIEW, self::SUPPORT_MANAGE,
                self::COMMUNICATIONS_VIEW, self::COMMUNICATIONS_MANAGE, self::DATA_VIEW,
            ]],
            ['name' => 'Finance Manager', 'slug' => 'finance-manager', 'description' => 'Plans, subscriptions, invoices, payments, refunds and revenue reports.', 'permissions' => [
                ...$read, self::INSTITUTIONS_EXPORT,
                self::PLANS_VIEW, self::PLANS_MANAGE, self::SUBSCRIPTIONS_VIEW, self::SUBSCRIPTIONS_MANAGE,
                self::BILLING_VIEW, self::BILLING_MANAGE, self::BILLING_REFUND,
                self::AI_VIEW, self::AI_CREDITS, self::REPORTS_VIEW, self::REPORTS_EXPORT,
            ]],
            ['name' => 'Support Manager', 'slug' => 'support-manager', 'description' => 'Customer records, institution status, support tickets and user support.', 'permissions' => [
                ...$read, self::USERS_VIEW, self::USERS_SESSIONS, self::SUBSCRIPTIONS_VIEW,
                self::SUPPORT_VIEW, self::SUPPORT_MANAGE, self::ONBOARDING_VIEW, self::OVERSIGHT_VIEW, self::COMMUNICATIONS_VIEW,
            ]],
            ['name' => 'Technical Admin', 'slug' => 'technical-admin', 'description' => 'System health, AI providers, integrations, backups, maintenance mode and settings.', 'permissions' => [
                self::DASHBOARD_VIEW, self::SYSTEM_VIEW, self::SETTINGS_VIEW, self::SETTINGS_MANAGE, self::SECURITY_VIEW,
                self::AI_VIEW, self::AI_MANAGE, self::INTEGRATIONS_VIEW, self::INTEGRATIONS_MANAGE, self::DATA_VIEW, self::DATA_MANAGE,
                self::COMMUNICATIONS_VIEW, self::COMMUNICATIONS_MANAGE,
            ]],
            ['name' => 'Security Auditor', 'slug' => 'security-auditor', 'description' => 'Read-only security events, audit logs and access reports.', 'permissions' => [
                self::DASHBOARD_VIEW, self::INSTITUTIONS_VIEW, self::USERS_VIEW, self::ROLES_VIEW, self::SETTINGS_VIEW, self::AUDIT_VIEW, self::SECURITY_VIEW, self::SYSTEM_VIEW,
                self::PLANS_VIEW, self::SUBSCRIPTIONS_VIEW, self::BILLING_VIEW, self::AI_VIEW,
                self::OVERSIGHT_VIEW, self::REPORTS_VIEW, self::DATA_VIEW, self::INTEGRATIONS_VIEW, self::SUPPORT_VIEW,
            ]],
            ['name' => 'Sales / Customer Success', 'slug' => 'customer-success', 'description' => 'CRM leads, onboarding status and approved institution summaries.', 'permissions' => [
                ...$read, self::PLANS_VIEW, self::SUBSCRIPTIONS_VIEW,
                self::CRM_VIEW, self::CRM_MANAGE, self::ONBOARDING_VIEW, self::ONBOARDING_MANAGE, self::REPORTS_VIEW,
            ]],
        ];
    }
}
