<?php

namespace App\Services\Owner;

use App\Models\AiInterview;
use App\Models\AiResumeAnalysis;
use App\Models\BackupRecord;
use App\Models\Company;
use App\Models\Exam;
use App\Models\Institution;
use App\Models\Invoice;
use App\Models\JobApplication;
use App\Models\MarkEntry;
use App\Models\Payment;
use App\Models\Resume;
use App\Models\SemesterResult;
use App\Models\Subscription;
use App\Models\SupportTicket;
use App\Models\SystemIncident;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Generates cross-tenant aggregate datasets for all 11 SRS §13 report types.
 * Never returns raw resume documents, audio transcripts, or student secrets.
 */
class ReportBuilder
{
    public const REPORTS = [
        'institution' => ['label' => 'Institution Master & Health', 'description' => 'Tenant onboarding, verification, lifecycle status and scale.'],
        'user' => ['label' => 'User & Access Report', 'description' => 'Role distribution, MFA posture and verification coverage.'],
        'subscription' => ['label' => 'Subscription & Renewal', 'description' => 'Active, trial, past-due and churned SaaS subscriptions.'],
        'revenue' => ['label' => 'Billing & Revenue Report', 'description' => 'Invoices, taxes, discounts, collections and outstanding balances.'],
        'ai_usage' => ['label' => 'AI Usage & Credit Consumption', 'description' => 'Provider calls, token volumes, credit debits and failures.'],
        'placement' => ['label' => 'Placement & Hiring Outcomes', 'description' => 'Recruiters, applications, offers, placements and CTC trends.'],
        'assessment' => ['label' => 'Assessment & Exam Outcomes', 'description' => 'Exam completions, pass rates and score aggregates.'],
        'resume' => ['label' => 'Resume Intelligence Oversight', 'description' => 'Resume parsing success and ATS evaluation aggregates.'],
        'interview' => ['label' => 'AI Interview Usage & Performance', 'description' => 'Session volumes, evaluation scores and latency aggregates.'],
        'support' => ['label' => 'Support & SLA Operations', 'description' => 'Ticket backlog, priorities, SLA attainment and CSAT scores.'],
        'system' => ['label' => 'System Health & Backups', 'description' => 'Incidents, backup completion and restore verification status.'],
    ];

    /**
     * @param  array<string, mixed>  $filters
     * @return array{key: string, label: string, columns: list<string>, rows: list<list<string|int|float|null>>, summary: array<string, mixed>}
     */
    public function build(string $reportKey, array $filters = [], int $limit = 250): array
    {
        if (! array_key_exists($reportKey, self::REPORTS)) {
            $reportKey = 'institution';
        }

        $from = isset($filters['from']) ? Carbon::parse($filters['from'])->startOfDay() : now()->subDays(89)->startOfDay();
        $to = isset($filters['to']) ? Carbon::parse($filters['to'])->endOfDay() : now()->endOfDay();
        $institutionId = isset($filters['institutionId']) && $filters['institutionId'] !== '' ? (int) $filters['institutionId'] : null;
        $status = isset($filters['status']) && $filters['status'] !== '' ? (string) $filters['status'] : null;

        return match ($reportKey) {
            'institution' => $this->institutionReport($institutionId, $status, $limit),
            'user' => $this->userReport($institutionId, $status, $limit),
            'subscription' => $this->subscriptionReport($institutionId, $status, $limit),
            'revenue' => $this->revenueReport($from, $to, $institutionId, $status, $limit),
            'ai_usage' => $this->aiUsageReport($from, $to, $institutionId, $limit),
            'placement' => $this->placementReport($from, $to, $institutionId, $limit),
            'assessment' => $this->assessmentReport($institutionId, $limit),
            'resume' => $this->resumeReport($institutionId, $limit),
            'interview' => $this->interviewReport($institutionId, $limit),
            'support' => $this->supportReport($from, $to, $institutionId, $status, $limit),
            'system' => $this->systemReport($limit),
        };
    }

