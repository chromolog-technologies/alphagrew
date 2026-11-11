<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Owner Dashboard SRS v1.0 Releases 3, 4 & 5 schema:
 * - Reporting & Export audit (§5.15, §13): saved_reports, report_schedules, export_jobs
 * - Onboarding & CRM (§5.3, §5.17): leads, sales_activities, onboarding_requests, onboarding_checklists
 * - Support & SLA (§5.16): support_tickets, ticket_replies, ticket_attachments
 * - Announcements (§5.18): platform_announcements
 * - Integrations & API (§5.21): integrations, api_clients, webhooks, webhook_deliveries
 * - Backups & Data governance (§5.23): backup_records, data_requests
 * - CMS & Product Releases (§5.24, §5.25): cms_pages, cms_revisions, product_releases
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('saved_reports')) {
            Schema::create('saved_reports', function (Blueprint $table): void {
                $table->id();
                $table->string('name', 150);
                $table->string('report_key', 60);
                $table->json('filters')->nullable();
                $table->string('format', 20)->default('csv');
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->dateTime('last_run_at')->nullable();
                $table->timestamps();
                $table->index(['report_key', 'created_at']);
            });
        }

        if (! Schema::hasTable('report_schedules')) {
            Schema::create('report_schedules', function (Blueprint $table): void {
                $table->id();
                $table->string('name', 150);
                $table->string('report_key', 60);
                $table->json('filters')->nullable();
                $table->string('frequency', 20)->default('weekly'); // daily, weekly, monthly
                $table->string('format', 20)->default('csv');
                $table->json('recipients');
                $table->boolean('is_active')->default(true);
                $table->dateTime('next_run_at')->nullable();
                $table->dateTime('last_run_at')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('export_jobs')) {
            Schema::create('export_jobs', function (Blueprint $table): void {
                $table->id();
                $table->string('report_key', 60);
                $table->string('format', 20)->default('csv');
                $table->json('filters')->nullable();
                $table->unsignedInteger('row_count')->default(0);
                $table->string('status', 20)->default('completed');
                $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('file_name', 180)->nullable();
                $table->dateTime('exported_at');
                $table->timestamps();
                $table->index(['report_key', 'exported_at']);
            });
        }

        if (! Schema::hasTable('leads')) {
            Schema::create('leads', function (Blueprint $table): void {
                $table->id();
                $table->string('organization_name', 180);
                $table->string('contact_name', 120);
                $table->string('contact_email', 160);
                $table->string('contact_phone', 40)->nullable();
                $table->string('source', 60)->default('website'); // website, referral, outbound, event, partner
                $table->string('stage', 30)->default('new'); // new, contacted, demo_scheduled, proposal_sent, negotiation, won, lost
                $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('interested_plan_id')->nullable()->constrained('plans')->nullOnDelete();
                $table->unsignedInteger('expected_students')->nullable();
                $table->decimal('expected_mrr', 12, 2)->nullable();
                $table->dateTime('next_follow_up_at')->nullable();
                $table->string('demo_outcome', 255)->nullable();
                $table->string('lost_reason', 255)->nullable();
                $table->unsignedBigInteger('converted_onboarding_id')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
                $table->index(['stage', 'next_follow_up_at']);
            });
        }

        if (! Schema::hasTable('sales_activities')) {
            Schema::create('sales_activities', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('lead_id')->constrained('leads')->cascadeOnDelete();
                $table->string('activity_type', 30)->default('note'); // call, email, demo, proposal, note
                $table->string('summary', 255);
                $table->string('outcome', 255)->nullable();
                $table->dateTime('occurred_at');
                $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('onboarding_requests')) {
            Schema::create('onboarding_requests', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('lead_id')->nullable()->constrained('leads')->nullOnDelete();
                $table->foreignId('institution_id')->nullable()->constrained('institutions')->nullOnDelete();
                $table->string('institution_name', 180);
                $table->string('code', 50)->nullable();
                $table->string('institution_type', 40)->default('college');
                $table->string('contact_name', 120);
                $table->string('contact_email', 160);
                $table->string('contact_phone', 40)->nullable();
                $table->string('country', 80)->default('India');
                $table->string('state', 100)->nullable();
                $table->string('stage', 30)->default('new'); // new, verification, demo, proposal, agreement, payment, configuration, training, go_live
                $table->string('status', 20)->default('active'); // active, blocked, completed, cancelled
                $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
                $table->date('target_go_live_at')->nullable();
                $table->string('blocker_reason', 255)->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
                $table->index(['stage', 'status']);
            });
        }

        if (! Schema::hasTable('onboarding_checklists')) {
            Schema::create('onboarding_checklists', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('onboarding_request_id')->constrained('onboarding_requests')->cascadeOnDelete();
                $table->string('title', 180);
                $table->string('stage', 30);
                $table->boolean('is_completed')->default(false);
                $table->foreignId('completed_by')->nullable()->constrained('users')->nullOnDelete();
                $table->dateTime('completed_at')->nullable();
                $table->unsignedSmallInteger('sort_order')->default(0);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('support_tickets')) {
            Schema::create('support_tickets', function (Blueprint $table): void {
                $table->id();
                $table->string('ticket_number', 40)->unique();
                $table->foreignId('institution_id')->nullable()->constrained('institutions')->nullOnDelete();
                $table->foreignId('reporter_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
                $table->string('subject', 200);
                $table->text('description');
                $table->string('category', 50)->default('technical'); // technical, billing, onboarding, ai, academic, placement, security, other
                $table->string('priority', 20)->default('medium'); // low, medium, high, urgent
                $table->string('status', 30)->default('open'); // open, in_progress, waiting_customer, escalated, resolved, closed
                $table->dateTime('first_response_due_at');
                $table->dateTime('first_responded_at')->nullable();
                $table->dateTime('resolution_due_at');
                $table->dateTime('resolved_at')->nullable();
                $table->unsignedTinyInteger('escalation_level')->default(0);
                $table->unsignedTinyInteger('csat_score')->nullable();
                $table->string('csat_comment', 255)->nullable();
                $table->timestamps();
                $table->index(['status', 'priority', 'created_at']);
            });
        }

        if (! Schema::hasTable('ticket_replies')) {
            Schema::create('ticket_replies', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('ticket_id')->constrained('support_tickets')->cascadeOnDelete();
                $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete();
                $table->text('body');
                $table->boolean('is_internal')->default(false);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('ticket_attachments')) {
            Schema::create('ticket_attachments', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('ticket_id')->constrained('support_tickets')->cascadeOnDelete();
                $table->foreignId('reply_id')->nullable()->constrained('ticket_replies')->nullOnDelete();
                $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
                $table->string('original_name', 200);
                $table->string('disk_path', 255);
                $table->string('mime_type', 100);
                $table->unsignedInteger('size_bytes');
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('platform_announcements')) {
            Schema::create('platform_announcements', function (Blueprint $table): void {
                $table->id();
                $table->string('title', 200);
                $table->text('body');
                $table->string('category', 40)->default('general'); // general, maintenance, release, billing, security
                $table->string('priority', 20)->default('normal'); // low, normal, high, critical
                $table->json('channels'); // ['in_app', 'email', 'sms', 'push']
                $table->string('target_scope', 30)->default('all'); // all, institutions, roles
                $table->json('target_institution_ids')->nullable();
                $table->json('target_roles')->nullable();
                $table->string('status', 20)->default('draft'); // draft, scheduled, published, archived
                $table->dateTime('scheduled_at')->nullable();
                $table->dateTime('published_at')->nullable();
                $table->unsignedInteger('delivered_count')->default(0);
                $table->unsignedInteger('failed_count')->default(0);
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
                $table->index(['status', 'published_at']);
            });
        }

        if (! Schema::hasTable('integrations')) {
            Schema::create('integrations', function (Blueprint $table): void {
                $table->id();
                $table->string('key', 60)->unique();
                $table->string('name', 120);
                $table->string('category', 30); // ai, speech, email, sms, payment, storage, webhook
                $table->string('provider', 80);
                $table->string('status', 20)->default('active'); // active, inactive, error
                $table->json('config_masked')->nullable();
                $table->boolean('secret_configured')->default(false);
                $table->text('encrypted_secret')->nullable();
                $table->dateTime('last_tested_at')->nullable();
                $table->string('last_test_status', 20)->nullable();
                $table->string('last_test_message', 255)->nullable();
                $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('api_clients')) {
            Schema::create('api_clients', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('institution_id')->nullable()->constrained('institutions')->nullOnDelete();
                $table->string('name', 120);
                $table->string('key_prefix', 20);
                $table->string('key_hash', 64)->unique();
                $table->json('scopes');
                $table->unsignedInteger('rate_limit_per_min')->default(60);
                $table->string('status', 20)->default('active'); // active, revoked
                $table->dateTime('last_used_at')->nullable();
                $table->dateTime('expires_at')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('webhooks')) {
            Schema::create('webhooks', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('institution_id')->nullable()->constrained('institutions')->nullOnDelete();
                $table->string('name', 120);
                $table->string('url', 255);
                $table->json('events');
                $table->string('secret_masked', 32)->nullable();
                $table->text('encrypted_secret')->nullable();
                $table->boolean('is_active')->default(true);
                $table->dateTime('last_delivery_at')->nullable();
                $table->unsignedSmallInteger('last_status_code')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('webhook_deliveries')) {
            Schema::create('webhook_deliveries', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('webhook_id')->constrained('webhooks')->cascadeOnDelete();
                $table->string('event', 80);
                $table->unsignedSmallInteger('response_status')->nullable();
                $table->boolean('success')->default(false);
                $table->unsignedInteger('duration_ms')->nullable();
                $table->string('error_message', 255)->nullable();
                $table->dateTime('delivered_at');
            });
        }

        if (! Schema::hasTable('backup_records')) {
            Schema::create('backup_records', function (Blueprint $table): void {
                $table->id();
                $table->string('backup_type', 20)->default('full'); // full, incremental, config
                $table->string('scope', 20)->default('platform'); // platform, institution
                $table->foreignId('institution_id')->nullable()->constrained('institutions')->nullOnDelete();
                $table->string('storage_location', 255);
                $table->decimal('size_mb', 10, 2)->nullable();
                $table->string('status', 20)->default('completed'); // scheduled, running, completed, failed
                $table->boolean('verified')->default(false);
                $table->dateTime('restore_tested_at')->nullable();
                $table->string('restore_outcome', 20)->nullable(); // passed, failed
                $table->date('retention_until')->nullable();
                $table->string('notes', 500)->nullable();
                $table->foreignId('triggered_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('data_requests')) {
            Schema::create('data_requests', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('institution_id')->constrained('institutions')->cascadeOnDelete();
                $table->string('request_type', 20); // export, deletion
                $table->string('status', 20)->default('pending'); // pending, approved, rejected, completed
                $table->string('reason', 500);
                $table->string('approval_confirmation', 120)->nullable();
                $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
                $table->dateTime('reviewed_at')->nullable();
                $table->dateTime('completed_at')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('cms_pages')) {
            Schema::create('cms_pages', function (Blueprint $table): void {
                $table->id();
                $table->string('content_type', 30)->default('page'); // page, faq, policy, release_note
                $table->string('slug', 160)->unique();
                $table->string('title', 200);
                $table->string('summary', 400)->nullable();
                $table->longText('body');
                $table->string('seo_title', 160)->nullable();
                $table->string('seo_description', 320)->nullable();
                $table->string('status', 20)->default('draft'); // draft, review, published, scheduled, archived
                $table->dateTime('scheduled_at')->nullable();
                $table->dateTime('published_at')->nullable();
                $table->unsignedInteger('current_version')->default(1);
                $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('cms_revisions')) {
            Schema::create('cms_revisions', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('cms_page_id')->constrained('cms_pages')->cascadeOnDelete();
                $table->unsignedInteger('version_number');
                $table->string('title', 200);
                $table->longText('body');
                $table->foreignId('editor_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('change_note', 255)->nullable();
                $table->dateTime('created_at');
            });
        }

        if (! Schema::hasTable('product_releases')) {
            Schema::create('product_releases', function (Blueprint $table): void {
                $table->id();
                $table->string('version', 40)->unique();
                $table->string('title', 200);
                $table->string('release_type', 20)->default('minor'); // major, minor, patch, hotfix
                $table->date('release_date')->nullable();
                $table->string('deployment_status', 20)->default('planned'); // planned, staging, deployed, rolled_back
                $table->string('publication_status', 20)->default('draft'); // draft, published, archived
                $table->json('features')->nullable();
                $table->json('fixes')->nullable();
                $table->json('affected_modules')->nullable();
                $table->string('target_scope', 30)->default('all'); // all, institutions
                $table->json('target_institution_ids')->nullable();
                $table->longText('notes')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        foreach ([
            'product_releases',
            'cms_revisions',
            'cms_pages',
            'data_requests',
            'backup_records',
            'webhook_deliveries',
            'webhooks',
            'api_clients',
            'integrations',
            'platform_announcements',
            'ticket_attachments',
            'ticket_replies',
            'support_tickets',
            'onboarding_checklists',
            'onboarding_requests',
            'sales_activities',
            'leads',
            'export_jobs',
            'report_schedules',
            'saved_reports',
        ] as $table) {
            Schema::dropIfExists($table);
        }
    }
};