    private function institutionReport(?int $institutionId, ?string $status, int $limit): array
    {
        $rows = Institution::query()
            ->when($institutionId, fn ($q) => $q->where('id', $institutionId))
            ->when($status, fn ($q) => $q->where('status', $status))
            ->withCount(['users' => fn ($q) => $q->withoutGlobalScopes()])
            ->withCount(['students' => fn ($q) => $q->withoutGlobalScopes()])
            ->orderBy('name')->limit($limit)->get();

        return [
            'key' => 'institution',
            'label' => self::REPORTS['institution']['label'],
            'columns' => ['Code', 'Institution', 'Type', 'Status', 'Verification', 'Users', 'Students', 'Created At'],
            'rows' => $rows->map(fn (Institution $i) => [
                $i->code, $i->name, $i->institution_type, $i->status, $i->verification_status,
                (int) $i->users_count, (int) $i->students_count, $i->created_at?->toDateString(),
            ])->all(),
            'summary' => ['totalInstitutions' => $rows->count(), 'totalStudents' => $rows->sum('students_count')],
        ];
    }

    private function userReport(?int $institutionId, ?string $status, int $limit): array
    {
        $rows = User::query()->withoutGlobalScopes()->whereNull('deleted_at')
            ->with('institution:id,name')
            ->when($institutionId, fn ($q) => $q->where('institution_id', $institutionId))
            ->when($status, fn ($q) => $q->where('status', $status))
            ->latest('id')->limit($limit)->get();

        return [
            'key' => 'user',
            'label' => self::REPORTS['user']['label'],
            'columns' => ['Name', 'Email', 'Role', 'Institution', 'Status', 'Verified', 'MFA', 'Last Login'],
            'rows' => $rows->map(fn (User $u) => [
                $u->name, $u->email, $u->role, $u->institution?->name ?? 'Platform',
                $u->status ?? 'active', $u->email_verified_at ? 'Yes' : 'No', $u->mfa_enabled_at ? 'Yes' : 'No',
                $u->last_login_at?->toDateString(),
            ])->all(),
            'summary' => ['usersCount' => $rows->count(), 'mfaEnabled' => $rows->filter(fn (User $u) => $u->mfa_enabled_at !== null)->count()],
        ];
    }

    private function subscriptionReport(?int $institutionId, ?string $status, int $limit): array
    {
        $rows = Subscription::query()
            ->with(['institution:id,name,code', 'plan:id,code,name'])
            ->when($institutionId, fn ($q) => $q->where('institution_id', $institutionId))
            ->when($status, fn ($q) => $q->where('status', $status))
            ->latest('id')->limit($limit)->get();

        return [
            'key' => 'subscription',
            'label' => self::REPORTS['subscription']['label'],
            'columns' => ['Institution', 'Code', 'Plan', 'Cycle', 'Status', 'Amount', 'Currency', 'Renewal At'],
            'rows' => $rows->map(fn (Subscription $s) => [
                $s->institution?->name, $s->institution?->code, $s->plan?->name, $s->billing_cycle,
                $s->status, round((float) $s->amount, 2), $s->currency, $s->renewal_at?->toDateString(),
            ])->all(),
            'summary' => [
                'subscriptions' => $rows->count(),
                'mrr' => round($rows->whereIn('status', ['active', 'past_due'])->sum(fn (Subscription $s) => $s->monthlyEquivalent()), 2),
            ],
        ];
    }

    private function revenueReport(Carbon $from, Carbon $to, ?int $institutionId, ?string $status, int $limit): array
    {
        $rows = Invoice::query()
            ->with('institution:id,name,code')
            ->whereBetween('created_at', [$from, $to])
            ->when($institutionId, fn ($q) => $q->where('institution_id', $institutionId))
            ->when($status, fn ($q) => $q->where('status', $status))
            ->latest('id')->limit($limit)->get();

        $collected = Payment::query()
            ->whereBetween('paid_at', [$from, $to])
            ->when($institutionId, fn ($q) => $q->where('institution_id', $institutionId))
            ->whereIn('status', ['succeeded', 'partially_refunded'])
            ->sum(DB::raw('amount - refunded_amount'));

        return [
            'key' => 'revenue',
            'label' => self::REPORTS['revenue']['label'],
            'columns' => ['Invoice #', 'Institution', 'Status', 'Subtotal', 'Discount', 'Tax', 'Total', 'Balance', 'Currency'],
            'rows' => $rows->map(fn (Invoice $inv) => [
                $inv->invoice_number, $inv->institution?->name, $inv->status,
                round((float) $inv->subtotal, 2), round((float) $inv->discount_amount, 2),
                round((float) $inv->tax_amount, 2), round((float) $inv->total, 2),
                round((float) $inv->balance, 2), $inv->currency,
            ])->all(),
            'summary' => [
                'invoices' => $rows->count(),
                'totalBilled' => round((float) $rows->where('status', '!=', 'void')->sum('total'), 2),
                'collectedNet' => round((float) $collected, 2),
            ],
        ];
    }

    private function aiUsageReport(Carbon $from, Carbon $to, ?int $institutionId, int $limit): array
    {
        $rows = DB::table('ai_usage_logs')
            ->leftJoin('institutions', 'institutions.id', '=', 'ai_usage_logs.institution_id')
            ->whereBetween('ai_usage_logs.created_at', [$from, $to])
            ->when($institutionId, fn ($q) => $q->where('ai_usage_logs.institution_id', $institutionId))
            ->groupBy('ai_usage_logs.institution_id', 'institutions.name', 'ai_usage_logs.feature', 'ai_usage_logs.provider', 'ai_usage_logs.model')
            ->selectRaw("institutions.name as institution_name, ai_usage_logs.feature, ai_usage_logs.provider, ai_usage_logs.model, count(*) as calls, sum(case when ai_usage_logs.status = 'success' then 0 else 1 end) as failures, coalesce(sum(ai_usage_logs.prompt_tokens + ai_usage_logs.completion_tokens), 0) as tokens, coalesce(sum(ai_usage_logs.credits_charged), 0) as credits, coalesce(sum(ai_usage_logs.estimated_cost_usd), 0) as cost_usd")
            ->orderByDesc('calls')
            ->limit($limit)
            ->get();

        return [
            'key' => 'ai_usage',
            'label' => self::REPORTS['ai_usage']['label'],
            'columns' => ['Institution', 'Feature', 'Provider', 'Model', 'Calls', 'Failures', 'Tokens', 'Credits', 'Est. USD'],
            'rows' => $rows->map(fn ($r) => [
                $r->institution_name ?? 'Platform', $r->feature, $r->provider, $r->model,
                (int) $r->calls, (int) $r->failures, (int) $r->tokens, round((float) $r->credits, 2), round((float) $r->cost_usd, 4),
            ])->all(),
            'summary' => ['calls' => (int) $rows->sum('calls'), 'creditsCharged' => round((float) $rows->sum('credits'), 2)],
        ];
    }

    private function placementReport(Carbon $from, Carbon $to, ?int $institutionId, int $limit): array
    {
        $institutions = Institution::query()
            ->when($institutionId, fn ($q) => $q->where('id', $institutionId))
            ->orderBy('name')->limit($limit)->get(['id', 'code', 'name']);

        $apps = JobApplication::query()->withoutGlobalScopes()
            ->whereBetween('applied_at', [$from, $to])
            ->when($institutionId, fn ($q) => $q->where('institution_id', $institutionId))
            ->get(['institution_id', 'status', 'offer_ctc_lpa'])
            ->groupBy('institution_id');

        $companies = Company::query()->withoutGlobalScopes()->selectRaw('institution_id, count(*) as total')->groupBy('institution_id')->pluck('total', 'institution_id');

        $rows = $institutions->map(function (Institution $inst) use ($apps, $companies) {
            $group = $apps->get($inst->id, collect());
            $offers = $group->whereIn('status', ['offered', 'accepted']);
            $accepted = $group->where('status', 'accepted');
            $avgCtc = $offers->whereNotNull('offer_ctc_lpa')->avg('offer_ctc_lpa');

            return [
                $inst->code, $inst->name, (int) ($companies[$inst->id] ?? 0),
                $group->count(), $offers->count(), $accepted->count(),
                $avgCtc ? round((float) $avgCtc, 2) : 0,
            ];
        })->all();

        return [
            'key' => 'placement',
            'label' => self::REPORTS['placement']['label'],
            'columns' => ['Code', 'Institution', 'Companies', 'Applications', 'Offers', 'Accepted Placements', 'Avg CTC (LPA)'],
            'rows' => $rows,
            'summary' => ['institutions' => count($rows), 'applications' => $apps->flatten(1)->count()],
        ];
    }

    private function assessmentReport(?int $institutionId, int $limit): array
    {
        $institutions = Institution::query()->when($institutionId, fn ($q) => $q->where('id', $institutionId))->orderBy('name')->limit($limit)->get(['id', 'code', 'name']);
        $exams = Exam::query()->withoutGlobalScopes()->selectRaw('institution_id, count(*) as total')->groupBy('institution_id')->pluck('total', 'institution_id');
        $entries = MarkEntry::query()->withoutGlobalScopes()->selectRaw("institution_id, count(*) as total, sum(case when result = 'PASS' then 1 else 0 end) as passed")->groupBy('institution_id')->get()->keyBy('institution_id');
        $semAvg = SemesterResult::query()->withoutGlobalScopes()->selectRaw('institution_id, avg(percentage) as avg_pct')->groupBy('institution_id')->pluck('avg_pct', 'institution_id');

        $rows = $institutions->map(function (Institution $inst) use ($exams, $entries, $semAvg) {
            $e = $entries->get($inst->id);
            $totalEntries = (int) ($e->total ?? 0);
            $passed = (int) ($e->passed ?? 0);

            return [
                $inst->code, $inst->name, (int) ($exams[$inst->id] ?? 0), $totalEntries,
                $totalEntries > 0 ? round($passed / $totalEntries * 100, 1) : 0,
                round((float) ($semAvg[$inst->id] ?? 0), 1),
            ];
        })->all();

        return [
            'key' => 'assessment',
            'label' => self::REPORTS['assessment']['label'],
            'columns' => ['Code', 'Institution', 'Exams', 'Mark Entries', 'Pass Rate (%)', 'Avg Score (%)'],
            'rows' => $rows,
            'summary' => ['examsTotal' => (int) $exams->sum()],
        ];
    }

    private function resumeReport(?int $institutionId, int $limit): array
    {
        $institutions = Institution::query()->when($institutionId, fn ($q) => $q->where('id', $institutionId))->orderBy('name')->limit($limit)->get(['id', 'code', 'name']);
        $resumes = Resume::query()->withoutGlobalScopes()->selectRaw("institution_id, count(*) as total, sum(case when status = 'parsed' then 1 else 0 end) as parsed, sum(case when status = 'failed' then 1 else 0 end) as failed")->groupBy('institution_id')->get()->keyBy('institution_id');
        $analyses = AiResumeAnalysis::query()->withoutGlobalScopes()->selectRaw('institution_id, count(*) as total, avg(overall_score) as avg_overall, avg(ats_compatibility_score) as avg_ats')->groupBy('institution_id')->get()->keyBy('institution_id');

        $rows = $institutions->map(function (Institution $inst) use ($resumes, $analyses) {
            $r = $resumes->get($inst->id);
            $a = $analyses->get($inst->id);

            return [
                $inst->code, $inst->name, (int) ($r->total ?? 0), (int) ($r->parsed ?? 0), (int) ($r->failed ?? 0),
                (int) ($a->total ?? 0), round((float) ($a->avg_overall ?? 0), 1), round((float) ($a->avg_ats ?? 0), 1),
            ];
        })->all();

        return [
            'key' => 'resume',
            'label' => self::REPORTS['resume']['label'],
            'columns' => ['Code', 'Institution', 'Resumes', 'Parsed', 'Failed', 'AI Analyses', 'Avg Score', 'Avg ATS'],
            'rows' => $rows,
            'summary' => ['totalResumes' => (int) $resumes->sum('total')],
        ];
    }

    private function interviewReport(?int $institutionId, int $limit): array
    {
        $institutions = Institution::query()->when($institutionId, fn ($q) => $q->where('id', $institutionId))->orderBy('name')->limit($limit)->get(['id', 'code', 'name']);
        $sessions = AiInterview::query()->withoutGlobalScopes()->selectRaw("institution_id, count(*) as total, sum(case when status = 'completed' then 1 else 0 end) as completed, sum(case when status = 'failed' then 1 else 0 end) as failed")->groupBy('institution_id')->get()->keyBy('institution_id');
        $evals = DB::table('ai_interview_evaluations')->selectRaw('institution_id, count(*) as total, avg(overall_score) as avg_score')->groupBy('institution_id')->get()->keyBy('institution_id');

        $rows = $institutions->map(function (Institution $inst) use ($sessions, $evals) {
            $s = $sessions->get($inst->id);
            $e = $evals->get($inst->id);

            return [
                $inst->code, $inst->name, (int) ($s->total ?? 0), (int) ($s->completed ?? 0),
                (int) ($s->failed ?? 0), (int) ($e->total ?? 0), round((float) ($e->avg_score ?? 0), 1),
            ];
        })->all();

        return [
            'key' => 'interview',
            'label' => self::REPORTS['interview']['label'],
            'columns' => ['Code', 'Institution', 'Sessions', 'Completed', 'Failed', 'Evaluated', 'Avg Score'],
            'rows' => $rows,
            'summary' => ['totalSessions' => (int) $sessions->sum('total')],
        ];
    }

    private function supportReport(Carbon $from, Carbon $to, ?int $institutionId, ?string $status, int $limit): array
    {
        $rows = SupportTicket::query()->with('institution:id,name')
            ->whereBetween('created_at', [$from, $to])
            ->when($institutionId, fn ($q) => $q->where('institution_id', $institutionId))
            ->when($status, fn ($q) => $q->where('status', $status))
            ->latest('id')->limit($limit)->get();

        return [
            'key' => 'support',
            'label' => self::REPORTS['support']['label'],
            'columns' => ['Ticket #', 'Institution', 'Category', 'Priority', 'Status', 'Subject', 'CSAT', 'Created'],
            'rows' => $rows->map(fn (SupportTicket $t) => [
                $t->ticket_number, $t->institution?->name ?? 'Platform', $t->category, $t->priority,
                $t->status, $t->subject, $t->csat_score, $t->created_at?->toDateString(),
            ])->all(),
            'summary' => ['tickets' => $rows->count(), 'escalated' => $rows->where('status', 'escalated')->count()],
        ];
    }

    private function systemReport(int $limit): array
    {
        $incidents = SystemIncident::query()->latest('id')->limit($limit)->get();
        $backups = BackupRecord::query()->latest('id')->limit(20)->get();

        return [
            'key' => 'system',
            'label' => self::REPORTS['system']['label'],
            'columns' => ['Kind', 'Title / Location', 'Severity / Type', 'Status', 'Verified / Component', 'Timestamp'],
            'rows' => [
                ...$incidents->map(fn (SystemIncident $i) => ['Incident', $i->title, $i->severity, $i->status, $i->component, $i->created_at?->toIso8601String()])->all(),
                ...$backups->map(fn (BackupRecord $b) => ['Backup', $b->storage_location, $b->backup_type, $b->status, $b->verified ? 'Verified' : 'Unverified', $b->created_at?->toIso8601String()])->all(),
            ],
            'summary' => ['openIncidents' => $incidents->where('status', '!=', 'resolved')->count(), 'backupsCount' => $backups->count()],
        ];
    }
}

